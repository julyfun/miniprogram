import SpeechRecognizer from '../../utils/speechRecognition';
import { DEEPSEEK_SECRETS } from '../../utils/secrets';
import { synthesizeAndPlay, stopPlayback as stopTTSPlayback } from '../../utils/tts'; // Import TTS functions

// Define the possible states for the orb animation
type OrbState = 'idle' | 'listening' | 'listening-active' | 'processing' | 'speaking'; // Add speaking state

interface IPageData {
    debugRecognizedText: string;    // For Debug Box 1
    debugDeepseekResponse: string;  // For Debug Box 2
    isRecording: boolean;           // Is microphone active?
    isWaitingForDeepseek: boolean;  // Waiting for API response?
    isSpeaking: boolean;            // Is TTS currently playing?
    orbState: OrbState;             // Controls orb animation
}

Page<IPageData, WechatMiniprogram.IAnyObject>({
    data: {
        debugRecognizedText: '',
        debugDeepseekResponse: '',
        isRecording: false,
        isWaitingForDeepseek: false,
        isSpeaking: false,
        orbState: 'idle',
    },

    // Silence detection timer
    silenceTimer: null as number | null,
    // Activity timeout (for bouncing animation)
    activityTimer: null as number | null,
    // Store the latest recognized text before sending
    latestRecognizedText: '',
    // Last result timestamp to detect activity
    lastResultTime: 0,

    // Speech recognizer instance
    speechRecognizer: null as SpeechRecognizer | null,

    // Add a flag to prevent rapid duplicate error handling
    lastErrorTime: 0,
    minErrorInterval: 500, // Minimum interval in ms between handling errors

    onLoad: function () {
        // Only init recognizer here
        this.initSpeechRecognition();
        // Recorder manager is handled within SpeechRecognizer now
    },

    onUnload: function () {
        // Clean up resources
        if (this.speechRecognizer) {
            this.speechRecognizer.stop(); // Ensure ASR stops if page is closed
        }
        stopTTSPlayback(); // Ensure TTS stops if page is closed
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
            this.activityTimer = null;
        }
    },

    // Initialize Speech Recognition
    initSpeechRecognition: function () {
        this.speechRecognizer = new SpeechRecognizer();

        // --- Result Callback ---
        this.speechRecognizer.onResult((text: string, isFinal: boolean) => {
            console.log('语音识别结果:', text, `isFinal: ${isFinal}`);

            // Detect voice activity - received a result means voice was detected
            this.handleVoiceActivity();

            // Update Debug Box 1
            this.setData({
                debugRecognizedText: text
            });
            // Store the latest text regardless of final status
            this.latestRecognizedText = text;

            // --- Silence Detection Logic ---
            // Clear any existing timer
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            // If not final, and still recording, set a new timer
            // Don't set timer if result is final to avoid sending after manual stop
            if (!isFinal && this.data.isRecording) {
                this.silenceTimer = setTimeout(() => {
                    console.log('Silence detected, stopping recorder and sending to Deepseek...');
                    // Stop recording first, indicating it was triggered by silence
                    this.stopRecordingAndRecognition(true);
                    // Immediately attempt to send (sendToDeepseek will check text)
                    this.sendToDeepseek();
                }, 2000); // 2 seconds of silence
            }
            // If it *is* final (e.g., service decided end of speech),
            // and we have text, send it immediately? (Optional behavior)
            // For now, we only send on timer expiry.
        });

        // --- Error Callback ---
        this.speechRecognizer.onError((error: any) => {
            const now = Date.now();
            if (now - this.lastErrorTime < this.minErrorInterval) {
                console.warn("Duplicate error suppressed within interval:", error);
                return;
            }
            this.lastErrorTime = now;

            let processedError: any = error;
            let errorSource = "Unknown"; // For logging

            // Try to parse if it's a string containing JSON
            if (typeof error === 'string') {
                try {
                    processedError = JSON.parse(error);
                    errorSource = "Parsed String";
                } catch (e) {
                    console.warn("Error data is a non-JSON string:", error);
                    processedError = { message: error }; // Treat non-JSON string as a message
                    errorSource = "Raw String";
                }
            } else if (typeof error === 'object' && error !== null) {
                errorSource = "Object";
            }

            // Log the raw error object structure and content (using original error)
            console.error(`语音识别错误 (Source: ${errorSource}, Raw): `, JSON.stringify(error, null, 2));
            // Log the processed error object
            if (errorSource !== "Object") {
                console.error(`语音识别错误 (Processed): `, JSON.stringify(processedError, null, 2));
            }

            // Ignore reset events for UI feedback
            if (processedError && processedError.code === "RESET") {
                console.log("Ignoring reset event in error handler.");
                return;
            }

            // 忽略常见的非错误终止状态
            const ignoredErrors = [
                "END_OF_SPEECH",
                "SPEECH_RECOGNITION_STOPPED",
                "RECORDING_STOPPED",
                "RECOGNITION_TIMEOUT",
                "TASKFAILED", // Add TaskFailed (normalized to uppercase)
                "ERR_VOICE_RECOGNITION_TIMEOUT",
                "ERR_RECORDER_STOPPED"
            ];

            // Perform checks on the processedError
            const errorCode = processedError && processedError.code ? processedError.code : undefined;
            const errorName = processedError && processedError.header && processedError.header.name ? processedError.header.name.toUpperCase() : undefined;
            const errorMessage = processedError && processedError.message ? processedError.message.toUpperCase() : undefined;
            const errorErrMsg = processedError && processedError.errMsg ? processedError.errMsg.toUpperCase() : undefined;

            // 检查错误代码、名称或错误信息中是否包含可忽略的状态
            if (processedError && (
                (errorCode && ignoredErrors.includes(errorCode)) ||
                (errorName && ignoredErrors.includes(errorName)) ||
                (errorMessage && ignoredErrors.some(code => ignoredErrors.includes(code.toUpperCase()) && errorMessage.includes(code.toUpperCase()))) ||
                (errorErrMsg && ignoredErrors.some(code => ignoredErrors.includes(code.toUpperCase()) && errorErrMsg.includes(code.toUpperCase())))
            )) {
                console.log("正常结束的语音识别状态或可忽略的TaskFailed，不需要显示错误:", errorCode || errorName || errorMessage || errorErrMsg);
                return; // 不显示错误信息
            }

            // If it reaches here, it's an unexpected error
            console.error('未处理的语音识别错误，即将显示 Toast:', processedError);

            // Handle other errors (use processedError for message extraction)
            wx.showToast({
                title: `识别出错: ${processedError.errMsg || processedError.message || '未知错误'}`,
                icon: 'none'
            });
            this.setData({
                isRecording: false,
                isWaitingForDeepseek: false,
                orbState: 'idle'
            });
            // Clear timer on error
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            if (this.activityTimer) {
                clearTimeout(this.activityTimer);
                this.activityTimer = null;
            }
        });
    },

    // --- Handle Voice Activity ---
    // Called when we receive speech recognition results (indicating active speech)
    handleVoiceActivity: function () {
        // Update timestamp to track speech activity
        this.lastResultTime = Date.now();

        // Only change animation if we're in recording mode
        if (!this.data.isRecording) return;

        // Set to active bouncing state
        if (this.data.orbState !== 'listening-active') {
            this.setData({
                orbState: 'listening-active'
            });
        }

        // Clear any existing activity timer
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
        }

        // Set a timer to change back to normal listening state when activity stops
        this.activityTimer = setTimeout(() => {
            // Only reset if we're still in active state and recording
            if (this.data.orbState === 'listening-active' && this.data.isRecording) {
                this.setData({
                    orbState: 'listening'
                });
            }
            this.activityTimer = null;
        }, 800); // Return to normal listening state after 800ms without new results
    },

    // --- Orb Tap Handler ---
    handleOrbTap: function () {
        if (this.data.isRecording) {
            this.stopRecordingAndRecognition();
        } else if (this.data.isSpeaking) { // If speaking, tapping stops TTS
            stopTTSPlayback();
            this.setData({ isSpeaking: false, orbState: 'idle' });
        } else {
            this.startRecordingAndRecognition();
        }
    },

    // --- Start Recording ---
    startRecordingAndRecognition: function () {
        stopTTSPlayback(); // Stop any ongoing TTS before starting recording
        if (this.data.isRecording || this.data.isWaitingForDeepseek) {
            return; // Already active or processing
        }
        console.log('开始录音和识别');

        // Reset state before starting
        if (this.speechRecognizer) {
            try {
                this.speechRecognizer.reset();
            } catch (e) {
                console.error('Reset error:', e);
            }
        }

        // Clear timers
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
            this.activityTimer = null;
        }

        this.setData({
            isRecording: true,
            isWaitingForDeepseek: false,
            orbState: 'listening', // Start with normal listening state
            debugRecognizedText: '', // Clear previous results
            debugDeepseekResponse: '',
            latestRecognizedText: '',
        });

        // Start the speech recognizer (which handles the recorder internally)
        if (this.speechRecognizer) {
            this.speechRecognizer.start().catch((error: any) => {
                console.error('启动语音识别失败:', error);
                wx.showToast({
                    title: '启动识别失败',
                    icon: 'none'
                });
                this.setData({
                    isRecording: false,
                    isWaitingForDeepseek: false,
                    orbState: 'idle'
                });
            });
        } else {
            console.error('语音识别器未初始化');
            wx.showToast({
                title: '识别功能初始化失败',
                icon: 'none'
            });
            this.setData({ isRecording: false, orbState: 'idle' });
        }
    },

    // --- Stop Recording (Manual / Silence) ---
    stopRecordingAndRecognition: function (triggeredBySilence: boolean = false) { // Add parameter to know the context
        console.log(`停止录音和识别 (${triggeredBySilence ? '静默触发' : '手动'})`);
        if (!this.data.isRecording) return;

        // Clear timers
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
            this.activityTimer = null;
        }

        // Stop the recognizer (which stops the recorder)
        if (this.speechRecognizer) {
            this.speechRecognizer.stop().catch((err: any) => {
                console.error("Error stopping speech recognizer:", err);
                // Handle potential errors during stop if needed
            });
        }

        // ONLY update isRecording state here. Let the caller decide the next state.
        this.setData({
            isRecording: false
        });
    },

    // --- Handle Debug Text Input ---
    onDebugTextInput: function (e: WechatMiniprogram.Input) {
        // 更新 debugRecognizedText，同时更新我们用于发送的文本
        this.setData({
            debugRecognizedText: e.detail.value
        });
        this.latestRecognizedText = e.detail.value;
    },

    // --- Send Edited Text Manually ---
    sendEditedText: function () {
        // 如果正在等待回复，不做任何操作
        if (this.data.isWaitingForDeepseek) {
            return;
        }

        // 如果正在录音，先停止录音 (pass false for manual trigger)
        if (this.data.isRecording) {
            this.stopRecordingAndRecognition(false);
        }

        // 发送当前文本框内的文本 (sendToDeepseek will handle state)
        console.log('手动发送编辑后的文本:', this.data.debugRecognizedText);
        // Update latestRecognizedText just before sending manually
        this.latestRecognizedText = this.data.debugRecognizedText;
        this.sendToDeepseek();
    },

    // --- Send Recognized Text to Deepseek ---
    sendToDeepseek: function () {
        // Check for empty text OR if already waiting for a response
        if (!this.latestRecognizedText.trim() || this.data.isWaitingForDeepseek) {
            console.log('发送取消：无有效文本或已在等待回复');
            // Ensure state is idle if sending is cancelled without waiting
            if (!this.data.isWaitingForDeepseek) {
                this.setData({ isRecording: false, orbState: 'idle', isWaitingForDeepseek: false });
            }
            return;
        }

        stopTTSPlayback(); // Stop TTS if it was somehow playing

        console.log('准备发送给 Deepseek:', this.latestRecognizedText);
        const textToSend = this.latestRecognizedText;

        // State should be updated *before* the API call
        this.setData({
            isRecording: false,
            isWaitingForDeepseek: true,
            isSpeaking: false, // Ensure speaking is false
            orbState: 'processing',
            debugDeepseekResponse: '思考中...'
        });

        // Call Deepseek API with streaming response
        wx.request({
            url: DEEPSEEK_SECRETS.API_URL,
            method: 'POST',
            header: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_SECRETS.API_KEY}`
            },
            data: {
                model: DEEPSEEK_SECRETS.MODEL,
                messages: [
                    // Consider adding system prompt or history if needed
                    { role: 'user', content: textToSend }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                stream: true // 启用流式响应
            },
            responseType: 'text',
            success: (res: any) => {
                console.log("Deepseek API 流式响应开始");
                if (res.statusCode === 200 && res.data) {
                    let fullContent = '';
                    let sentenceEndDetected = false;
                    let firstChunkReceived = false;

                    // We need a way to process the stream chunk by chunk as it arrives.
                    // wx.request 'success' gives the whole data at once even with stream:true.
                    // For true streaming UI update & TTS, we'd need wx.requestTask.onChunkReceived (not standard)
                    // or a WebSocket connection to a backend proxy that handles the stream.

                    // --- SIMPLIFIED APPROACH for now: Process whole response, then TTS --- 
                    try {
                        const lines = res.data.split('\n');
                        for (const line of lines) {
                            if (!line.trim() || !line.startsWith('data:')) continue;
                            const jsonStr = line.substring(5).trim();
                            if (jsonStr === '[DONE]') continue;
                            try {
                                const chunk = JSON.parse(jsonStr);
                                if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0].delta?.content) {
                                    fullContent += chunk.choices[0].delta.content;
                                }
                            } catch (e) { /* ignore json parse error */ }
                        }

                        // Update the debug box with the final content
                        this.setData({
                            debugDeepseekResponse: fullContent,
                            isWaitingForDeepseek: false, // Finished waiting for API
                            // We will set speaking state once TTS starts
                        });

                        // --- Play the full response using TTS ---
                        if (fullContent.trim()) {
                            console.log("[TTS] Attempting to play full response:", fullContent);
                            this.setData({ isSpeaking: true, orbState: 'speaking' }); // Update state for TTS
                            synthesizeAndPlay(
                                fullContent,
                                'Aitong', // Or another voice
                                'mp3',
                                16000,
                                () => { // onEnded
                                    console.log("[TTS] Playback completed successfully.");
                                    this.setData({ isSpeaking: false, orbState: 'idle' });
                                },
                                (error) => { // onError
                                    console.error("[TTS] Playback failed:", error);
                                    this.setData({ isSpeaking: false, orbState: 'idle' });
                                    // Optionally show a toast for TTS playback error
                                    wx.showToast({ title: '语音播放失败', icon: 'none' });
                                }
                            );
                        } else {
                            // No content to speak, return to idle
                            this.setData({ orbState: 'idle' });
                        }

                    } catch (error) {
                        console.error('处理流式响应失败:', error);
                        this.handleApiError('处理响应失败');
                    }
                } else {
                    this.handleApiError(`请求失败 (${res.statusCode})`);
                }
            },
            fail: (error) => {
                console.error('Deepseek API 请求失败:', error);
                this.handleApiError('网络请求失败');
            }
        });
    },

    // --- API Error Handling ---
    handleApiError: function (errorMsg: string) {
        this.setData({
            debugDeepseekResponse: `错误: ${errorMsg}`,
            isLoading: false, // Ensure isLoading is also reset if used elsewhere
            isWaitingForDeepseek: false,
            orbState: 'idle' // Reset orb state on error
        });
        wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
        });
    }

    // Removed: sendMessage, onMessageInput, scrollToBottom, saveChatHistory, loadChatHistory, clearChatHistory, activateDeepThinking, activateWebSearch, navigateToNewPage, initRecorderManager (now implicit)
}); 
