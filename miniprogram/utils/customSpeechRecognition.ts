/**
 * customSpeechRecognition.ts
 * 
 * Custom implementation for Alibaba Cloud speech recognition
 */

import { ALI_CLOUD_SECRETS } from './secrets';
import { getToken, generateUUID } from './aliCloudAuth';

// Define non-sensitive constants here or import if exported elsewhere
const WSS_URL = 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1';

// Type definitions for events
type EventHandler = (msg: string | ArrayBuffer) => void;

// Class implementing event emission
class EventEmitter {
    private events: Record<string, EventHandler[]>;

    constructor() {
        this.events = {};
    }

    on(event: string, handler: EventHandler): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(handler);
    }

    off(event: string): void {
        this.events[event] = [];
    }

    emit(event: string, msg: string | ArrayBuffer): void {
        const handlers = this.events[event] || [];
        handlers.forEach(function (handler) {
            try {
                handler(msg);
            } catch (error) {
                console.error('Error in ' + event + ' event handler:', error);
            }
        });
    }
}

// WebSocket client implementation
class NlsClient {
    private ws: WechatMiniprogram.SocketTask | null;
    private config: {
        url: string;
        appkey: string;
        token: string;
    };
    private onMessageCallback: ((message: string | ArrayBuffer, isBinary: boolean) => void) | null;
    private onCloseCallback: (() => void) | null;

    constructor(config: { url: string; appkey: string; token: string }) {
        this.ws = null;
        this.config = config;
        this.onMessageCallback = null;
        this.onCloseCallback = null;
    }

    // Generate UUID, accepting the format parameter
    uuid(format?: boolean): string {
        return generateUUID(format);
    }

    // Default context for NLS requests
    defaultContext(): Record<string, string> {
        return {
            device_id: "wechat_miniprogram"
        };
    }

    // Start WebSocket connection
    async start(
        onMessage: (message: string | ArrayBuffer, isBinary: boolean) => void,
        onClose: () => void
    ): Promise<void> {
        // Store callbacks
        this.onMessageCallback = onMessage;
        this.onCloseCallback = onClose;

        return new Promise<void>((resolve, reject) => {
            try {
                // Use the WebSocket URL directly from config
                let wsUrl = this.config.url; // Already contains WSS_URL passed from RealtimeSpeechRecognition

                // Add token param if needed
                if (!wsUrl.includes('?')) {
                    wsUrl = wsUrl + '?token=' + this.config.token;
                }

                console.log("Connecting to WebSocket:", wsUrl);

                // Open WebSocket connection
                this.ws = wx.connectSocket({
                    url: wsUrl,
                    success: () => {
                        console.log('WebSocket connection established');
                    },
                    fail: (error) => {
                        console.error('WebSocket connection failed:', error);
                        reject(error);
                    }
                });

                if (this.ws) {
                    // Setup event handlers
                    this.ws.onOpen(() => {
                        console.log('WebSocket connection opened');
                        resolve();
                    });

                    this.ws.onMessage((res) => {
                        if (this.onMessageCallback) {
                            const isBinary = typeof res.data !== 'string';
                            this.onMessageCallback(res.data, isBinary);
                        }
                    });

                    this.ws.onClose(() => {
                        console.log('WebSocket connection closed');
                        if (this.onCloseCallback) {
                            this.onCloseCallback();
                        }
                        this.ws = null;
                    });

                    this.ws.onError((error) => {
                        console.error('WebSocket error:', error);
                        reject(error);
                    });
                } else {
                    reject(new Error('Failed to create WebSocket connection'));
                }
            } catch (error) {
                console.error('Error starting NLS client:', error);
                reject(error);
            }
        });
    }

    // Send data to WebSocket
    send(data: string | ArrayBuffer, isBinary: boolean): void {
        if (!this.ws) {
            console.error('WebSocket not connected');
            return;
        }

        this.ws.send({
            data: data,
            success: () => {
                // Data sent successfully
            },
            fail: (error) => {
                console.error('WebSocket send failed:', error);
            }
        });
    }

    // Close the WebSocket connection
    shutdown(): void {
        if (this.ws) {
            this.ws.close({
                success: () => {
                    console.log('WebSocket closed successfully');
                },
                fail: (error) => {
                    console.error('WebSocket close failed:', error);
                }
            });
            this.ws = null;
        }
    }
}

// Main Speech Recognition class
class CustomSpeechRecognition {
    private event: EventEmitter;
    private config: {
        url: string;
        appkey: string;
        token: string;
    };
    private client: NlsClient | null;
    private taskId: string | null;

    constructor(config: { url: string; appkey: string; token: string }) {
        this.event = new EventEmitter();
        this.config = config;
        this.client = null;
        this.taskId = null;
    }

    // Default parameters for speech recognition
    defaultStartParams(): Record<string, any> {
        return {
            format: "pcm",
            sample_rate: 16000,
            enable_intermediate_result: true,
            enable_punctuation_prediction: true,
            enable_inverse_text_normalization: true,
            enable_voice_detection: true,
            max_end_silence: 2000,
        };
    }

    // Register event handler
    on(eventName: string, handler: EventHandler): void {
        this.event.off(eventName);
        this.event.on(eventName, handler);
    }

    // Start speech recognition
    async start(params: Record<string, any>): Promise<string> {
        try {
            this.client = new NlsClient(this.config);

            // Generate Task ID without hyphens
            this.taskId = this.client.uuid(true);

            const req = {
                header: {
                    // Generate Message ID without hyphens
                    message_id: this.client.uuid(true),
                    task_id: this.taskId,
                    namespace: "SpeechRecognizer",
                    name: "StartRecognition",
                    appkey: this.config.appkey
                },
                payload: params,
                context: this.client.defaultContext()
            };

            return new Promise<string>((resolve, reject) => {
                if (!this.client) {
                    reject(new Error("Client is null"));
                    return;
                }

                const client = this.client; // Local reference to avoid null issues

                client.start(
                    // onMessage handler
                    (msg, isBinary) => {
                        if (!isBinary && typeof msg === 'string') {
                            // Log the raw message received from WebSocket
                            console.log("[WebSocket MSG Received]:", msg.substring(0, 200) + (msg.length > 200 ? "..." : ""));

                            try {
                                const msgObj = JSON.parse(msg);

                                // Log the parsed header name
                                if (msgObj.header && msgObj.header.name) {
                                    console.log("[WebSocket Parsed Header Name]:", msgObj.header.name);
                                } else {
                                    console.log("[WebSocket Parsed]: No header name found.");
                                }

                                if (msgObj.header.name === "RecognitionStarted") {
                                    this.event.emit("started", msg);
                                    resolve(msg);
                                } else if (msgObj.header.name === "RecognitionResultChanged") {
                                    // Log before emitting 'changed'
                                    console.log("[WebSocket Emitting]: 'changed' event");
                                    this.event.emit("changed", msg);
                                } else if (msgObj.header.name === "RecognitionCompleted") {
                                    // Log before emitting 'RecognitionCompleted'
                                    console.log("[WebSocket Emitting]: 'RecognitionCompleted' event");
                                    this.event.emit("RecognitionCompleted", msg);
                                } else if (msgObj.header.name === "TaskFailed") {
                                    // Log before emitting 'TaskFailed'
                                    console.log("[WebSocket Emitting]: 'TaskFailed' event");
                                    if (this.client) {
                                        this.client.shutdown();
                                        this.client = null;
                                    }
                                    this.event.emit("TaskFailed", msg);
                                    this.event.emit("failed", msg);
                                } else {
                                    // Log if an unknown message type is received
                                    console.warn("[WebSocket Unknown MSG Type]: Header name:", msgObj.header.name);
                                }
                            } catch (error) {
                                console.error('[WebSocket Error] Error parsing WebSocket message:', error, msg);
                            }
                        } else if (isBinary) {
                            // Log if binary data is received (should not happen in normal flow)
                            if (msg instanceof ArrayBuffer) {
                                console.log("[WebSocket Received]: Binary data of length", msg.byteLength);
                            } else {
                                console.log("[WebSocket Received]: Non-ArrayBuffer binary data");
                            }
                        }
                    },
                    // onClose handler
                    () => {
                        this.event.emit("closed", "Connection closed");
                    }
                ).then(() => {
                    // Send the start recognition request after connection is established
                    if (client) {
                        client.send(JSON.stringify(req), false);
                    }
                }).catch(error => {
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Error in start method:', error);
            throw error;
        }
    }

    // Stop speech recognition
    async close(param: Record<string, any> = {}): Promise<string> {
        if (!this.client) {
            return Promise.reject(new Error("Client is not initialized"));
        }

        const parameters = param || {};

        const client = this.client; // Create a local reference to the client
        const taskId = this.taskId;

        const req = {
            header: {
                // Generate Message ID without hyphens
                message_id: client.uuid(true),
                task_id: taskId, // Use the existing task ID
                namespace: "SpeechRecognizer",
                name: "StopRecognition",
                appkey: this.config.appkey
            },
            payload: parameters,
            context: client.defaultContext()
        };

        return new Promise<string>((resolve, reject) => {
            this.event.off("RecognitionCompleted");
            this.event.on("RecognitionCompleted", (msg) => {
                if (this.client) {
                    this.client.shutdown();
                    this.client = null;
                }
                this.event.emit("completed", msg);
                var msgString = typeof msg === 'string' ? msg : String(msg);
                resolve(msgString);
            });

            this.event.off("TaskFailed");
            this.event.on("TaskFailed", (msg) => {
                var msgString = typeof msg === 'string' ? msg : String(msg);
                reject(new Error(msgString));
            });

            client.send(JSON.stringify(req), false);
        });
    }

    // Shutdown the client
    shutdown(): void {
        if (this.client) {
            this.client.shutdown();
            this.client = null;
        }
    }

    // Send audio data
    sendAudio(data: ArrayBuffer): boolean {
        if (!this.client) {
            return false;
        }

        this.client.send(data, true);
        return true;
    }
}

// Class for real-time speech recognition
class RealtimeSpeechRecognition {
    private speechRecognizer: CustomSpeechRecognition | null;
    private isRecognizing: boolean;
    private onResultCallback: ((text: string, isFinal: boolean) => void) | null;
    private onErrorCallback: ((error: any) => void) | null;
    private recorderManager: WechatMiniprogram.RecorderManager;

    constructor() {
        this.speechRecognizer = null;
        this.isRecognizing = false;
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.recorderManager = wx.getRecorderManager();
        this.setupRecorderManager();
    }

    private setupRecorderManager(): void {
        this.recorderManager.onFrameRecorded((res) => {
            // Add checks for res and res.frameBuffer
            if (!res || !res.frameBuffer) {
                console.warn("[Recorder] onFrameRecorded received invalid data");
                return;
            }
            // Add log to check if this callback is firing
            console.log("[Recorder] onFrameRecorded triggered. Frame size:", res.frameBuffer.byteLength);

            // Double-check if still recognizing before sending
            if (this.isRecognizing && this.speechRecognizer) {
                this.speechRecognizer.sendAudio(res.frameBuffer);
            }
        });

        this.recorderManager.onStop(() => {
            if (this.isRecognizing && this.speechRecognizer) {
                this.stop();
            }
        });

        this.recorderManager.onError((error) => {
            console.error('[Recorder] onError triggered:', error);
            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }
            // Optionally reset state on recorder error
            // this.reset(); 
        });
    }

    public onResult(callback: (text: string, isFinal: boolean) => void): void {
        this.onResultCallback = callback;
    }

    public onError(callback: (error: any) => void): void {
        this.onErrorCallback = callback;
    }

    public async start(): Promise<void> {
        if (this.isRecognizing) {
            return;
        }

        try {
            console.log("Starting speech recognition...");
            const token = await getToken();
            console.log("Token obtained:", token.substring(0, 10) + "...");

            // Configure with imported secrets and defined constants
            this.speechRecognizer = new CustomSpeechRecognition({
                url: WSS_URL, // Use the WSS_URL defined in this file
                appkey: ALI_CLOUD_SECRETS.APPKEY, // Use APPKEY directly from imported secrets
                token: token
            });

            console.log("Speech recognizer created with config:", {
                url: WSS_URL,
                appkey: ALI_CLOUD_SECRETS.APPKEY,
                tokenPrefix: token.substring(0, 5) + "..."
            });

            // Set up event handlers
            this.speechRecognizer.on('started', (msg) => {
                console.log('Speech recognition started:', typeof msg === 'string' ? msg.substring(0, 100) + "..." : "[Binary data]");
            });

            this.speechRecognizer.on('changed', (msg) => {
                if (typeof msg !== 'string') return;
                try {
                    const result = JSON.parse(msg);
                    const resultText = result.payload && result.payload.result ? result.payload.result : "No result";
                    console.log("Received 'changed' event:", resultText);
                    if (result.payload && result.payload.result) {
                        if (this.onResultCallback) {
                            this.onResultCallback(result.payload.result, false);
                        }
                    }
                } catch (error) {
                    console.error('Error parsing changed event:', error, msg);
                }
            });

            this.speechRecognizer.on('completed', (msg) => {
                if (typeof msg !== 'string') return;
                try {
                    const result = JSON.parse(msg);
                    const resultText = result.payload && result.payload.result ? result.payload.result : "No result";
                    console.log("Received 'completed' event:", resultText);
                    if (result.payload && result.payload.result) {
                        if (this.onResultCallback) {
                            this.onResultCallback(result.payload.result, true);
                        }
                    }
                } catch (error) {
                    console.error('Error parsing completed event:', error, msg);
                }
            });

            this.speechRecognizer.on('failed', (msg) => {
                // Comment out the verbose log as index.ts handles the UI aspect
                // console.error('Speech recognition failed:', msg); 
                if (this.onErrorCallback) {
                    this.onErrorCallback(msg);
                }
                this.isRecognizing = false;
            });

            // Start speech recognition
            const params = this.speechRecognizer.defaultStartParams();
            console.log("Starting speech recognition with params:", params);
            await this.speechRecognizer.start(params);
            this.isRecognizing = true;
            console.log("Speech recognition started successfully");

            // Start recording
            const recorderOptions: WechatMiniprogram.RecorderManagerStartOption = {
                duration: 60000, // Max duration 60s
                sampleRate: 16000,
                numberOfChannels: 1,
                encodeBitRate: 32000, // Updated encodeBitRate to be within the valid range (24000-96000)
                format: 'PCM', // No type assertion, just use the literal directly
                frameSize: 0.5 // 0.5KB per frame
            };
            console.log("Starting recorder with options:", recorderOptions);
            this.recorderManager.start(recorderOptions);
            console.log("Recorder started");

        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRecognizing) {
            return;
        }

        // Stop the recorder manager FIRST to prevent further onFrameRecorded events
        try {
            this.recorderManager.stop();
            console.log("[Recorder] Recorder manager stopped in stop() method.");
        } catch (e) {
            console.error("[Recorder] Error stopping recorder manager:", e);
        }

        // Now, stop the speech recognizer
        if (this.speechRecognizer) {
            try {
                await this.speechRecognizer.close({});
                console.log("[SpeechRecognizer] Closed successfully.");
            } catch (error) {
                // Comment out this log as the error is expected and handled by index.ts onError
                // console.error('Error closing speech recognizer during stop:', error);
            } finally {
                this.speechRecognizer = null;
                this.isRecognizing = false;
                console.log("[State] Recognition stopped and state reset.");
            }
        } else {
            // If speechRecognizer is already null, ensure isRecognizing is false
            this.isRecognizing = false;
            console.log("[State] Speech recognizer was already null, ensuring state is stopped.");
        }
    }

    /**
     * Reset and recover from errors
     */
    public reset(): void {
        console.log("Resetting speech recognition...");

        // Stop any ongoing recognition
        if (this.isRecognizing) {
            try {
                // Stop recorder
                this.recorderManager.stop();
                console.log("Recorder stopped during reset");

                // Clean up speech recognizer
                if (this.speechRecognizer) {
                    this.speechRecognizer.shutdown();
                    this.speechRecognizer = null;
                    console.log("Speech recognizer shut down during reset");
                }
            } catch (error) {
                console.error("Error during reset:", error);
            }
        }

        // Reset state
        this.isRecognizing = false;

        // Notify callback if available
        if (this.onErrorCallback) {
            this.onErrorCallback({
                message: "Speech recognition reset",
                code: "RESET"
            });
        }

        console.log("Speech recognition reset complete");
    }
}

export default RealtimeSpeechRecognition; 