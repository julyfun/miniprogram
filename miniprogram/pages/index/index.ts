interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface IPageData {
    messages: Message[];
    inputMessage: string;
    scrollToView: string;
    isLoading: boolean;
    currentAssistantMessage: string;
}

Page<IPageData, WechatMiniprogram.IAnyObject>({
    data: {
        messages: [],
        inputMessage: '',
        scrollToView: 'message-bottom',
        isLoading: false,
        currentAssistantMessage: ''
    },

    onLoad() {
        // 加载历史聊天记录
        this.loadChatHistory();

        // 如果没有聊天记录，添加初始欢迎消息
        if (this.data.messages.length === 0) {
            this.setData({
                messages: [{
                    role: 'assistant',
                    content: '你好！很高兴见到你，有什么我可以帮忙的吗？'
                }]
            });
        }
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
            role: 'user',
            content: inputMessage
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
            role: 'assistant',
            content: ''
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
                role: 'assistant',
                content: `抱歉，${errorMsg}，请稍后再试。`
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

    // 新增页面导航
    navigateToNewPage() {
        wx.navigateTo({
            url: '/pages/blank/blank',
            success: () => {
                console.log('成功导航到空白页面');
            },
            fail: (error) => {
                console.error('导航失败:', error);
                wx.showToast({
                    title: '页面跳转失败',
                    icon: 'none',
                    duration: 2000
                });
            }
        });
    }
}); 
