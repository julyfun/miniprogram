import { DASHSCOPE_SECRETS } from './secrets';
import { generateUUID } from './aliCloudAuth'; // Reuse UUID generator

// Type definitions for callbacks
type ResultCallback = (text: string, isFinal: boolean) => void;
type ErrorCallback = (error: any) => void;

class DashScopeSpeechRecognition {
    // Declare properties without initial values
    private ws: WechatMiniprogram.SocketTask | null;
    private recorderManager: WechatMiniprogram.RecorderManager;
    private isRecognizing: boolean;
    private taskStarted: boolean;
    private taskId: string;
    private onResultCallback: ResultCallback | null;
    private onErrorCallback: ErrorCallback | null;

    constructor() {
        // Initialize properties in the constructor
        this.ws = null;
        this.isRecognizing = false;
        this.taskStarted = false;
        this.taskId = '';
        this.onResultCallback = null;
        this.onErrorCallback = null;

        this.recorderManager = wx.getRecorderManager();
        this.setupRecorderManager();
    }

    private setupRecorderManager(): void {
        this.recorderManager.onFrameRecorded((res) => {
            if (!this.isRecognizing || !this.taskStarted || !this.ws) return;
            if (res && res.frameBuffer) {
                console.log('[DashScope ASR] Sending audio frame:', res.frameBuffer.byteLength);
                this.ws.send({ data: res.frameBuffer });
            } else {
                console.warn('[DashScope ASR] Invalid audio frame received from recorder.');
            }
        });

        this.recorderManager.onError((error) => {
            console.error('[DashScope ASR] Recorder error:', error);
            this.handleError(error);
        });

        // No automatic stop handling here, controlled by stop()
    }

    // --- Public API --- 

    public onResult(callback: ResultCallback): void {
        this.onResultCallback = callback;
    }

    public onError(callback: ErrorCallback): void {
        this.onErrorCallback = callback;
    }

    public async start(): Promise<void> {
        if (this.isRecognizing) {
            console.warn('[DashScope ASR] Recognition already in progress.');
            return;
        }
        console.log('[DashScope ASR] Starting recognition...');
        this.isRecognizing = true;
        this.taskStarted = false;
        this.taskId = generateUUID().replace(/-/g, ''); // Generate new Task ID

        try {
            this.ws = wx.connectSocket({
                url: DASHSCOPE_SECRETS.ASR_URL,
                header: {
                    Authorization: `Bearer ${DASHSCOPE_SECRETS.API_KEY}`,
                    // 'X-DashScope-DataInspection': 'enable' // Optional: Enable data inspection if needed
                },
                protocols: [], // Ensure protocols is an empty array or omitted
                success: () => {
                    console.log('[DashScope ASR] WebSocket connecting...');
                },
                fail: (err) => {
                    console.error('[DashScope ASR] WebSocket connection failed:', err);
                    this.handleError({ message: 'WebSocket connection failed', details: err });
                }
            });

            this.setupWebSocketListeners();

        } catch (error) {
            console.error('[DashScope ASR] Error starting WebSocket:', error);
            this.handleError({ message: 'Error starting WebSocket', details: error });
        }
    }

    public async stop(): Promise<void> {
        console.log('[DashScope ASR] Stopping recognition...');
        if (!this.isRecognizing) {
            console.log('[DashScope ASR] Not recognizing, stop ignored.');
            return;
        }

        // 1. Stop the recorder first
        try {
            this.recorderManager.stop();
            console.log('[DashScope ASR] Recorder stopped.');
        } catch (e) {
            console.error("[DashScope ASR] Error stopping recorder:", e);
        }

        // 2. Send finish-task message if task started
        if (this.ws && this.taskStarted) {
            const finishTaskMessage = {
                header: {
                    action: 'finish-task',
                    task_id: this.taskId,
                    streaming: 'duplex'
                },
                payload: {
                    input: {}
                }
            };
            console.log('[DashScope ASR] Sending finish-task...');
            this.ws.send({ data: JSON.stringify(finishTaskMessage) });
            // Don't close WS immediately, wait for task-finished or timeout
        } else if (this.ws) {
            // If task never started, just close the socket
            console.log('[DashScope ASR] Task never started, closing WebSocket.');
            this.ws.close({});
        }

        this.isRecognizing = false;
        // Reset taskStarted flag, it will be set true on 'task-started' event
        // this.taskStarted = false; // Let onError/onClose handle final state reset
    }

    public reset(): void { // Simple reset, just ensures clean state
        console.log('[DashScope ASR] Resetting state...');
        this.stop(); // Attempt to stop cleanly
        this.isRecognizing = false;
        this.taskStarted = false;
        this.taskId = '';
        if (this.ws) {
            this.ws.close({});
            this.ws = null;
        }
        // Notify UI about reset
        if (this.onErrorCallback) {
            this.onErrorCallback({ code: 'RESET', message: 'DashScope ASR Reset' });
        }
    }

    // --- Private Methods --- 

    private setupWebSocketListeners(): void {
        if (!this.ws) return;

        this.ws.onOpen(() => {
            console.log('[DashScope ASR] WebSocket connection opened.');
            this.sendRunTask();
        });

        this.ws.onMessage((event) => {
            try {
                const message = JSON.parse(event.data as string);
                // console.log('[DashScope ASR] Received message:', JSON.stringify(message));

                if (!message.header) {
                    console.warn('[DashScope ASR] Received message without header:', message);
                    return;
                }

                switch (message.header.event) {
                    case 'task-started':
                        console.log('[DashScope ASR] Task started.');
                        this.taskStarted = true;
                        this.startRecorder(); // Start recorder only after task confirmation
                        break;
                    case 'result-generated':
                        let text = '';
                        if (message.payload &&
                            message.payload.output &&
                            message.payload.output.sentence &&
                            message.payload.output.sentence.text) {
                            text = message.payload.output.sentence.text;
                        }

                        // Check for finality (adjust field if needed based on actual API response)
                        // Replace optional chaining for isFinal check too
                        let isFinal = false;
                        if (message.payload &&
                            message.payload.output &&
                            message.payload.output.sentence &&
                            message.payload.output.sentence.end_time !== undefined) {
                            isFinal = true;
                        }

                        console.log(`[DashScope ASR] Result: "${text}", Final: ${isFinal}`);
                        if (this.onResultCallback && text) {
                            this.onResultCallback(text, isFinal);
                        }
                        break;
                    case 'task-finished':
                        console.log('[DashScope ASR] Task finished.');
                        this.cleanupWebSocket();
                        break;
                    case 'task-failed':
                        console.error('[DashScope ASR] Task failed:', message.header.status_code, message.header.error_message);
                        this.handleError({
                            message: `Task Failed (${message.header.status_code})`,
                            details: message.header.error_message
                        });
                        this.cleanupWebSocket();
                        break;
                    default:
                        console.log('[DashScope ASR] Unknown event:', message.header.event);
                }
            } catch (e) {
                console.error('[DashScope ASR] Error parsing WebSocket message:', e, event.data);
            }
        });

        this.ws.onError((error) => {
            console.error('[DashScope ASR] WebSocket error:', error);
            // Check if it's a close error that onClose will handle
            if (!this.ws) return; // Already cleaned up
            this.handleError({ message: 'WebSocket error', details: error });
            this.cleanupWebSocket(); // Clean up on error too
        });

        this.ws.onClose((res) => {
            console.log(`[DashScope ASR] WebSocket closed. Code: ${res.code}, Reason: ${res.reason}`);
            // Only handle as error if it wasn't a clean close initiated by task-finished
            if (this.isRecognizing && this.taskStarted) {
                console.warn('[DashScope ASR] WebSocket closed unexpectedly.');
                // Optional: trigger error callback if needed for unexpected close
                // this.handleError({ message: 'WebSocket closed unexpectedly', details: res });
            }
            this.cleanupWebSocket(); // Ensure cleanup
        });
    }

    private sendRunTask(): void {
        if (!this.ws) return;

        const runTaskMessage = {
            header: {
                action: 'run-task',
                task_id: this.taskId,
                streaming: 'duplex'
            },
            payload: {
                task_group: 'audio',
                task: 'asr',
                function: 'recognition',
                model: 'paraformer-realtime-v2', // Using the model from rec.md
                parameters: {
                    sample_rate: 16000,
                    format: 'pcm' // Send raw PCM data
                },
                input: {}
            }
        };
        console.log('[DashScope ASR] Sending run-task...');
        this.ws.send({ data: JSON.stringify(runTaskMessage) });
    }

    private startRecorder(): void {
        console.log('[DashScope ASR] Starting recorder...');
        try {
            this.recorderManager.start({
                sampleRate: 16000,
                numberOfChannels: 1,
                format: 'PCM', // Ensure format matches parameter
                frameSize: 10 // Send smaller chunks more frequently (adjust as needed)
            });
        } catch (e) {
            console.error("[DashScope ASR] Failed to start recorder:", e);
            this.handleError({ message: 'Failed to start recorder', details: e });
            this.stop(); // Attempt to stop the process if recorder fails
        }
    }

    private handleError(error: any): void {
        this.isRecognizing = false;
        this.taskStarted = false;
        if (this.onErrorCallback) {
            this.onErrorCallback(error);
        }
        this.cleanupWebSocket(); // Clean up on error
    }

    private cleanupWebSocket(): void {
        console.log('[DashScope ASR] Cleaning up WebSocket connection...');
        if (this.ws) {
            // No reliable way to remove specific listeners in wx.SocketTask, rely on closing.
            // const wsRef = this.ws; // Keep ref for potential async operations
            this.ws.close({});
            this.ws = null;
        }
        this.isRecognizing = false;
        this.taskStarted = false;
        // Don't reset taskId here, might be useful for logs
    }
}

export default DashScopeSpeechRecognition; 