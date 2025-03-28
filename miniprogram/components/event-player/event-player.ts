// 事件类型定义
interface EventMessage {
    type: string; // 事件类型，如 'message'
    role: string; // 角色，'self' 或 'opponent'
    content: string; // 内容
    timestamp: number; // 时间戳，单位毫秒
}

// 格式化后的消息类型（适配chat-container组件）
interface FormattedMessage {
    _id: string; // 消息ID，格式为 msg-{index}
    type: string; // 消息类型，如 'text'
    content: string; // 内容
    role: string; // 角色，'user' 或 'assistant'
    timestamp: number; // 时间戳
}

// 元数据定义
interface Metadata {
    title: string; // 对话标题
    description: string; // 描述
    opponent: {
        nickname: string; // 对方昵称
        avatarUrl: string; // 对方头像
    };
    createdAt: string; // 创建时间
    updatedAt: string; // 更新时间
    tags: string[]; // 标签
}

// 事件数据定义
interface EventData {
    metadata: Metadata;
    events: EventMessage[];
}

Component({
    /**
     * 组件的属性列表
     */
    properties: {
        // 数据ID，用于从数据工具中加载对应的对话数据
        dataSource: {
            type: String,
            value: '',
            observer: function (newVal) {
                if (newVal) {
                    this.loadData(newVal);
                }
            }
        },
        // 事件播放速度，单位为毫秒乘数（1表示原速，2表示加速2倍）
        playbackSpeed: {
            type: Number,
            value: 1
        },
        // 是否自动开始播放
        autoPlay: {
            type: Boolean,
            value: true
        },
        // 是否允许用户输入
        interactionMode: {
            type: Boolean,
            value: false
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        // 元数据
        metadata: {
            title: '',
            description: '',
            opponent: {
                nickname: '对方',
                avatarUrl: '/assets/icons/default-avatar.svg'
            },
            createdAt: '',
            updatedAt: '',
            tags: [] as string[]
        },
        // 原始事件数据
        allEvents: [] as EventMessage[],
        // 已显示的消息
        messages: [] as EventMessage[],
        // 格式化后的消息，用于chat-container
        formattedMessages: [] as FormattedMessage[],
        // 当前事件索引
        currentEventIndex: 0,
        // 是否正在播放
        isPlaying: false,
        // 是否完成播放
        isComplete: false,
        // 输入文本
        inputText: '',
        // 是否允许输入
        allowInput: false,
        // 滚动视图ID
        scrollToView: 'message-bottom',
        // 开始时间文本
        startTimeText: '今天 12:00'
    },

    /**
     * 组件的方法列表
     */
    methods: {
        // 加载数据
        loadData(source: string) {
            // 显示加载中提示
            wx.showLoading({
                title: '加载中...',
            });

            try {
                // 从数据工具加载
                const dataUtils = require('../../data/data_utils');
                const data = dataUtils.getDataModule(source);

                if (data) {
                    this.processData(data);
                } else {
                    wx.showToast({
                        title: '未找到数据',
                        icon: 'none'
                    });
                }
            } catch (e) {
                console.error('Failed to load data:', e);
                wx.showToast({
                    title: '加载失败',
                    icon: 'none'
                });
            } finally {
                wx.hideLoading();
            }
        },

        // 处理数据
        processData(data: EventData) {
            if (!data || !data.metadata || !data.events) {
                wx.showToast({
                    title: '数据格式错误',
                    icon: 'none'
                });
                return;
            }

            this.setData({
                metadata: data.metadata,
                allEvents: data.events,
                messages: [],
                formattedMessages: [],
                currentEventIndex: 0,
                isComplete: false,
                startTimeText: this.formatTimeText(new Date())
            });

            // 如果设置了自动播放，则开始播放
            if (this.properties.autoPlay) {
                this.startPlayback();
            }
        },

        // 格式化消息，将原始消息格式转换为chat-container所需的格式
        formatMessages(messages: EventMessage[]): FormattedMessage[] {
            return messages.map((msg, index) => ({
                _id: `msg-${index}`,
                type: 'text', // 默认为文本类型
                content: msg.content,
                role: msg.role === 'self' ? 'user' : 'assistant', // 将self转为user，将opponent转为assistant
                timestamp: msg.timestamp
            }));
        },

        // 格式化时间显示
        formatTimeText(date: Date): string {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `今天 ${hours}:${minutes}`;
        },

        // 开始播放
        startPlayback() {
            if (this.data.isPlaying) return;

            this.setData({
                isPlaying: true
            });

            this.triggerEvent('playStart');
            this.playNextEvent();
        },

        // 播放下一个事件
        playNextEvent() {
            const { currentEventIndex, allEvents, isPlaying } = this.data;

            // 如果暂停或已完成，则不继续
            if (!isPlaying || currentEventIndex >= allEvents.length) {
                if (currentEventIndex >= allEvents.length) {
                    this.setData({
                        isComplete: true,
                        isPlaying: false
                    });
                    this.triggerEvent('complete');
                }
                return;
            }

            // 获取当前事件
            const event = allEvents[currentEventIndex];

            // 根据事件类型处理
            if (event.type === 'message') {
                // 添加消息
                const messages = [...this.data.messages, event];
                const formattedMessages = this.formatMessages(messages);

                this.setData({
                    messages,
                    formattedMessages,
                    currentEventIndex: currentEventIndex + 1,
                    scrollToView: `msg-${messages.length - 1}`
                });

                // 计算下一条消息的延迟
                const nextEvent = allEvents[currentEventIndex + 1];
                if (nextEvent) {
                    // 基于消息长度和播放速度计算延迟
                    const content = event.content;
                    const baseDelay = content.length * 100; // 每个字符大约需要100毫秒
                    const adjustedDelay = Math.max(500, Math.min(3000, baseDelay)) / this.properties.playbackSpeed;

                    setTimeout(() => {
                        this.playNextEvent();
                    }, adjustedDelay);
                } else {
                    // 已经是最后一条消息
                    this.setData({
                        isComplete: true,
                        isPlaying: false,
                        allowInput: this.properties.interactionMode
                    });
                    this.triggerEvent('complete');
                }
            } else {
                // 其他类型的事件可以在这里处理
                // 暂时直接跳到下一个
                this.setData({
                    currentEventIndex: currentEventIndex + 1
                });
                setTimeout(() => {
                    this.playNextEvent();
                }, 0);
            }
        },

        // 暂停播放
        pausePlayback() {
            this.setData({
                isPlaying: false
            });
            this.triggerEvent('playPause');
        },

        // 切换播放状态
        onTogglePlay() {
            if (this.data.isPlaying) {
                this.pausePlayback();
            } else {
                this.startPlayback();
            }
        },

        // 重新开始播放
        onRestart() {
            wx.showModal({
                title: '提示',
                content: '确定要重新开始演示吗？',
                success: (res) => {
                    if (res.confirm) {
                        // 重置所有消息和状态
                        this.setData({
                            messages: [],
                            formattedMessages: [],
                            currentEventIndex: 0,
                            isComplete: false,
                            isPlaying: false,
                            inputText: '',
                            allowInput: false,
                            scrollToView: 'message-bottom'
                        });

                        // 如果自动播放或者之前正在播放，则开始播放
                        if (this.properties.autoPlay) {
                            setTimeout(() => {
                                this.startPlayback();
                            }, 500);
                        }
                    }
                }
            });
        },

        // 跳到下一条消息
        onSkipNext() {
            if (this.data.currentEventIndex < this.data.allEvents.length) {
                this.playNextEvent();
            }
        },

        // 返回上一页
        onBack() {
            this.triggerEvent('back');
        },

        // 处理输入变化
        onInputChange(e: WechatMiniprogram.Input) {
            this.setData({
                inputText: e.detail.value
            });
        },

        // 发送消息
        onSendMessage() {
            const { inputText, allowInput } = this.data;

            // 如果不允许输入或输入内容为空，则不处理
            if (!allowInput || !inputText.trim()) {
                return;
            }

            // 创建新消息
            const selfMessage: EventMessage = {
                type: 'message',
                role: 'self',
                content: inputText.trim(),
                timestamp: Date.now()
            };

            // 添加到消息列表
            const messages = [...this.data.messages, selfMessage];
            const formattedMessages = this.formatMessages(messages);

            this.setData({
                messages,
                formattedMessages,
                inputText: '',
                scrollToView: `msg-${messages.length - 1}`
            });

            // 触发发送消息事件
            this.triggerEvent('sendMessage', {
                message: selfMessage
            });
        },

        // 组件生命周期函数
        attached() {
            // 在这里可以初始化一些东西
        },

        // 组件卸载时清理资源
        detached() {
            // 清理资源
        }
    }
}); 