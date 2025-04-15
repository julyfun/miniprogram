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
    showSettings: boolean;          // Controls the visibility of settings menu
    isDebugMode: boolean;           // Controls debug mode to prevent API requests
    showLearningProgress: boolean;  // Controls the visibility of learning progress
    learningProgress: {            // User's learning progress
        totalCompleted: number;
        modules: Record<string, { completed: boolean; score: number; lastUpdated: Date }>;
    }
    userInfo: any;                  // Add user info
    isLogged: boolean;              // Add login status
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

        // 在任何导航前停止TTS播放
        stopTTSPlayback(true); // true参数抑制错误提示

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
        // Special handling for scam_call function
        else if (functionName === 'scam_call') {
            // Get reference to the current page
            const currentPages = getCurrentPages();
            if (currentPages && currentPages.length > 0) {
                const currentPage = currentPages[currentPages.length - 1];

                // Safely get learning progress from page data
                const learningProgress = currentPage.data?.learningProgress || { modules: {} };

                // Find the first incomplete scam call module
                const scamModules = ['scam_call', 'scam_call2', 'scam_call3'];
                let targetModule = 'scam_call'; // Default to first module

                for (const module of scamModules) {
                    // If module is not completed or doesn't exist in progress data
                    if (!learningProgress.modules[module] || !learningProgress.modules[module].completed) {
                        targetModule = module;
                        break;
                    }
                }

                console.log(`动态路由到首个未完成的诈骗防范模块: ${targetModule}`);

                // Navigate to the identified target module
                wx.navigateTo({
                    url: `/pages/event-demo/event-demo?id=${targetModule}`,
                    success: () => {
                        console.log(`Successfully navigated to dynamic module: ${targetModule}`);
                    },
                    fail: (err) => {
                        console.error('Navigation failed:', err);
                        wx.showToast({
                            title: '跳转失败',
                            icon: 'none'
                        });
                    }
                });
                functionFound = true;
            } else {
                // Fallback to default behavior if we can't access page data
                wx.navigateTo({
                    url: '/pages/event-demo/event-demo?id=scam_call',
                    success: () => {
                        console.log('Fallback navigation to scam_call');
                    },
                    fail: (err) => {
                        console.error('Navigation failed:', err);
                        wx.showToast({
                            title: '跳转失败',
                            icon: 'none'
                        });
                    }
                });
                functionFound = true;
            }
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
        showSettings: false,      // Add showSettings state for settings menu
        isDebugMode: true,        // Start with debug mode enabled by default
        showLearningProgress: false,  // Hide learning progress by default
        learningProgress: {
            totalCompleted: 0,
            modules: {}
        },
        userInfo: {},             // Initialize user info
        isLogged: false           // Initialize login status
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

        // 在导航前停止语音播放
        stopTTSPlayback(true); // true参数抑制错误提示
        this.setData({
            isSpeaking: false,
            orbState: 'idle'
        });

        if (feature && FUNCTION_ROUTES[feature as FunctionName]) {
            // Check if this is the special scam_call feature
            if (feature === 'scam_call') {
                // For scam_call, find the first incomplete module and navigate there
                const scamModules = ['scam_call', 'scam_call2', 'scam_call3'];
                let targetModule = 'scam_call'; // Default to first module

                const modules = this.data.learningProgress.modules || {};

                for (const module of scamModules) {
                    // If module is not completed or doesn't exist in progress data
                    if (!modules[module] || !modules[module].completed) {
                        targetModule = module;
                        break;
                    }
                }

                console.log(`动态路由到首个未完成的诈骗防范模块: ${targetModule}`);

                // Navigate to the identified target module
                wx.navigateTo({
                    url: `/pages/event-demo/event-demo?id=${targetModule}`,
                    success: () => {
                        console.log(`Successfully navigated to dynamic module: ${targetModule}`);
                    },
                    fail: (err) => {
                        console.error('Navigation failed:', err);
                        wx.showToast({
                            title: '跳转失败',
                            icon: 'none'
                        });
                    }
                });
            } else {
                // Regular navigation for other features
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
        }
    },

    onLoad: function () {
        this.initSpeechRecognition(); // Will use the engine specified in data

        // 检查云开发环境是否初始化
        if (!wx.cloud) {
            console.error('云开发环境未初始化，学习进度功能不可用');
            wx.showToast({
                title: '云服务初始化失败',
                icon: 'none',
                duration: 2000
            });
        }

        // Check if user is already logged in
        const storedOpenid = wx.getStorageSync('user_openid');
        const storedUserInfo = wx.getStorageSync('user_info');

        if (storedOpenid) {
            this.setData({
                isLogged: true,
                userInfo: storedUserInfo || {}
            });
            console.log("User already logged in, openid:", storedOpenid);

            // Load user learning progress now that we have the openid
            this.loadLearningProgress();
        } else {
            console.log("User not logged in, showing login prompt");
            this.showLoginPrompt();
        }

        // Only send initial prompt if not in debug mode
        if (!this.data.isDebugMode) {
            this.sendInitialPromptToAI();
        } else {
            console.log('[Debug] Skipping initial API request in debug mode');

            // 增强的 Debug 模式问候语，包含更多种类的按钮和标签
            const debugWelcomeText = "Debug 模式已启用! 您可以测试以下功能：\n\n" +
                "1. 点击按钮跳转: [button:hongbao] [button:health] [button:scam_call]\n" +
                "2. 询问功能: 试试问\"你有什么功能\"\n" +
                "3. 直接命令: 试试说\"打开红包教程\"\n" +
                "4. 语音回复: 试试说\"我要用语音回答\" [record]";

            // 处理文本中的标签，提取按钮和其他功能
            const { processedText, functionFound, buttons, shouldAutoRecord } = checkAndHandleFunctionTriggers(debugWelcomeText);

            // 创建经过处理的调试消息
            const debugMessage: ChatMessage = {
                id: Date.now(),
                role: 'assistant',
                content: processedText,
                buttons: buttons.length > 0 ? buttons : undefined,
                hint: shouldAutoRecord ? '(等待您的语音回复)' : undefined
            };

            this.setData({
                chatHistory: [debugMessage]
            });
        }
    },

    onHide: function () {
        // 当页面隐藏（包括跳转到其他页面）时停止语音播放
        console.log('Index page hidden, stopping TTS playback');
        stopTTSPlayback(true); // 使用true参数抑制错误提示

        // 更新UI状态
        this.setData({
            isSpeaking: false,
            orbState: 'idle'
        });
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

    // --- Toggle Settings Menu ---
    toggleSettingsMenu: function () {
        const newState = !this.data.showSettings;
        console.log('[Settings] Toggling settings menu:', this.data.showSettings, '->', newState);
        this.setData({
            showSettings: newState
        });
    },

    // --- Hide Settings Menu ---
    hideSettingsMenu: function () {
        // Hide both text input and settings menu
        this.hideTextInputIfNeeded();

        if (this.data.showSettings) {
            this.setData({
                showSettings: false
            });
        }
    },

    // --- Prevent Event Bubbling ---
    preventBubble: function (e: WechatMiniprogram.TouchEvent) {
        // This prevents the container's tap event from firing
        // when tapping on the text input container or settings menu
        console.log('[UI] Preventing event bubble');
        // 微信小程序中使用catchtap绑定而不是使用stopPropagation
        // 已在wxml中使用catchtap="preventBubble"
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

        // If in debug mode, return a mock response instead of making an API call
        if (this.data.isDebugMode) {
            console.log('[Debug] Simulating API response in debug mode');
            setTimeout(() => {
                // Create a more interactive debug response with button and function tags
                const userInput = this.latestRecognizedText.trim();
                let debugResponse = `[DEBUG MODE] 您说: "${userInput}"`;

                // Add relevant buttons based on user input
                if (userInput.includes('功能') || userInput.includes('介绍') || userInput.includes('可以做什么')) {
                    debugResponse += " [button:hongbao] [button:health] [button:scam_call]";
                }

                // Add navigation function tag if user asks to go somewhere
                if (userInput.includes('红包') || userInput.includes('发红包')) {
                    debugResponse += " [function:hongbao]";
                } else if (userInput.includes('诈骗') || userInput.includes('防诈') || userInput.includes('电话诈骗')) {
                    debugResponse += " [function:scam_call]";
                }

                // Add recording tag if appropriate
                if (userInput.includes('语音') || userInput.includes('说话')) {
                    debugResponse += " [record]";
                }

                // Process the response the same way as regular API responses
                const { processedText, functionFound, buttons, shouldAutoRecord } = checkAndHandleFunctionTriggers(debugResponse);

                const assistantMessage: ChatMessage = {
                    id: Date.now(),
                    role: 'assistant',
                    content: processedText,
                    buttons: buttons.length > 0 ? buttons : undefined,
                    hint: shouldAutoRecord ? '(等待您的语音回复)' : undefined
                };

                this.setData({
                    chatHistory: [...this.data.chatHistory, assistantMessage],
                    lastMessageId: `msg-${assistantMessage.id}`,
                    debugDeepseekResponse: '',
                    isWaitingForDeepseek: false,
                    orbState: 'idle'
                }, () => {
                    this.scrollToBottom();

                    // If should auto record, start recording after a delay
                    if (shouldAutoRecord) {
                        setTimeout(() => {
                            this.startRecordingAndRecognition();
                        }, 500);
                    }
                });
            }, 1000);
            return;
        }

        // Initialize conversationHistory if it doesn't exist
        if (!this.conversationHistory) {
            this.conversationHistory = [];
        }

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
        // Skip API call if in debug mode
        if (this.data.isDebugMode) {
            console.log('[Debug] Skipping Deepseek API call in debug mode');

            const debugMessage: ChatMessage = {
                id: Date.now(),
                role: 'assistant',
                content: '🐞 Debug mode active. This would be an API response from Deepseek.'
            };

            this.setData({
                chatHistory: [debugMessage],
                isWaitingForDeepseek: false,
                orbState: 'idle'
            });
            return;
        }

        // Continue with regular API call
        this.setData({
            isWaitingForDeepseek: true,
            orbState: 'processing'
        });

        // Initialize conversationHistory if it doesn't exist
        if (!this.conversationHistory) {
            this.conversationHistory = [];
        }

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
        // Skip API call if in debug mode
        if (this.data.isDebugMode) {
            console.log('[Debug] Skipping Qwen API call in debug mode');

            const debugMessage: ChatMessage = {
                id: Date.now(),
                role: 'assistant',
                content: '🐞 Debug mode active. This would be an API response from Qwen.'
            };

            this.setData({
                chatHistory: [debugMessage],
                isWaitingForDeepseek: false,
                orbState: 'idle'
            });
            return;
        }

        // Continue with regular API call
        this.setData({
            isWaitingForDeepseek: true,
            orbState: 'processing'
        });

        // Initialize conversation history with the system prompt
        if (!this.conversationHistory) {
            this.conversationHistory = [];
        }

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
                    chatHistory: [...this.data.chatHistory, assistantMessage],
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

    // Add method to toggle debug mode
    toggleDebugMode: function () {
        const newDebugMode = !this.data.isDebugMode;
        console.log(`[Debug] Toggling debug mode: ${this.data.isDebugMode} -> ${newDebugMode}`);

        // If turning off debug mode
        if (!newDebugMode) {
            // First clear chat history to allow the initial prompt to be sent
            this.setData({
                isDebugMode: newDebugMode,
                chatHistory: []  // Clear the chat history
            });

            // Clear the API conversation history as well
            if (this.conversationHistory) {
                this.conversationHistory = [];
            }

            console.log('[Debug] Debug mode turned off, sending initial prompt to AI');
            this.sendInitialPromptToAI();
        } else {
            // 切换到 Debug 模式，显示增强的问候语
            // 自定义的 Debug 模式问候语，包含更多种类的按钮和标签
            const debugWelcomeText = "Debug 模式已启用! 您可以测试以下功能：\n\n" +
                "1. 点击按钮跳转: [button:hongbao] [button:health] [button:scam_call]\n" +
                "2. 询问功能: 试试问\"你有什么功能\"\n" +
                "3. 直接命令: 试试说\"打开红包教程\"\n" +
                "4. 语音回复: 试试说\"我要用语音回答\" [record]";

            // 处理文本中的标签，提取按钮和其他功能
            const { processedText, functionFound, buttons, shouldAutoRecord } = checkAndHandleFunctionTriggers(debugWelcomeText);

            // 创建经过处理的调试消息
            const debugMessage: ChatMessage = {
                id: Date.now(),
                role: 'assistant',
                content: processedText,
                buttons: buttons.length > 0 ? buttons : undefined,
                hint: shouldAutoRecord ? '(等待您的语音回复)' : undefined
            };

            // Just update the debug mode flag and set the debug welcome message
            this.setData({
                isDebugMode: newDebugMode,
                chatHistory: [debugMessage]
            });
        }

        wx.showToast({
            title: newDebugMode ? 'Debug mode enabled' : 'Debug mode disabled',
            icon: 'none'
        });
    },

    // Toggle learning progress visibility
    toggleLearningProgress: function () {
        this.setData({
            showLearningProgress: !this.data.showLearningProgress
        });
    },

    // Load user learning progress from cloud
    loadLearningProgress: function () {
        // Get the user's OpenID from storage
        const openid = wx.getStorageSync('user_openid');
        if (!openid) {
            console.log('用户未登录，无法加载学习进度');
            return;
        }

        console.log('【客户端】开始加载学习进度，openid:', openid);

        try {
            // Make sure cloud is initialized
            if (!wx.cloud || !wx.cloud.callFunction) {
                console.error('Cloud service not initialized');
                wx.showToast({
                    title: '云服务不可用',
                    icon: 'none'
                });
                return;
            }

            // Call cloud function to get learning progress
            wx.cloud.callFunction({
                name: 'getLearningProgress',
                data: {
                    openid: openid
                },
                success: (res: any) => {
                    console.log('【客户端】加载学习进度返回结果:', JSON.stringify(res.result));
                    if (res.result && res.result.success && res.result.data) {
                        console.log('【客户端】学习进度数据有效，设置到UI');
                        console.log('【客户端】进度模块详情:', JSON.stringify(res.result.data.modules));
                        this.setData({
                            learningProgress: res.result.data
                        });
                    } else if (res.result && res.result.success === false) {
                        // 处理云函数返回 success: false 的情况
                        console.log('【客户端】首次加载学习进度，用户暂无进度数据');
                        // 初始化空的学习进度对象
                        this.setData({
                            learningProgress: {
                                totalCompleted: 0,
                                modules: {}
                            }
                        });
                    } else {
                        console.warn('【客户端】学习进度返回数据格式异常:', res);
                    }
                },
                fail: (err) => {
                    console.error('【客户端】加载学习进度失败:', err);
                    wx.showToast({
                        title: '加载学习进度失败',
                        icon: 'none'
                    });
                }
            });
        } catch (error) {
            console.error('【客户端】Cloud function error:', error);
            wx.showToast({
                title: '云服务调用异常',
                icon: 'none'
            });
        }
    },

    // Login and get OpenID if needed
    loginAndGetOpenID: function () {
        try {
            // Make sure cloud is initialized
            if (!wx.cloud || !wx.cloud.callFunction) {
                console.error('Cloud service not initialized');
                wx.showToast({
                    title: '云服务不可用',
                    icon: 'none'
                });
                return;
            }

            wx.cloud.callFunction({
                name: 'login',
                data: {},
                success: (res: any) => {
                    console.log('登录成功:', res.result);
                    if (res.result && res.result.openid) {
                        wx.setStorageSync('user_openid', res.result.openid);
                        // Load learning progress after getting openid
                        this.loadLearningProgress();
                        // Show success message
                        wx.showToast({
                            title: '登录成功，进度已同步',
                            icon: 'success',
                            duration: 2000
                        });

                        // 刷新顶部的登录横幅
                        this.setData({
                            isLogged: true
                        });
                    } else {
                        console.error('登录返回缺少openid');
                        wx.showToast({
                            title: '登录失败，请重试',
                            icon: 'none'
                        });
                    }
                },
                fail: (err) => {
                    console.error('登录失败:', err);
                    wx.showToast({
                        title: '登录失败，请检查网络',
                        icon: 'none'
                    });
                }
            });
        } catch (error) {
            console.error('Cloud function error:', error);
            wx.showToast({
                title: '云服务调用异常',
                icon: 'none'
            });
        }
    },

    // Refresh learning progress
    refreshLearningProgress: function () {
        console.log('refreshLearningProgress');
        this.loadLearningProgress();
    },

    // Reset learning progress
    resetLearningProgress: function () {
        wx.showModal({
            title: '确认重置',
            content: '确定要重置所有学习进度吗？重置后将无法恢复。',
            success: (res) => {
                if (res.confirm) {
                    console.log('【客户端】用户确认重置学习进度');
                    wx.showLoading({
                        title: '重置中...',
                    });

                    // 获取OpenID
                    const openid = wx.getStorageSync('user_openid');
                    console.log('【客户端】重置进度的openid:', openid);

                    wx.cloud.callFunction({
                        name: 'resetLearningProgress',
                        data: {
                            openid: openid
                        },
                        success: (res) => {
                            console.log('【客户端】重置学习进度返回结果:', JSON.stringify(res.result));

                            // 检查返回的重置模块数据
                            if (res.result && typeof res.result === 'object' && 'resetModules' in res.result) {
                                console.log('【客户端】服务器返回的重置模块数据:', JSON.stringify(res.result.resetModules));
                            }

                            if (res.result && typeof res.result === 'object' && 'verifiedData' in res.result) {
                                console.log('【客户端】服务器验证的数据库记录:', JSON.stringify(res.result.verifiedData));
                            }

                            // 首先清除本地缓存
                            console.log('【客户端】清除本地缓存的学习进度数据');
                            this.setData({
                                learningProgress: {
                                    totalCompleted: 0,
                                    modules: {}
                                }
                            });

                            // 立即从服务器刷新数据
                            console.log('【客户端】重新从服务器加载最新进度数据');
                            setTimeout(() => {
                                this.loadLearningProgress();
                            }, 500);

                            wx.showToast({
                                title: '重置成功',
                                icon: 'success'
                            });
                        },
                        fail: (err) => {
                            console.error('【客户端】Reset learning progress failed:', err);
                            wx.showToast({
                                title: '重置失败',
                                icon: 'error'
                            });
                        },
                        complete: () => {
                            wx.hideLoading();
                        }
                    });
                }
            }
        });
    },

    // Navigate to a specific learning module
    navigateToModule: function (e: WechatMiniprogram.CustomEvent) {
        const moduleId = e.currentTarget.dataset.module;
        if (!moduleId) return;

        console.log(`跳转到学习模块: ${moduleId}`);

        // 在导航前停止语音播放
        stopTTSPlayback(true);

        // Check if this is the special next_scam_call module
        if (moduleId === 'next_scam_call') {
            // Find the first incomplete scam call module
            const scamModules = ['scam_call', 'scam_call2', 'scam_call3'];
            let targetModule = 'scam_call'; // Default to first module

            const modules = this.data.learningProgress.modules || {};

            for (const module of scamModules) {
                // If module is not completed or doesn't exist in progress data
                if (!modules[module] || !modules[module].completed) {
                    targetModule = module;
                    break;
                }
            }

            console.log(`动态路由到首个未完成的诈骗防范模块: ${targetModule}`);

            // Navigate to the identified target module
            wx.navigateTo({
                url: `/pages/event-demo/event-demo?id=${targetModule}`,
                success: () => {
                    console.log(`Successfully navigated to dynamic module: ${targetModule}`);
                },
                fail: (err) => {
                    console.error('Navigation failed:', err);
                    wx.showToast({
                        title: '跳转失败',
                        icon: 'none'
                    });
                }
            });
        } else {
            // Normal navigation for other modules
            wx.navigateTo({
                url: `/pages/event-demo/event-demo?id=${moduleId}`,
                success: () => {
                    console.log(`Successfully navigated to ${moduleId}`);
                },
                fail: (err) => {
                    console.error('Navigation failed:', err);
                    wx.showToast({
                        title: '跳转失败',
                        icon: 'none'
                    });
                }
            });
        }
    },

    // Show login prompt to user
    showLoginPrompt: function () {
        wx.showModal({
            title: '登录提示',
            content: '登录后可以保存您的学习进度，是否立即登录？',
            confirmText: '立即登录',
            cancelText: '暂不登录',
            success: (res) => {
                if (res.confirm) {
                    this.login();
                } else {
                    console.log('User declined to login');

                    // Show toast to remind user they can login later
                    wx.showToast({
                        title: '您可以随时在右下角设置中登录',
                        icon: 'none',
                        duration: 2000
                    });

                    // Make sure learning progress is visible so they see it anyway
                    this.setData({
                        showLearningProgress: true
                    });
                }
            }
        });
    },

    // Handle user login
    login: function () {
        try {
            wx.showLoading({
                title: '登录中...',
                mask: true
            });

            // First check if wx.getUserProfile is available
            if (typeof wx.getUserProfile === 'function') {
                wx.getUserProfile({
                    desc: '用于完善用户资料和保存学习进度',
                    success: (res) => {
                        this.setData({
                            userInfo: res.userInfo,
                            isLogged: true,
                            showSettings: false // 登录后关闭设置菜单
                        });

                        // Save user info to storage
                        wx.setStorageSync('user_info', res.userInfo);

                        // Get openid from cloud
                        this.loginAndGetOpenID();
                        wx.hideLoading();

                        // 显示学习进度
                        this.setData({
                            showLearningProgress: true
                        });
                    },
                    fail: (err) => {
                        console.error('获取用户信息失败:', err);
                        wx.hideLoading();
                        wx.showToast({
                            title: '登录失败，请允许授权',
                            icon: 'none',
                            duration: 2000
                        });
                    }
                });
            } else {
                // Fallback to older getUserInfo method
                wx.getUserInfo({
                    success: (res) => {
                        this.setData({
                            userInfo: res.userInfo,
                            isLogged: true,
                            showSettings: false // 登录后关闭设置菜单
                        });

                        // Save user info to storage
                        wx.setStorageSync('user_info', res.userInfo);

                        // Get openid from cloud
                        this.loginAndGetOpenID();
                        wx.hideLoading();

                        // 显示学习进度
                        this.setData({
                            showLearningProgress: true
                        });
                    },
                    fail: (err) => {
                        console.error('获取用户信息失败:', err);
                        wx.hideLoading();

                        // Prompt user to authorize in settings
                        wx.showModal({
                            title: '授权提示',
                            content: '需要您的授权才能登录，请在设置中打开"用户信息"授权',
                            confirmText: '前往设置',
                            cancelText: '取消',
                            success: (res) => {
                                if (res.confirm) {
                                    wx.openSetting();
                                }
                            }
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Login process error:', error);
            wx.hideLoading();
            wx.showToast({
                title: '登录功能异常',
                icon: 'none',
                duration: 2000
            });
        }
    },

    // Removed: sendMessage, onMessageInput, scrollToBottom, saveChatHistory, loadChatHistory, clearChatHistory, activateDeepThinking, activateWebSearch, navigateToNewPage, initRecorderManager (now implicit)
});
