import AliSpeechRecognizer from '../../utils/customSpeechRecognition'; // Rename old import
import DashScopeSpeechRecognizer from '../../utils/dashScopeSpeechRecognition'; // Import new one
import { DEEPSEEK_SECRETS } from '../../utils/secrets';
import { synthesizeAndPlay, stopPlayback as stopTTSPlayback, setTtsProvider, getCurrentTtsProvider, TtsProviderType } from '../../utils/ttsProvider'; // Import TTS functions from the provider
import { callQwenApi, callQwenApiWithHistory } from '../../utils/qwenApi';
import { AI_INITIAL_PROMPT, FUNCTION_PATTERN, BUTTON_PATTERN, RECORD_PATTERN, FUNCTION_ROUTES, FunctionName } from '../../utils/config'; // Import AI config
import { FEATURE_METADATA } from '../../utils/featureMetadata'; // Import feature metadata

// Define ASR engine types
type AsrEngineType = 'alibaba' | 'dashscope';

// Define the possible states for the orb animation
type OrbState = 'idle' | 'listening' | 'listening-active' | 'processing' | 'speaking'; // Add speaking state

// Define the button interface
interface Button {
    id: number;
    feature: string;
    name: string;
    description?: string;
    image?: string;
}

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    hint?: string;
    buttons?: Button[]; // Add buttons field
}

interface IPageData {
    debugRecognizedText: string;    // For Debug Box 1
    debugDeepseekResponse: string;  // For Debug Box 2
    isRecording: boolean;           // Is microphone active?
    isWaitingForDeepseek: boolean;  // Waiting for API response?
    isSpeaking: boolean;            // Is TTS currently playing?
    orbState: OrbState;             // Controls orb animation
    currentAsrEngine: AsrEngineType; // Add state for current engine
    currentAiModel: 'deepseek' | 'qwen'; // Add new property for AI model selection
    currentTtsProvider: TtsProviderType; // Add property for current TTS provider
    chatHistory: ChatMessage[];
    lastMessageId: string;
    isEditing: boolean;             // Is the text input being edited?
    accumulatedText: string;        // Accumulated recognized text during recording
}

// Helper function to play text with TTS
function playTextWithTTS(
    this: WechatMiniprogram.Page.Instance<IPageData, WechatMiniprogram.IAnyObject>,
    text: string,
    shouldAutoRecord: boolean,
    logId: string = ''
): void {
    if (!text.trim()) {
        this.setData({ orbState: 'idle' });
        return;
    }

    console.log(`[TTS] Attempting to play response: ${logId}`, text);
    this.setData({ isSpeaking: true, orbState: 'speaking' });

    // 根据当前的TTS提供商选择不同的语音和采样率
    let voice, sampleRate;
    if (this.data.currentTtsProvider === 'cosyvoice') {
        // cosyvoice使用官方示例中推荐的参数
        voice = 'longwan';
        sampleRate = 22050;
    } else {
        // 阿里云使用默认的参数
        voice = 'aitong';
        sampleRate = 16000;
    }

    synthesizeAndPlay(
        text,
        voice,
        'mp3',
        sampleRate,
        () => {
            console.log("[TTS] Playback completed successfully.");
            // If shouldAutoRecord is true, start recording after speech completes
            if (shouldAutoRecord) {
                console.log("[Auto-Record] Starting recording automatically after speech");
                this.startRecordingAndRecognition();
            } else {
                this.setData({ isSpeaking: false, orbState: 'idle' });
            }
        },
        (error) => {
            console.error("[TTS] Playback failed:", error);
            this.setData({ isSpeaking: false, orbState: 'idle' });
            // Show a toast for TTS playback error only if it's not "Close received after close"
            // since that error often happens when switching screens or interrupting playback
            if (error && error.errMsg &&
                !error.errMsg.includes("Close received after close") &&
                !error.errMsg.includes("未完成的操作")) {
                wx.showToast({
                    title: '语音播放失败，将使用备用引擎',
                    icon: 'none'
                });
            }
        }
    );
}

// Choose the default ASR engine here
const DEFAULT_ASR_ENGINE: AsrEngineType = 'dashscope'; // Or 'alibaba'

// Define a common interface for our speech recognizers
interface ISpeechRecognizer {
    onResult(callback: (text: string, isFinal: boolean) => void): void;
    onError(callback: (error: any) => void): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    reset(): void;
}

// Add a function to check for and handle special function triggers in AI responses
function checkAndHandleFunctionTriggers(text: string): { processedText: string, functionFound: boolean, buttons: Button[], shouldAutoRecord: boolean } {
    // Don't modify the original text that is displayed to the user
    let processedText = text;
    let functionFound = false;
    let buttons: Button[] = [];
    let shouldAutoRecord = false;

    // Check for goto function pattern
    const match = text.match(FUNCTION_PATTERN);
    if (match && match[1]) {
        const functionName = match[1] as FunctionName;
        console.log(`Function detected: ${functionName}`);

        // Special handling for hongbao function
        if (functionName === 'hongbao') {
            // Navigate directly to event-demo with redpacket_tutorial ID
            wx.navigateTo({
                url: '/pages/event-demo/event-demo?id=redpacket_tutorial',
                success: () => {
                    console.log('Successfully navigated to hongbao tutorial');
                },
                fail: (err) => {
                    console.error('Navigation to hongbao failed:', err);
                    wx.showToast({
                        title: '跳转失败',
                        icon: 'none'
                    });
                }
            });
            functionFound = true;
        }
        // For all other functions, use the routes map
        else if (FUNCTION_ROUTES[functionName]) {
            // Navigate to the appropriate page
            wx.navigateTo({
                url: FUNCTION_ROUTES[functionName],
                success: () => {
                    console.log(`Successfully navigated to function: ${functionName}`);
                },
                fail: (err) => {
                    console.error('Navigation failed:', err);
                    wx.showToast({
                        title: '功能跳转失败',
                        icon: 'none'
                    });
                }
            });
            functionFound = true;
        }

        // Remove the function tag from the displayed text
        processedText = text.replace(FUNCTION_PATTERN, '').trim();
    }

    // Check for record tag
    if (text.match(RECORD_PATTERN)) {
        console.log('Record command detected in AI response');
        shouldAutoRecord = true;
        processedText = processedText.replace(RECORD_PATTERN, '').trim();
    }

    // Check for button patterns (can have multiple in one message)
    let buttonMatch;
    // Reset lastIndex to avoid infinite loop
    BUTTON_PATTERN.lastIndex = 0;
    while ((buttonMatch = BUTTON_PATTERN.exec(text)) !== null) {
        const featureName = buttonMatch[1];

        if (FEATURE_METADATA[featureName]) {
            const metadata = FEATURE_METADATA[featureName];
            buttons.push({
                id: Date.now() + buttons.length, // Unique ID for each button
                feature: featureName,
                name: metadata.name,
                description: metadata.description,
                image: metadata.image
            });
        }
    }

    // Remove all button tags from the text
    processedText = processedText.replace(BUTTON_PATTERN, '').trim();

    // Limit buttons to maximum 3
    if (buttons.length > 3) {
        buttons = buttons.slice(0, 3);
    }

    return { processedText, functionFound, buttons, shouldAutoRecord };
}

Page<IPageData, WechatMiniprogram.IAnyObject>({
    data: {
        debugRecognizedText: '',
        debugDeepseekResponse: '',
        isRecording: false,
        isWaitingForDeepseek: false,
        isSpeaking: false,
        orbState: 'idle',
        currentAsrEngine: DEFAULT_ASR_ENGINE, // Initialize with default
        currentAiModel: 'qwen', // Default to qwen instead of deepseek
        currentTtsProvider: 'cosyvoice', // Default to Alibaba Cloud TTS
        chatHistory: [],
        lastMessageId: '',
        isEditing: false,         // Add isEditing state
        accumulatedText: '',      // Accumulated recognized text during recording
    },

    // Add a property to maintain the actual conversation history for API calls
    // This is separate from chatHistory which is for display purposes
    conversationHistory: [] as { role: 'system' | 'user' | 'assistant', content: string }[],

    // Silence detection timer
    silenceTimer: null as number | null,
    // Activity timeout (for bouncing animation)
    activityTimer: null as number | null,
    // Store the latest recognized text before sending
    latestRecognizedText: '',
    // Last result timestamp to detect activity
    lastResultTime: 0,

    // Speech recognizer instance - now typed with the interface
    speechRecognizer: null as ISpeechRecognizer | null,

    // Add a flag to prevent rapid duplicate error handling
    lastErrorTime: 0,
    minErrorInterval: 500, // Minimum interval in ms between handling errors

    // Handle feature button tap
    handleFeatureButtonTap: function (e: WechatMiniprogram.CustomEvent) {
        const feature = e.currentTarget.dataset.feature;
        console.log('Feature button tapped:', feature);

        if (feature && FUNCTION_ROUTES[feature as FunctionName]) {
            wx.navigateTo({
                url: FUNCTION_ROUTES[feature as FunctionName],
                success: () => {
                    console.log(`Successfully navigated to feature: ${feature}`);
                },
                fail: (err) => {
                    console.error('Navigation failed:', err);
                    wx.showToast({
                        title: '功能跳转失败',
                        icon: 'none'
                    });
                }
            });
        }
    },

    onLoad: function () {
        this.initSpeechRecognition(); // Will use the engine specified in data

        // Send initial prompt to AI on load
        this.sendInitialPromptToAI();
    },

    onUnload: function () {
        // Clean up resources
        if (this.speechRecognizer) {
            if (typeof this.speechRecognizer.stop === 'function') {
                this.speechRecognizer.stop();
            }
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

    // Initialize Speech Recognition based on currentAsrEngine
    initSpeechRecognition: function () {
        const engineType = this.data.currentAsrEngine;
        console.log(`Initializing ASR engine: ${engineType}`);

        // Instantiate the selected recognizer
        if (engineType === 'dashscope') {
            this.speechRecognizer = new DashScopeSpeechRecognizer();
        } else { // Default to Alibaba
            this.speechRecognizer = new AliSpeechRecognizer();
        }

        if (!this.speechRecognizer) {
            console.error("Failed to initialize speech recognizer!");
            wx.showToast({ title: '语音引擎初始化失败', icon: 'none' });
            return;
        }

        // --- Result Callback ---
        this.speechRecognizer.onResult((text: string, isFinal: boolean) => {
            console.log('语音识别结果:', text, `isFinal: ${isFinal}`);

            // Detect voice activity - received a result means voice was detected
            this.handleVoiceActivity();

            // 如果是空文本，不更新显示
            if (!text.trim()) {
                return;
            }

            // 累积已识别的文本，将新文本追加到已累积的文本中
            // 如果新文本是已累积文本的一部分（识别引擎可能返回部分结果），则使用更长的那个
            let updatedText = text;
            const currentAccumulated = this.data.accumulatedText;

            // 检查新文本是否已包含在累积文本中，或累积文本是否是新文本的一部分
            if (currentAccumulated && text) {
                if (text.includes(currentAccumulated)) {
                    // 新文本包含旧文本，使用新文本
                    updatedText = text;
                } else if (!currentAccumulated.includes(text)) {
                    // 如果新文本不是旧文本的一部分，也不包含旧文本，则累加
                    // 可能是新的句子开始
                    updatedText = currentAccumulated + ' ' + text;
                } else {
                    // 旧文本包含新文本，保持旧文本
                    updatedText = currentAccumulated;
                }
            }

            // 更新界面显示和状态
            this.setData({
                debugRecognizedText: updatedText,
                accumulatedText: updatedText
            });

            // 保存最新文本用于后续发送
            this.latestRecognizedText = updatedText;

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
                }, 4000); // 4 seconds of silence
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
            // console.error(`语音识别错误 (Source: ${errorSource}, Raw): `, JSON.stringify(error, null, 2));
            // Log the processed error object
            // if (errorSource !== "Object") {
            //     console.error(`语音识别错误 (Processed): `, JSON.stringify(processedError, null, 2));
            // }

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

    // --- Show Text Input ---
    showTextInput: function () {
        // If speaking, stop the speech
        if (this.data.isSpeaking) {
            stopTTSPlayback(true); // Pass true to suppress error messages
            this.setData({
                isSpeaking: false,
                orbState: 'idle'
            });
        }

        // If recording, stop the recording
        if (this.data.isRecording) {
            this.stopRecordingAndRecognition();
        }

        this.setData({
            isEditing: true
        });
    },

    // --- Hide Text Input If Needed ---
    hideTextInputIfNeeded: function () {
        if (this.data.isEditing) {
            this.setData({
                isEditing: false
            });
        }
    },

    // --- Prevent Event Bubbling ---
    preventBubble: function (e: WechatMiniprogram.TouchEvent) {
        // This prevents the container's tap event from firing
        // when tapping on the text input container
    },

    // --- Handle Text Input Change ---
    onTextInputChange: function (e: WechatMiniprogram.Input) {
        this.setData({
            debugRecognizedText: e.detail.value
        });
        this.latestRecognizedText = e.detail.value;
    },

    // --- Send Edited Text ---
    sendEditedText: function () {
        // Don't send if text is empty or waiting for response
        if (!this.data.debugRecognizedText.trim() || this.data.isWaitingForDeepseek) {
            return;
        }

        // Update latestRecognizedText before sending
        this.latestRecognizedText = this.data.debugRecognizedText;

        // Reset isEditing state
        this.setData({
            isEditing: false
        });

        // Send the message
        this.sendToDeepseek();
    },

    // --- Orb Tap Handler ---
    handleOrbTap: function () {
        // If editing, hide the input first
        if (this.data.isEditing) {
            this.setData({
                isEditing: false
            });
            return;
        }

        if (this.data.isRecording) {
            this.stopRecordingAndRecognition();
        } else if (this.data.isSpeaking) { // If speaking, tapping stops TTS and starts recording
            stopTTSPlayback(true); // Pass true to suppress error messages
            this.setData({ isSpeaking: false });
            // Immediately start recording after stopping TTS
            this.startRecordingAndRecognition();
        } else {
            this.startRecordingAndRecognition();
        }
    },

    // --- Start Recording ---
    startRecordingAndRecognition: function () {
        stopTTSPlayback(true); // Stop any ongoing TTS before starting recording, suppress errors
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
            accumulatedText: '', // 重置累积的文本
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

        // 确保在停止录音时保留累积的文本
        if (this.data.accumulatedText) {
            this.latestRecognizedText = this.data.accumulatedText;
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

    // --- Send Recognized Text to Deepseek ---
    sendToDeepseek: function () {
        if (!this.latestRecognizedText.trim() || this.data.isWaitingForDeepseek) {
            console.log('发送取消：无有效文本或已在等待回复');
            if (!this.data.isWaitingForDeepseek) {
                this.setData({ isRecording: false, orbState: 'idle', isWaitingForDeepseek: false });
            }
            return;
        }

        stopTTSPlayback(true); // Suppress errors since this is an intentional stop

        const userMessage: ChatMessage = {
            id: Date.now(),
            role: 'user',
            content: `"${this.latestRecognizedText}"`
        };

        this.setData({
            isRecording: false,
            isWaitingForDeepseek: true,
            isSpeaking: false,
            orbState: 'processing',
            chatHistory: [...this.data.chatHistory, userMessage],
            lastMessageId: `msg-${userMessage.id}`,
            debugRecognizedText: '', // Clear debug text once added to chat history
            accumulatedText: '', // 清除累积的文本
            isEditing: false,         // Ensure editing state is reset
        }, () => {
            // Scroll to the bottom after adding user message
            this.scrollToBottom();
        });

        // Add user's message to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: this.latestRecognizedText
        });

        if (this.data.currentAiModel === 'deepseek') {
            // Original Deepseek implementation with chat history update
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
                        { role: 'user', content: this.latestRecognizedText }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true
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

                                    // 提取增量内容 (Replace optional chaining)
                                    if (chunk.choices &&
                                        chunk.choices.length > 0 &&
                                        chunk.choices[0].delta &&
                                        chunk.choices[0].delta.content) {
                                        const delta = chunk.choices[0].delta;
                                        fullContent += delta.content;
                                    }
                                } catch (e) { /* ignore json parse error */ }
                            }

                            // Check for function triggers and buttons in the response
                            const { processedText, functionFound, buttons, shouldAutoRecord } = checkAndHandleFunctionTriggers(fullContent);

                            const assistantMessage: ChatMessage = {
                                id: Date.now(),
                                role: 'assistant',
                                content: processedText, // Use the processed text without function tags
                                buttons: buttons.length > 0 ? buttons : undefined, // Add buttons if any
                                hint: shouldAutoRecord ? '(等待您的语音回复)' : undefined // Add a hint when auto-record is enabled
                            };

                            this.setData({
                                chatHistory: [...this.data.chatHistory, assistantMessage],
                                lastMessageId: `msg-${assistantMessage.id}`,
                                debugDeepseekResponse: '', // Clear after adding to chat history
                                isWaitingForDeepseek: false
                            }, () => {
                                // Scroll to the bottom after updating chat
                                this.scrollToBottom();
                            });

                            // --- Play the full response using TTS ---
                            if (processedText.trim()) {
                                playTextWithTTS.call(this, processedText, shouldAutoRecord, "#1");
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
        } else {
            // Updated Qwen implementation with chat history
            // Create a copy of the conversation history for the API call
            const messages = [
                { role: 'system' as const, content: 'You are a helpful assistant.' },
                ...this.conversationHistory
            ];

            callQwenApiWithHistory(messages)
                .then(response => {
                    if (!response) {
                        throw new Error('Empty response from Qwen API');
                    }

                    // Add assistant response to conversation history
                    this.conversationHistory.push({
                        role: 'assistant',
                        content: response
                    });

                    // Check for function triggers and buttons in the response
                    const { processedText, functionFound, buttons, shouldAutoRecord } = checkAndHandleFunctionTriggers(response);
                    console.log('Initial prompt response with buttons:', buttons.length > 0);

                    const assistantMessage: ChatMessage = {
                        id: Date.now(),
                        role: 'assistant',
                        content: processedText, // Use processed text without function tags
                        buttons: buttons.length > 0 ? buttons : undefined, // Add buttons if any
                        hint: shouldAutoRecord ? '(等待您的语音回复)' : undefined // Add a hint when auto-record is enabled
                    };

                    this.setData({
                        chatHistory: [...this.data.chatHistory, assistantMessage],
                        lastMessageId: `msg-${assistantMessage.id}`,
                        debugDeepseekResponse: '',
                        isWaitingForDeepseek: false
                    }, () => {
                        // Scroll to the bottom after updating chat
                        this.scrollToBottom();
                    });

                    if (processedText.trim()) {
                        console.log("[TTS] Attempting to play response: #2", processedText);
                        this.setData({ isSpeaking: true, orbState: 'speaking' });
                        playTextWithTTS.call(this, processedText, shouldAutoRecord, "#2");
                    } else {
                        this.setData({ orbState: 'idle' });
                    }
                })
                .catch(error => {
                    console.error('Qwen API request failed:', error);
                    this.handleApiError(error.message || '网络请求失败');
                });
        }
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
    },

    // Helper method to ensure chat scrolls to the bottom
    scrollToBottom: function () {
        // Give the DOM time to update before scrolling
        setTimeout(() => {
            // Try to directly scroll to bottom first
            wx.createSelectorQuery()
                .select('.chat-history')
                .node()
                .exec((res) => {
                    const scrollView = res[0] && res[0].node;
                    if (scrollView) {
                        // Direct scrollTo method
                        scrollView.scrollTo({
                            top: 999999, // Very large number to ensure scroll to bottom
                            behavior: 'smooth'
                        });
                    } else {
                        // Fallback: Try to scroll to the element with the lastMessageId
                        if (this.data.lastMessageId) {
                            wx.pageScrollTo({
                                selector: `#${this.data.lastMessageId}`,
                                duration: 300
                            });
                        } else {
                            // Final fallback: just scroll to bottom of page
                            wx.pageScrollTo({
                                scrollTop: 9999,
                                duration: 300
                            });
                        }
                    }
                });
        }, 100); // Short delay to ensure DOM has updated
    },

    // --- Add method to switch engine (Example) ---
    switchAsrEngine: function () {
        const nextEngine: AsrEngineType = this.data.currentAsrEngine === 'alibaba' ? 'dashscope' : 'alibaba';
        console.log(`Switching ASR engine to: ${nextEngine}`);
        // Stop current recognizer if active
        if (this.speechRecognizer && this.data.isRecording) {
            this.speechRecognizer.stop();
        }
        if (this.speechRecognizer && typeof this.speechRecognizer.reset === 'function') {
            this.speechRecognizer.reset(); // Call reset if available
        }
        this.speechRecognizer = null; // Clear instance
        stopTTSPlayback(); // Stop TTS during switch
        this.setData({
            currentAsrEngine: nextEngine,
            isRecording: false,
            isWaitingForDeepseek: false,
            isSpeaking: false,
            orbState: 'idle',
            debugRecognizedText: '',
            debugDeepseekResponse: ''
        }, () => {
            this.initSpeechRecognition(); // Re-initialize with the new engine
            wx.showToast({ title: `已切换到 ${nextEngine} 引擎`, icon: 'none' });
        });
    },

    // Add new method to switch AI models
    switchAiModel: function () {
        const nextModel = this.data.currentAiModel === 'deepseek' ? 'qwen' : 'deepseek';
        this.setData({
            currentAiModel: nextModel,
            debugDeepseekResponse: '', // Clear previous response
            debugRecognizedText: '' // Clear previous input
        });
        wx.showToast({
            title: `已切换到 ${nextModel} 模型`,
            icon: 'none'
        });
    },

    // Update clearChatHistory to also clear the conversation history
    clearChatHistory: function () {
        this.setData({
            chatHistory: [],
            lastMessageId: '',
            debugRecognizedText: '',
            debugDeepseekResponse: ''
        });

        // Clear the API conversation history as well
        this.conversationHistory = [];
    },

    // Add method to send initial prompt to AI
    sendInitialPromptToAI: function () {
        // Skip if there's already chat history (e.g. from a reload)
        if (this.data.chatHistory.length > 0) {
            return;
        }

        // Set initial prompt as if it came from user, but make it invisible
        // We're just sending it to the API, not showing it to user
        this.latestRecognizedText = AI_INITIAL_PROMPT;

        // Call the AI but don't add this prompt to visible chat history
        if (this.data.currentAiModel === 'deepseek') {
            this.callDeepseekWithoutUserMessage(AI_INITIAL_PROMPT);
        } else {
            this.callQwenWithoutUserMessage(AI_INITIAL_PROMPT);
        }
    },

    // Modified version of sendToDeepseek that doesn't add a user message
    callDeepseekWithoutUserMessage: function (prompt: string) {
        this.setData({
            isWaitingForDeepseek: true,
            orbState: 'processing'
        });

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
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                stream: true
            },
            responseType: 'text',
            success: (res: any) => {
                console.log("Initial Deepseek API response received");
                if (res.statusCode === 200 && res.data) {
                    let fullContent = '';

                    try {
                        const lines = res.data.split('\n');
                        for (const line of lines) {
                            if (!line.trim() || !line.startsWith('data:')) continue;
                            const jsonStr = line.substring(5).trim();
                            if (jsonStr === '[DONE]') continue;
                            try {
                                const chunk = JSON.parse(jsonStr);

                                if (chunk.choices &&
                                    chunk.choices.length > 0 &&
                                    chunk.choices[0].delta &&
                                    chunk.choices[0].delta.content) {
                                    const delta = chunk.choices[0].delta;
                                    fullContent += delta.content;
                                }
                            } catch (e) { /* ignore json parse error */ }
                        }

                        // For initial prompt, extract the text, buttons, but skip function navigation
                        const { processedText, buttons, shouldAutoRecord } = checkAndHandleFunctionTriggers(fullContent);
                        console.log('Initial prompt response with buttons:', buttons.length > 0);

                        // Add the initial greeting from AI to chat with any buttons found
                        const assistantMessage: ChatMessage = {
                            id: Date.now(),
                            role: 'assistant',
                            content: processedText,
                            buttons: buttons.length > 0 ? buttons : undefined,
                            hint: shouldAutoRecord ? '(等待您的语音回复)' : undefined
                        };

                        this.setData({
                            chatHistory: [assistantMessage], // For initial message, just set one message
                            lastMessageId: `msg-${assistantMessage.id}`,
                            debugDeepseekResponse: '',
                            isWaitingForDeepseek: false,
                            orbState: 'idle'
                        }, () => {
                            // Scroll to the bottom after updating chat
                            this.scrollToBottom();
                        });

                        // Optionally speak the welcome message
                        if (processedText.trim()) {
                            this.setData({ isSpeaking: true, orbState: 'speaking' });
                            console.log("[TTS] Attempting to play response: #3", processedText);
                            playTextWithTTS.call(this, processedText, shouldAutoRecord, "#3");
                        } else {
                            this.setData({ orbState: 'idle' });
                        }
                    } catch (error) {
                        console.error('处理初始响应失败:', error);
                        this.handleApiError('处理响应失败');
                    }
                } else {
                    this.handleApiError(`请求失败 (${res.statusCode})`);
                }
            },
            fail: (error) => {
                console.error('初始 Deepseek API 请求失败:', error);
                this.handleApiError('网络请求失败');
            }
        });
    },

    // Modified version for Qwen API
    callQwenWithoutUserMessage: function (prompt: string) {
        this.setData({
            isWaitingForDeepseek: true,
            orbState: 'processing'
        });

        // Initialize conversation history with the system prompt
        this.conversationHistory = [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
        ];

        // Call API with the initial conversation
        callQwenApiWithHistory(this.conversationHistory)
            .then(response => {
                if (!response) {
                    throw new Error('Empty response from Qwen API');
                }

                // Add the response to conversation history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: response
                });

                // For initial prompt, extract the text, buttons, but skip function navigation
                const { processedText, buttons, shouldAutoRecord } = checkAndHandleFunctionTriggers(response);
                console.log('Initial prompt response with buttons:', buttons.length > 0);

                const assistantMessage: ChatMessage = {
                    id: Date.now(),
                    role: 'assistant',
                    content: processedText,
                    buttons: buttons.length > 0 ? buttons : undefined,
                    hint: shouldAutoRecord ? '(等待您的语音回复)' : undefined
                };

                this.setData({
                    chatHistory: [assistantMessage], // For initial message, just set one message
                    lastMessageId: `msg-${assistantMessage.id}`,
                    isWaitingForDeepseek: false
                });

                if (processedText.trim()) {
                    this.setData({ isSpeaking: true, orbState: 'speaking' });
                    console.log("[TTS] Attempting to play response: #4", processedText);
                    playTextWithTTS.call(this, processedText, shouldAutoRecord, "#4");
                } else {
                    this.setData({ orbState: 'idle' });
                }
            })
            .catch(error => {
                console.error('Initial Qwen API request failed:', error);
                this.handleApiError(error.message || '网络请求失败');
            });
    },

    // Add new method to switch TTS providers
    switchTtsProvider: function () {
        // Switch between available providers
        const nextProvider: TtsProviderType = this.data.currentTtsProvider === 'ali' ? 'cosyvoice' : 'ali';
        console.log(`Switching TTS provider to: ${nextProvider}`);

        // Stop any ongoing TTS playback
        stopTTSPlayback(true); // Pass true to suppress error messages

        // Update the provider in the TTS service
        setTtsProvider(nextProvider);

        // Update the UI state
        this.setData({
            currentTtsProvider: nextProvider,
            isSpeaking: false
        });

        wx.showToast({
            title: `已切换到 ${nextProvider === 'ali' ? '阿里云' : 'CosyVoice'} TTS引擎`,
            icon: 'none',
            duration: 2000
        });
    },

    // Removed: sendMessage, onMessageInput, scrollToBottom, saveChatHistory, loadChatHistory, clearChatHistory, activateDeepThinking, activateWebSearch, navigateToNewPage, initRecorderManager (now implicit)
});
