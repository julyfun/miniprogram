interface Message {
    _id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    type?: 'text' | 'image' | 'voice' | 'system';
    status?: 'sending' | 'success' | 'failed' | 'read';
}

interface IPageData {
    messages: Message[];
    inputMessage: string;
    scrollToView: string;
    isLoading: boolean;
    currentAssistantMessage: string;
    isRecording: boolean;
    cancelRecord: boolean;
    startY: number;
}

Page<IPageData, WechatMiniprogram.IAnyObject>({
    data: {
        messages: [],
        inputMessage: '',
        scrollToView: 'message-bottom',
        isLoading: false,
        currentAssistantMessage: '',
        isRecording: false,
        cancelRecord: false,
        startY: 0
    },

    // 录音管理器
    recorderManager: null as WechatMiniprogram.RecorderManager | null,

    onLoad() {
        // 初始化录音管理器
        this.initRecorderManager();

        // 加载历史聊天记录
        this.loadChatHistory();

        // 如果没有聊天记录，添加初始欢迎消息
        if (this.data.messages.length === 0) {
            this.setData({
                messages: [{
                    _id: 'welcome_' + Date.now(),
                    role: 'assistant',
                    content: '你好！很高兴见到你，有什么我可以帮忙的吗？',
                    timestamp: Date.now()
                }]
            });
        }
    },

    // 初始化录音管理器
    initRecorderManager() {
        this.recorderManager = wx.getRecorderManager();

        // 设置录音相关事件处理
        this.recorderManager.onStart(() => {
            console.log('录音开始');
        });

        this.recorderManager.onStop((res: WechatMiniprogram.OnStopCallbackResult) => {
            console.log('录音结束', res);

            // 如果取消录音，则不处理
            if (this.data.cancelRecord) {
                console.log('录音已取消');
                this.setData({
                    isRecording: false,
                    cancelRecord: false
                });
                return;
            }

            // 显示加载中
            wx.showLoading({
                title: '语音识别中...'
            });

            // 将录音文件传给语音识别接口
            this.recognizeSpeech(res.tempFilePath);
        });

        this.recorderManager.onError((error: { errMsg: string }) => {
            console.error('录音错误:', error);
            wx.showToast({
                title: '录音失败: ' + error.errMsg,
                icon: 'none',
                duration: 2000
            });
            this.setData({
                isRecording: false,
                cancelRecord: false
            });
        });

        this.recorderManager.onInterruptionBegin(() => {
            console.log('录音被中断');
            if (this.data.isRecording) {
                this.setData({
                    isRecording: false
                });
                wx.showToast({
                    title: '录音被中断',
                    icon: 'none'
                });
            }
        });
    },

    // 切换录音状态
    toggleVoiceRecording() {
        if (this.data.isRecording) {
            // 如果正在录音，则停止录音
            this.endRecording();
        } else {
            // 如果未录音，则开始录音
            this.startRecording();
        }
    },

    // 开始录音
    startRecording() {
        console.log('开始录音');
        // 初始化录音状态
        this.setData({
            isRecording: true
        });

        // 设置录音参数
        if (this.recorderManager) {
            console.log('调用recorder.start()');
            this.recorderManager.start({
                duration: 60000, // 最长录音时间，单位ms
                sampleRate: 16000, // 采样率
                numberOfChannels: 1, // 录音通道数
                encodeBitRate: 48000, // 编码码率
                format: 'mp3', // 音频格式
                frameSize: 50 // 指定帧大小，单位KB
            });
        } else {
            console.error('录音管理器未初始化');
            wx.showToast({
                title: '录音功能初始化失败',
                icon: 'none'
            });
            this.setData({
                isRecording: false
            });
        }
    },

    // 结束录音
    endRecording() {
        console.log('结束录音');
        if (!this.data.isRecording) return;

        // 停止录音
        if (this.recorderManager) {
            console.log('调用recorder.stop()');
            this.recorderManager.stop();
        } else {
            console.error('录音管理器未初始化');
            // 手动重置状态
            this.setData({
                isRecording: false
            });
        }
    },

    // 取消录音
    cancelVoiceRecording() {
        console.log('取消录音');
        // 设置取消标志
        this.setData({
            cancelRecord: true
        });

        // 停止录音
        if (this.recorderManager) {
            this.recorderManager.stop();
        }

        // 重置状态
        setTimeout(() => {
            this.setData({
                isRecording: false,
                cancelRecord: false
            });
        }, 100);
    },

    // 语音识别
    recognizeSpeech(filePath: string) {
        // 如果取消录音，则不进行识别
        if (this.data.cancelRecord) {
            console.log('录音已取消，不进行识别');
            this.setData({
                isRecording: false,
                cancelRecord: false
            });
            return;
        }

        // 隐藏加载中
        wx.hideLoading();

        // 重置录音状态
        this.setData({
            isRecording: false
        });

        // 提示用户
        wx.showModal({
            title: '语音识别功能说明',
            content: '实际应用中需要配置服务端接口来处理语音识别。语音已成功录制，文件路径：' + filePath,
            showCancel: false,
            success: () => {
                console.log('用户已了解语音识别需要服务端支持');

                // 演示用途：使用静态文本模拟语音识别结果
                this.setData({
                    inputMessage: '这是语音识别的模拟结果文本。在真实环境中，这里会是语音转文字的实际内容。'
                });

                // 由于这是演示，自动发送这个模拟的识别结果
                this.sendMessage();
            }
        });
    },

    // 输入消息处理
    onMessageInput(e: WechatMiniprogram.Input) {
        this.setData({
            inputMessage: e.detail.value
        });
    },

    // 发送消息到 Deepseek API
    sendMessage() {
        const { inputMessage, messages, isLoading } = this.data;

        // 检查是否正在加载或消息为空
        if (isLoading || !inputMessage.trim()) {
            return;
        }

        // 添加用户消息
        const userMessage: Message = {
            _id: 'user_' + Date.now(),
            role: 'user',
            content: inputMessage,
            timestamp: Date.now()
        };

        this.setData({
            messages: [...messages, userMessage],
            inputMessage: '',
            isLoading: true,
            currentAssistantMessage: ''
        });

        // 滚动到底部
        this.scrollToBottom();

        // 创建临时的助手消息（空内容）用于显示打字效果
        const tempAssistantMessage: Message = {
            _id: 'assistant_' + Date.now(),
            role: 'assistant',
            content: '',
            timestamp: Date.now()
        };

        this.setData({
            messages: [...this.data.messages, tempAssistantMessage]
        });

        // 调用 Deepseek API（使用流式响应）
        wx.request({
            url: 'https://api.deepseek.com/v1/chat/completions',
            method: 'POST',
            header: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-09f11c2631f544a6af0456d5d058607b'
            },
            data: {
                model: 'deepseek-chat',
                messages: [
                    ...this.data.messages.slice(0, -1).map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                ],
                temperature: 0.7,
                max_tokens: 1000,
                stream: true
            },
            responseType: 'text',
            success: (res: any) => {
                // 检查是否接收到文本响应
                if (res.statusCode === 200 && res.data) {
                    try {
                        // 将响应文本按行分割，每行是一个 SSE 事件
                        const lines = res.data.split('\n');
                        let fullContent = '';

                        for (const line of lines) {
                            // 忽略空行
                            if (!line.trim()) continue;

                            // 检查是否是数据行，格式为 "data: {...}"
                            if (line.startsWith('data:')) {
                                const jsonStr = line.substring(5).trim();

                                // 忽略 [DONE] 信号
                                if (jsonStr === '[DONE]') continue;

                                try {
                                    const chunk = JSON.parse(jsonStr);

                                    // 提取增量内容
                                    if (chunk.choices && chunk.choices.length > 0) {
                                        const delta = chunk.choices[0].delta;
                                        if (delta && delta.content) {
                                            fullContent += delta.content;

                                            // 更新当前消息
                                            const updatedMessages = [...this.data.messages];
                                            updatedMessages[updatedMessages.length - 1].content = fullContent;

                                            this.setData({
                                                messages: updatedMessages,
                                                currentAssistantMessage: fullContent
                                            });

                                            // 滚动到底部以显示新的内容
                                            this.scrollToBottom();
                                        }
                                    }
                                } catch (e) {
                                    console.error('解析 SSE 数据失败:', e, jsonStr);
                                }
                            }
                        }

                        // 完成后更新状态
                        this.setData({
                            isLoading: false
                        });

                        // 保存聊天历史
                        this.saveChatHistory();
                    } catch (error) {
                        console.error('处理流式响应失败:', error);
                        this.handleApiError('处理响应失败');
                    }
                } else {
                    // 处理错误
                    this.handleApiError('无法获取响应');
                }
            },
            fail: (error) => {
                console.error('API 请求失败:', error);
                this.handleApiError('网络请求失败');
            }
        });
    },

    // 滚动到底部
    scrollToBottom() {
        setTimeout(() => {
            this.setData({
                scrollToView: 'message-bottom'
            });
        }, 100);
    },

    // 处理 API 错误
    handleApiError(errorMsg: string) {
        // 更新最后一条消息为错误消息
        const updatedMessages = [...this.data.messages];
        if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === 'assistant') {
            updatedMessages[updatedMessages.length - 1].content = `抱歉，${errorMsg}，请稍后再试。`;
        } else {
            // 添加错误消息
            updatedMessages.push({
                _id: 'error_' + Date.now(),
                role: 'assistant',
                content: `抱歉，${errorMsg}，请稍后再试。`,
                timestamp: Date.now()
            });
        }

        this.setData({
            messages: updatedMessages,
            isLoading: false
        });

        // 显示错误提示
        wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
        });
    },

    // 保存聊天历史
    saveChatHistory() {
        wx.setStorageSync('chatHistory', this.data.messages);
    },

    // 加载聊天历史
    loadChatHistory() {
        try {
            const chatHistory = wx.getStorageSync('chatHistory');
            if (chatHistory && chatHistory.length) {
                this.setData({ messages: chatHistory });
                this.scrollToBottom();
            }
        } catch (e) {
            console.error('加载聊天历史失败:', e);
        }
    },

    // 清空聊天历史
    clearChatHistory() {
        wx.showModal({
            title: '确认清空',
            content: '确定要清空所有聊天记录吗？',
            success: (res) => {
                if (res.confirm) {
                    this.setData({ messages: [] });
                    wx.removeStorageSync('chatHistory');
                    wx.showToast({
                        title: '已清空聊天记录',
                        icon: 'success'
                    });
                }
            }
        });
    },

    // 深度思考模式
    activateDeepThinking() {
        wx.showToast({
            title: '深度思考模式已激活',
            icon: 'none',
            duration: 2000
        });
        // 这里可以添加深度思考模式的实际逻辑
    },

    // 联网搜索功能
    activateWebSearch() {
        wx.showToast({
            title: '联网搜索已激活',
            icon: 'none',
            duration: 2000
        });
        // 这里可以添加联网搜索的实际逻辑
    },

    /**
     * 导航到新页面，展示不同场景
     */
    navigateToNewPage() {
        // 获取可用的对话数据列表
        const dataUtils = require('../../data/data_utils');
        const dataList = dataUtils.getAvailableDataList();

        // 构建场景选项
        const items = dataList.map((item: { title: string }) => `${item.title}`);

        // 显示选择对话框
        wx.showActionSheet({
            itemList: items,
            success: (res) => {
                // 用户选择了某个场景
                const selectedIndex = res.tapIndex;
                const selectedDataId = dataList[selectedIndex].id;

                // 导航到事件演示页面，并传递选择的数据ID
                wx.navigateTo({
                    url: `/pages/event-demo/event-demo?id=${selectedDataId}`,
                    success: () => {
                        console.log('成功导航到演示页面');
                    },
                    fail: (err) => {
                        console.error('导航失败:', err);
                        wx.showToast({
                            title: '导航失败',
                            icon: 'none'
                        });
                    }
                });
            },
            fail: () => {
                // 用户取消选择
                console.log('用户取消了选择');
            }
        });
    }
}); 
