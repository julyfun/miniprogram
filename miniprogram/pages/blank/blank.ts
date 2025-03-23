// 消息类型定义
interface Message {
    _id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    type?: 'text' | 'image' | 'voice' | 'system';
    status?: 'sending' | 'success' | 'failed' | 'read';
    duration?: number; // 语音时长
}

// 聊天页面
Page({
    data: {
        statusBarHeight: 0,
        messages: [] as Message[],
        userInfo: {
            avatarUrl: '/assets/icons/default-avatar.svg'
        },
        contactInfo: {
            avatarUrl: '/assets/icons/default-avatar.svg'
        },
        scrollToView: '',
        inputMessage: '',
        showEmojiPanel: false,
        isRecording: false, // 是否正在录音
        recordingTime: 0, // 录音时长
        recordTimer: null as any, // 录音计时器
        hasUnread: false // 是否有未读消息
    },

    onLoad() {
        // 获取状态栏高度
        const systemInfo = wx.getSystemInfoSync();
        this.setData({
            statusBarHeight: systemInfo.statusBarHeight
        });

        // 初始化消息数据
        this.initMessages();
    },

    // 初始化消息数据
    initMessages() {
        const messages: Message[] = [
            {
                _id: 'msg1',
                role: 'assistant',
                content: '您好，我是AI助手，有什么可以帮您的吗？',
                timestamp: Date.now() - 120000, // 2分钟前
                type: 'text',
                status: 'read'
            }
        ];
        this.setData({ messages });
    },

    // 处理返回按钮点击
    handleBack() {
        wx.navigateBack({
            delta: 1,
            fail: () => {
                // 如果返回失败，就导航到主页
                wx.navigateTo({
                    url: '/pages/index/index'
                });
            }
        });
    },

    // 处理更多菜单点击
    handleMore() {
        wx.showActionSheet({
            itemList: ['清空聊天记录', '保存聊天记录', '设置'],
            success: (res) => {
                switch (res.tapIndex) {
                    case 0:
                        this.clearMessages();
                        break;
                    case 1:
                        this.saveMessages();
                        break;
                    case 2:
                        this.navigateToSettings();
                        break;
                }
            }
        });
    },

    // 清空聊天记录
    clearMessages() {
        wx.showModal({
            title: '提示',
            content: '确定要清空聊天记录吗？',
            success: (res) => {
                if (res.confirm) {
                    this.setData({ messages: [] });
                }
            }
        });
    },

    // 保存聊天记录
    saveMessages() {
        // 实现保存聊天记录逻辑
        wx.showToast({
            title: '保存成功',
            icon: 'success'
        });
    },

    // 导航到设置页面
    navigateToSettings() {
        wx.navigateTo({
            url: '/pages/settings/settings'
        });
    },

    // 处理消息点击
    handleTapMessage(e: any) {
        const { messageId, message } = e.detail;

        // 根据消息类型处理不同的点击行为
        switch (message.type) {
            case 'image':
                // 预览图片
                wx.previewImage({
                    urls: [message.content],
                    current: message.content
                });
                break;
            case 'voice':
                // 播放语音
                this.playVoice(message.content);
                break;
            default:
                console.log('点击了消息', messageId);
                break;
        }
    },

    // 播放语音
    playVoice(filePath: string) {
        const innerAudioContext = wx.createInnerAudioContext();
        innerAudioContext.src = filePath;
        innerAudioContext.play();

        innerAudioContext.onError((res) => {
            console.error('播放语音失败:', res);
            wx.showToast({
                title: '播放失败',
                icon: 'none'
            });
        });
    },

    // 处理消息长按
    handleLongPressMessage(e: any) {
        const { messageId, message } = e.detail;

        // 根据消息类型提供不同的操作选项
        let actionList = ['复制', '删除', '转发'];

        if (message.type === 'text') {
            actionList = ['复制', '删除', '转发'];
        } else if (message.type === 'image') {
            actionList = ['保存图片', '删除', '转发'];
        } else if (message.type === 'voice') {
            actionList = ['删除', '转发'];
        }

        wx.showActionSheet({
            itemList: actionList,
            success: (res) => {
                if (!message) return;

                switch (res.tapIndex) {
                    case 0:
                        if (message.type === 'text') {
                            // 复制文本
                            wx.setClipboardData({
                                data: message.content,
                                success: () => {
                                    wx.showToast({ title: '已复制' });
                                }
                            });
                        } else if (message.type === 'image') {
                            // 保存图片
                            wx.saveImageToPhotosAlbum({
                                filePath: message.content,
                                success: () => {
                                    wx.showToast({ title: '已保存' });
                                },
                                fail: () => {
                                    wx.showToast({ title: '保存失败', icon: 'none' });
                                }
                            });
                        }
                        break;
                    case 1: // 删除
                        this.deleteMessage(messageId);
                        break;
                    case 2: // 转发
                        // 实现转发逻辑
                        wx.showToast({ title: '转发功能暂未实现', icon: 'none' });
                        break;
                }
            }
        });
    },

    // 删除消息
    deleteMessage(messageId: string) {
        const messages = this.data.messages.filter(m => m._id !== messageId);
        this.setData({ messages });
    },

    // 处理头像点击
    handleTapAvatar(e: any) {
        const { isSelf } = e.detail;
        // 根据是否为自己的头像执行不同操作
        if (isSelf) {
            // 查看/编辑个人资料
            wx.navigateTo({
                url: '/pages/profile/profile'
            });
        } else {
            // 查看对方资料
            wx.showToast({
                title: '查看对方资料',
                icon: 'none'
            });
        }
    },

    // 处理滚动到底部
    handleScrollToBottom() {
        console.log('已滚动到底部');
    },

    // 确保所有消息加载后滚动到底部
    onReady() {
        setTimeout(() => {
            this.setData({
                scrollToView: this.data.messages[this.data.messages.length - 1]?._id || ''
            });
        }, 300);
    },

    // 处理输入框内容变化
    handleInput(e: any) {
        this.setData({
            inputMessage: e.detail.value
        });
    },

    // 处理发送消息
    handleSend() {
        const { inputMessage, messages } = this.data;
        if (!inputMessage.trim()) return;

        // 添加用户消息
        const userMessage: Message = {
            _id: 'user_' + Date.now(),
            role: 'user',
            content: inputMessage,
            timestamp: Date.now(),
            type: 'text',
            status: 'sending'
        };

        this.setData({
            messages: [...messages, userMessage],
            inputMessage: '',
            scrollToView: userMessage._id
        });

        // 滚动到底部
        this.ensureScrollToBottom(userMessage._id);

        // 模拟发送成功
        setTimeout(() => {
            const updatedMessages = this.data.messages.map(msg => {
                if (msg._id === userMessage._id) {
                    return { ...msg, status: 'success' as const };
                }
                return msg;
            });

            this.setData({ messages: updatedMessages });

            // 模拟助手回复
            setTimeout(() => {
                const assistantMessage: Message = {
                    _id: 'assistant_' + Date.now(),
                    role: 'assistant',
                    content: '我收到了您的消息: ' + inputMessage,
                    timestamp: Date.now(),
                    type: 'text',
                    status: 'read'
                };

                this.setData({
                    messages: [...this.data.messages, assistantMessage],
                    scrollToView: assistantMessage._id
                });

                // 滚动到底部
                this.ensureScrollToBottom(assistantMessage._id);
            }, 1000);
        }, 500);
    },

    // 确保滚动到底部
    ensureScrollToBottom(messageId: string) {
        this.setData({ scrollToView: messageId });

        // 双重保险：延迟再次滚动确保视图已更新
        setTimeout(() => {
            this.setData({ scrollToView: messageId });
        }, 200);
    },

    // 处理更多功能点击
    handleMoreFunction() {
        // 这个方法不再需要显示操作表，由 input-bar 组件内部处理
        console.log('点击了更多功能按钮');
    },

    // 处理功能项点击
    handleFeature(e: any) {
        const { feature } = e.detail;

        switch (feature) {
            case 'album':
                this.chooseAndSendImage();
                break;
            case 'camera':
                this.captureAndSendImage();
                break;
            case 'video':
                this.handleVideoCall();
                break;
            case 'location':
                this.handleSendLocation();
                break;
            case 'redpacket':
                this.handleSendRedPacket();
                break;
            case 'gift':
                this.handleSendGift();
                break;
            case 'transfer':
                this.handleTransfer();
                break;
            case 'voice':
                this.handleVoiceInput();
                break;
            default:
                console.log('未处理的功能:', feature);
        }
    },

    // 选择并发送图片
    chooseAndSendImage() {
        wx.chooseImage({
            count: 1,
            success: (res) => {
                const tempFilePath = res.tempFilePaths[0];
                // 在真实场景中，这里应该上传图片到服务器并获取URL

                // 添加图片消息
                const imageMessage: Message = {
                    _id: 'user_img_' + Date.now(),
                    role: 'user',
                    content: tempFilePath,
                    timestamp: Date.now(),
                    type: 'image',
                    status: 'sending'
                };

                this.setData({
                    messages: [...this.data.messages, imageMessage],
                    scrollToView: imageMessage._id
                });

                // 模拟发送成功
                setTimeout(() => {
                    const updatedMessages = this.data.messages.map(msg => {
                        if (msg._id === imageMessage._id) {
                            return { ...msg, status: 'success' as const };
                        }
                        return msg;
                    });

                    this.setData({ messages: updatedMessages });
                }, 1000);
            }
        });
    },

    // 拍照并发送图片
    captureAndSendImage() {
        wx.chooseImage({
            count: 1,
            sourceType: ['camera'],
            success: (res) => {
                const tempFilePath = res.tempFilePaths[0];

                // 添加图片消息
                const imageMessage: Message = {
                    _id: 'user_img_' + Date.now(),
                    role: 'user',
                    content: tempFilePath,
                    timestamp: Date.now(),
                    type: 'image',
                    status: 'sending'
                };

                this.setData({
                    messages: [...this.data.messages, imageMessage],
                    scrollToView: imageMessage._id
                });

                // 模拟发送成功
                setTimeout(() => {
                    const updatedMessages = this.data.messages.map(msg => {
                        if (msg._id === imageMessage._id) {
                            return { ...msg, status: 'success' as const };
                        }
                        return msg;
                    });

                    this.setData({ messages: updatedMessages });
                }, 1000);
            }
        });
    },

    // 视频通话
    handleVideoCall() {
        wx.showToast({
            title: '视频通话功能暂未实现',
            icon: 'none'
        });
    },

    // 发送位置
    handleSendLocation() {
        wx.showToast({
            title: '发送位置功能暂未实现',
            icon: 'none'
        });
    },

    // 发送红包
    handleSendRedPacket() {
        wx.showToast({
            title: '发送红包功能暂未实现',
            icon: 'none'
        });
    },

    // 发送礼物
    handleSendGift() {
        wx.showToast({
            title: '发送礼物功能暂未实现',
            icon: 'none'
        });
    },

    // 转账
    handleTransfer() {
        wx.showToast({
            title: '转账功能暂未实现',
            icon: 'none'
        });
    },

    // 语音输入
    handleVoiceInput() {
        wx.showToast({
            title: '语音输入功能暂未实现',
            icon: 'none'
        });
    },

    // 处理开始录音
    handleRecordStart() {
        this.setData({ isRecording: true, recordingTime: 0 });

        // 开始录音
        const recorderManager = wx.getRecorderManager();
        recorderManager.start({
            duration: 60000, // 最长录音时间，单位ms
            format: 'mp3'
        });

        // 开始计时
        const recordTimer = setInterval(() => {
            this.setData({
                recordingTime: this.data.recordingTime + 1
            });
        }, 1000);

        this.setData({ recordTimer });
    },

    // 处理结束录音
    handleRecordEnd() {
        if (!this.data.isRecording) return;

        this.setData({ isRecording: false });
        clearInterval(this.data.recordTimer);

        // 停止录音
        const recorderManager = wx.getRecorderManager();
        recorderManager.stop();

        // 监听录音结束事件
        recorderManager.onStop((res) => {
            const { tempFilePath } = res;

            // 添加语音消息
            const voiceMessage: Message = {
                _id: 'user_voice_' + Date.now(),
                role: 'user',
                content: tempFilePath,
                timestamp: Date.now(),
                type: 'voice',
                duration: this.data.recordingTime,
                status: 'sending'
            };

            this.setData({
                messages: [...this.data.messages, voiceMessage],
                scrollToView: voiceMessage._id,
                recordingTime: 0
            });

            // 模拟发送成功
            setTimeout(() => {
                const updatedMessages = this.data.messages.map(msg => {
                    if (msg._id === voiceMessage._id) {
                        return { ...msg, status: 'success' as const };
                    }
                    return msg;
                });

                this.setData({ messages: updatedMessages });
            }, 500);
        });
    },

    // 处理取消录音
    handleRecordCancel() {
        if (!this.data.isRecording) return;

        this.setData({ isRecording: false, recordingTime: 0 });
        clearInterval(this.data.recordTimer);

        // 停止并取消录音
        const recorderManager = wx.getRecorderManager();
        recorderManager.stop();
    },

    // 处理选择表情
    handleSelectEmoji(e: any) {
        const { emoji } = e.detail;
        const { inputMessage } = this.data;

        this.setData({
            inputMessage: inputMessage + emoji
        });
    },

    // 处理删除表情
    handleDeleteEmoji() {
        const { inputMessage } = this.data;
        if (inputMessage.length === 0) return;

        // 删除最后一个字符
        this.setData({
            inputMessage: inputMessage.slice(0, -1)
        });
    }
})