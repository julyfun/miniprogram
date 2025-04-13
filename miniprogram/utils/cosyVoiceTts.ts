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

            console.log('[CosyVoice] Request payload:', {
                voice,
                format,
                sample_rate: sampleRate,
                task_id: taskId
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

    console.log('[CosyVoice] Continue task payload:', {
        task_id: taskId,
        text: text
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
            task_id: taskId,
            streaming: 'duplex'
        },
        payload: {
            input: {}
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
    if (!audioData || audioData.length === 0) {
        console.error('[CosyVoice] No audio data received or empty audio data');
        if (onError) onError({ message: 'No audio data received or empty audio data' });
        return;
    }

    console.log('[CosyVoice] Processing audio data of size:', audioData.length);

    // Write data to file
    const fs = wx.getFileSystemManager();
    try {
        fs.writeFile({
            filePath: tempFilePath,
            data: audioData.buffer as ArrayBuffer,
            encoding: 'binary',
            success: () => {
                console.log('[CosyVoice] Audio data written to file:', tempFilePath);

                // 检查文件是否真的写入成功且有内容
                try {
                    const stats = fs.statSync(tempFilePath);
                    console.log('[CosyVoice] File size:', stats.size);

                    if (stats.size > 0) {
                        playAudioFile(tempFilePath, onEnded, onError);
                    } else {
                        console.error('[CosyVoice] Audio file is empty');
                        if (onError) onError({ message: 'Audio file is empty' });
                    }
                } catch (statError) {
                    console.error('[CosyVoice] Error checking file stats:', statError);
                    if (onError) onError(statError);
                }
            },
            fail: (err) => {
                console.error('[CosyVoice] Failed to write audio file:', err);
                if (onError) onError(err);
            }
        });
    } catch (writeError) {
        console.error('[CosyVoice] Exception while writing file:', writeError);
        if (onError) onError(writeError);
    }
}

/**
 * Plays audio from a file path
 */
function playAudioFile(filePath: string, onEnded?: () => void, onError?: (error: any) => void): void {
    try {
        console.log('[CosyVoice] Creating audio context for:', filePath);
        innerAudioContext = wx.createInnerAudioContext();

        // 添加所有可能的事件监听
        innerAudioContext.onCanplay(() => {
            console.log('[CosyVoice] Audio is ready to play');
        });

        innerAudioContext.onPlay(() => {
            console.log('[CosyVoice] Audio playback started');
        });

        innerAudioContext.onWaiting(() => {
            console.log('[CosyVoice] Audio playback waiting');
        });

        innerAudioContext.onSeeking(() => {
            console.log('[CosyVoice] Audio seeking');
        });

        innerAudioContext.onSeeked(() => {
            console.log('[CosyVoice] Audio seek completed');
        });

        innerAudioContext.onPause(() => {
            console.log('[CosyVoice] Audio playback paused');
        });

        innerAudioContext.onStop(() => {
            console.log('[CosyVoice] Audio playback stopped');
        });

        innerAudioContext.onTimeUpdate(() => {
            console.log('[CosyVoice] Audio time update:', innerAudioContext?.currentTime);
        });

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

        // 设置源和自动播放
        innerAudioContext.src = filePath;
        console.log('[CosyVoice] Setting audio source to:', filePath);

        // 延迟一点启动播放
        setTimeout(() => {
            if (innerAudioContext) {
                console.log('[CosyVoice] Starting playback...');
                innerAudioContext.autoplay = true;
                innerAudioContext.play();
            }
        }, 100);
    } catch (error) {
        console.error('[CosyVoice] Error setting up audio playback:', error);
        if (onError) onError(error);
    }
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
            console.log('[CosyVoice] Received WebSocket message:', data.header?.event || data.header?.status);
            console.log('[CosyVoice] Full message data:', data);

            // 按照官方示例格式处理事件
            if (data.header && data.header.event) {
                // 官方示例格式的事件处理
                console.log('[CosyVoice] Received event:', data.header.event);

                switch (data.header.event) {
                    case 'task-started':
                        console.log('[CosyVoice] Task started with ID:', data.header.task_id);
                        taskStarted = true;
                        // Send the continue-task message with the actual text
                        if (ws) sendContinueTask(text, onError);
                        break;

                    case 'task-finished':
                        console.log('[CosyVoice] Task finished');
                        // Write audio data to file and play it
                        if (audioData && audioData.length > 0) {
                            writeAndPlayAudio(onEnded, onError);
                        } else {
                            console.error('[CosyVoice] Task finished but no audio data received');
                            if (onError) onError({ message: 'No audio data received' });
                        }
                        break;

                    case 'task-failed':
                        console.error('[CosyVoice] Task failed:', data.header.error_message || data.payload?.failure);
                        if (onError) onError(data.header.error_message || data.payload?.failure || 'Unknown task failure');
                        break;

                    case 'result-generated':
                        // 处理中间结果，如果需要的话
                        console.log('[CosyVoice] Result generated');
                        break;
                }
            }
            // 兼容旧格式处理（作为备用）
            else if (data.header && data.header.status === 'message') {
                console.log('[CosyVoice] Received legacy message:', data.payload.message);

                if (data.payload.message === 'task-started') {
                    console.log('[CosyVoice] Task started with ID:', data.header.task_id);
                    taskStarted = true;
                    // Send the continue-task message with the actual text
                    if (ws) sendContinueTask(text, onError);
                } else if (data.payload.message === 'task-finished') {
                    console.log('[CosyVoice] Task finished');
                    // Write audio data to file and play it
                    if (audioData) {
                        writeAndPlayAudio(onEnded, onError);
                    }
                } else if (data.payload.message === 'task-failed') {
                    console.error('[CosyVoice] Task failed:', data.payload.failure);
                    if (onError) onError(data.payload.failure);
                }
            } else {
                console.log('[CosyVoice] Unrecognized message format:', data);
            }
        } else {
            // Handle binary message (audio data)
            // Convert binary data to Uint8Array and append to audioData
            const uint8Array = new Uint8Array(event.data as ArrayBuffer);
            console.log('[CosyVoice] Received binary audio chunk:', {
                size: uint8Array.length,
                totalSize: audioData ? audioData.length + uint8Array.length : uint8Array.length
            });
            audioData = audioData ? concatUint8Arrays(audioData, uint8Array) : uint8Array;
        }
    } catch (error) {
        console.error('[CosyVoice] Error handling WebSocket message:', error);
        if (onError) onError(error);
    }
} 