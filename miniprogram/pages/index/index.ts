interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface IPageData {
    messages: Message[];
    inputMessage: string;
    scrollToView: string;
    isLoading: boolean;
}

Page<IPageData, WechatMiniprogram.IAnyObject>({
    data: {
        messages: [],
        inputMessage: '',
        scrollToView: 'message-bottom',
        isLoading: false
    },

    onLoad() {
        // 加载历史聊天记录
        this.loadChatHistory();
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
            isLoading: true
        });

        // 滚动到底部
        this.scrollToBottom();

        // 调用 Deepseek API
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
                    ...this.data.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                ],
                temperature: 0.7,
                max_tokens: 1000
            },
            success: (res: any) => {
                // 处理 API 响应
                if (res.statusCode === 200 && res.data.choices && res.data.choices.length > 0) {
                    const aiResponse = res.data.choices[0].message.content;
                    
                    // 添加 AI 响应到消息列表
                    const aiMessage: Message = {
                        role: 'assistant',
                        content: aiResponse
                    };
                    
                    this.setData({
                        messages: [...this.data.messages, aiMessage],
                        isLoading: false
                    });
                    
                    // 保存聊天历史
                    this.saveChatHistory();
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
        // 添加错误消息
        const errorMessage: Message = {
            role: 'assistant',
            content: `抱歉，${errorMsg}，请稍后再试。`
        };
        
        this.setData({
            messages: [...this.data.messages, errorMessage],
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
    }
}); 
