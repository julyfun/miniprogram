import { DASHSCOPE_SECRETS } from './secrets';

// InnerAudioContext for playback
let innerAudioContext: WechatMiniprogram.InnerAudioContext | null = null;

// WebSocket connection
let ws: WechatMiniprogram.SocketTask | null = null;
let taskId: string = '';
let taskStarted: boolean = false;
let audioData: Uint8Array | null = null;
let tempFilePath: string = '';
// Connection timeout timer
let connectionTimeout: number | null = null;
// Connection state
let isConnecting = false;

/**
 * Synthesizes speech from text using DashScope CosyVoice TTS service and plays it.
 * @param text The text to synthesize.
 * @param voice The voice model to use.
 * @param format The audio format (e.g., 'mp3').
 * @param sampleRate The audio sample rate.
 * @param onEnded Callback function when playback finishes.
 * @param onError Callback function for errors during synthesis or playback.
 */
export async function synthesizeAndPlay(
    text: string,
    voice: string = 'longxiaochun',
    format: string = 'mp3',
    sampleRate: number = 22050,
    onEnded?: () => void,
    onError?: (error: any) => void
): Promise<void> {
    console.log('[CosyVoice] Starting synthesis for:', text);
    stopPlayback(); // Stop any previous playback or WebSocket connection

    audioData = null; // Reset audio data collection
    taskId = generateUUID();
    taskStarted = false;
    isConnecting = true;

    // Create a temporary file path for the final audio
    const fs = wx.getFileSystemManager();
    tempFilePath = `${wx.env.USER_DATA_PATH}/cosyvoice_${Date.now()}.${format}`;

    try {
        // Set a connection timeout timer (10 seconds)
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
        }

        connectionTimeout = setTimeout(() => {
            if (isConnecting && ws) {
                console.error('[CosyVoice] WebSocket connection timeout');
                ws.close({
                    success: () => console.log('[CosyVoice] Timed out connection closed'),
                    fail: () => console.error('[CosyVoice] Failed to close timed out connection')
                });
                ws = null;
                isConnecting = false;

                if (onError) onError({ errMsg: "WebSocket connection timeout" });
            }
        }, 10000);

        // Establish WebSocket connection
        ws = wx.connectSocket({
            url: DASHSCOPE_SECRETS.ASR_URL,
            header: {
                'Authorization': `bearer ${DASHSCOPE_SECRETS.API_KEY}`,
                'X-DashScope-DataInspection': 'enable'
            },
            success: () => {
                console.log('[CosyVoice] WebSocket connection request sent successfully');
            },
            fail: (err) => {
                console.error('[CosyVoice] WebSocket connection failed:', err);
                isConnecting = false;
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }
                if (onError) onError(err);
            }
        });

        // Handle WebSocket events
        ws.onOpen(() => {
            console.log('[CosyVoice] WebSocket connection opened');
            isConnecting = false;

            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }

            // Send run-task message
            const runTaskMessage = JSON.stringify({
                header: {
                    action: 'run-task',
                    task_id: taskId,
                    streaming: 'duplex'
                },
                payload: {
                    task_group: 'audio',
                    task: 'tts',
                    function: 'SpeechSynthesizer',
                    model: 'cosyvoice-v1',
                    parameters: {
                        text_type: 'PlainText',
                        voice: voice,
                        format: format,
                        sample_rate: sampleRate,
                        volume: 50,
                        rate: 1,
                        pitch: 1
                    },
                    input: {}
                }
            });

            if (ws) {
                ws.send({
                    data: runTaskMessage,
                    success: () => {
                        console.log('[CosyVoice] Sent run-task message');
                    },
                    fail: (err) => {
                        console.error('[CosyVoice] Failed to send run-task message:', err);
                        if (onError) onError(err);
                    }
                });
            }
        });

        ws.onMessage((res) => {
            handleWebSocketMessage(res, text, onEnded, onError);
        });

        ws.onError((err) => {
            console.error('[CosyVoice] WebSocket error:', err);
            isConnecting = false;
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }

            if (onError) onError(err);
        });

        ws.onClose(() => {
            console.log('[CosyVoice] WebSocket connection closed');
            isConnecting = false;
            ws = null;

            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
        });

    } catch (error) {
        console.error('[CosyVoice] Error initializing TTS:', error);
        isConnecting = false;
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
        }
        if (onError) onError(error);
    }
}

/**
 * Concatenates two Uint8Arrays into a new one
 */
function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
}

/**
 * Sends a continue-task message with the text to synthesize
 */
function sendContinueTask(text: string, onError?: (error: any) => void): void {
    if (!ws || !taskId) {
        console.error('[CosyVoice] WebSocket connection not established or taskId not available');
        if (onError) onError('WebSocket connection not established or taskId not available');
        return;
    }

    const continueTaskMessage = JSON.stringify({
        header: {
            action: 'continue-task',
            task_id: taskId,
            streaming: 'duplex'
        },
        payload: {
            input: {
                text: text
            }
        }
    });

    if (ws) {
        ws.send({
            data: continueTaskMessage,
            success: () => {
                console.log('[CosyVoice] Sent continue-task message');
                // Send finish-task message after a delay to ensure all text is processed
                setTimeout(() => {
                    if (ws) sendFinishTask(onError);
                }, 500);
            },
            fail: (err) => {
                console.error('[CosyVoice] Failed to send continue-task message:', err);
                if (onError) onError(err);
            }
        });
    }
}

/**
 * Sends a finish-task message to complete the synthesis request
 */
function sendFinishTask(onError?: (error: any) => void): void {
    if (!ws || !taskId) {
        console.error('[CosyVoice] WebSocket connection not established or taskId not available');
        if (onError) onError('WebSocket connection not established or taskId not available');
        return;
    }

    const finishTaskMessage = JSON.stringify({
        header: {
            action: 'finish-task',
            task_id: taskId
        }
    });

    if (ws) {
        ws.send({
            data: finishTaskMessage,
            success: () => {
                console.log('[CosyVoice] Sent finish-task message');
            },
            fail: (err) => {
                console.error('[CosyVoice] Failed to send finish-task message:', err);
                if (onError) onError(err);
            }
        });
    }
}

/**
 * Writes collected audio data to a file and plays it
 */
function writeAndPlayAudio(onEnded?: () => void, onError?: (error: any) => void): void {
    if (!audioData) {
        console.error('[CosyVoice] No audio data received');
        if (onError) onError({ message: 'No audio data received' });
        return;
    }

    // Write data to file
    const fs = wx.getFileSystemManager();
    fs.writeFile({
        filePath: tempFilePath,
        data: audioData.buffer as ArrayBuffer,
        encoding: 'binary',
        success: () => {
            console.log('[CosyVoice] Audio data written to file:', tempFilePath);
            playAudioFile(tempFilePath, onEnded, onError);
        },
        fail: (err) => {
            console.error('[CosyVoice] Failed to write audio file:', err);
            if (onError) onError(err);
        }
    });
}

/**
 * Plays audio from a file path
 */
function playAudioFile(filePath: string, onEnded?: () => void, onError?: (error: any) => void): void {
    innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = filePath;
    innerAudioContext.autoplay = true;

    innerAudioContext.onEnded(() => {
        console.log('[CosyVoice] Playback finished');
        if (onEnded) onEnded();
        stopPlayback();
    });

    innerAudioContext.onError((err) => {
        console.error('[CosyVoice] Playback error:', err);
        if (onError) onError(err);
        stopPlayback();
    });

    console.log('[CosyVoice] Starting playback');
}

/**
 * Stops the current TTS playback and cancels any ongoing WebSocket connection.
 */
export function stopPlayback(): void {
    isConnecting = false;

    // Clear timeout if set
    if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
    }

    // Close WebSocket connection if open
    if (ws) {
        ws.close({
            success: () => console.log('[CosyVoice] WebSocket connection closed'),
            fail: (err) => console.error('[CosyVoice] Failed to close WebSocket:', err)
        });
        ws = null;
    }

    // Stop and destroy audio context if playing
    if (innerAudioContext) {
        innerAudioContext.stop();
        innerAudioContext.destroy();
        innerAudioContext = null;
    }

    // Reset state variables
    taskStarted = false;
    audioData = null;
}

/**
 * Generates a UUID v4 for task identification
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Handles WebSocket messages, both text and binary
 */
function handleWebSocketMessage(
    event: { data: string | ArrayBuffer },
    text: string,
    onEnded?: () => void,
    onError?: (error: any) => void
): void {
    try {
        if (typeof event.data === 'string') {
            // Handle string message (typically JSON control messages)
            const data = JSON.parse(event.data);
            console.log('[CosyVoice] Received WebSocket message:', data.header?.status);

            if (data.header && data.header.status === 'message') {
                console.log('[CosyVoice] Received message:', data.payload.message);

                if (data.payload.message === 'task-started') {
                    console.log('[CosyVoice] Task started with ID:', data.header.task_id);
                    taskStarted = true;
                    // Send the continue-task message with the actual text
                    if (ws) sendContinueTask(text, onError);
                } else if (data.payload.message === 'task-finished') {
                    console.log('[CosyVoice] Task finished');
                    // Write audio data to file and play it
                    if (audioData) {
                        if (ws) writeAndPlayAudio(onEnded, onError);
                    }
                } else if (data.payload.message === 'task-failed') {
                    console.error('[CosyVoice] Task failed:', data.payload.failure);
                    if (onError) onError(data.payload.failure);
                }
            }
        } else {
            // Handle binary message (audio data)
            // Convert binary data to Uint8Array and append to audioData
            const uint8Array = new Uint8Array(event.data as ArrayBuffer);
            audioData = audioData ? concatUint8Arrays(audioData, uint8Array) : uint8Array;
        }
    } catch (error) {
        console.error('[CosyVoice] Error handling WebSocket message:', error);
        if (onError) onError(error);
    }
} 