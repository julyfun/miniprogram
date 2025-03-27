// 事件类型定义
interface EventMessage {
    type: string; // 事件类型，如 'message'
    role: string; // 角色，'self' 或 'opponent'
    content: string; // 内容
    timestamp: number; // 时间戳，单位毫秒
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
                const data = dataUtils.getDataById(source);

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
                currentEventIndex: 0,
                isComplete: false,
                startTimeText: this.formatTimeText(new Date())
            });

            // 如果设置了自动播放，则开始播放
            if (this.properties.autoPlay) {
                this.startPlayback();
            }
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

                this.setData({
                    messages,
                    currentEventIndex: currentEventIndex + 1,
                    scrollToView: `msg-${messages.length - 1}`
                });

                // 如果是用户消息且启用了交互模式，等待用户输入
                if (event.role === 'self' && this.properties.interactionMode) {
                    this.setData({
                        isPlaying: false,
                        allowInput: true
                    });
                    return;
                }

                // 获取下一个事件的延迟时间
                let nextDelay = 1000; // 默认1秒
                if (currentEventIndex < allEvents.length - 1) {
                    const nextEvent = allEvents[currentEventIndex + 1];
                    nextDelay = Math.max(500, (nextEvent.timestamp - event.timestamp) / this.properties.playbackSpeed);
                }

                // 设置定时器播放下一个事件
                setTimeout(() => {
                    this.playNextEvent();
                }, nextDelay);
            } else {
                // 其他类型的事件（未来扩展）
                this.setData({
                    currentEventIndex: currentEventIndex + 1
                });
                this.playNextEvent();
            }
        },

        // 暂停播放
        pausePlayback() {
            this.setData({
                isPlaying: false
            });
            this.triggerEvent('playPause');
        },

        // 切换播放/暂停
        onTogglePlay() {
            if (this.data.isPlaying) {
                this.pausePlayback();
            } else {
                this.startPlayback();
            }
        },

        // 重新开始
        onRestart() {
            this.setData({
                messages: [],
                currentEventIndex: 0,
                isPlaying: false,
                isComplete: false,
                inputText: '',
                allowInput: false,
                scrollToView: 'message-bottom'
            });

            // 触发重新开始事件
            this.triggerEvent('restart');

            // 如果设置了自动播放，则开始播放
            if (this.properties.autoPlay) {
                setTimeout(() => {
                    this.startPlayback();
                }, 500);
            }
        },

        // 跳过到下一个事件
        onSkipNext() {
            if (this.data.currentEventIndex < this.data.allEvents.length) {
                this.playNextEvent();
            }
        },

        // 返回
        onBack() {
            this.triggerEvent('back');
        },

        // 输入框变化
        onInputChange(e: WechatMiniprogram.Input) {
            this.setData({
                inputText: e.detail.value
            });
        },

        // 发送消息（用于交互模式）
        onSendMessage() {
            if (!this.data.inputText.trim() || !this.data.allowInput) return;

            // 添加用户输入的消息
            const userMessage = {
                type: 'message',
                role: 'self',
                content: this.data.inputText,
                timestamp: Date.now()
            };

            const messages = [...this.data.messages, userMessage];

            this.setData({
                messages,
                inputText: '',
                allowInput: false,
                isPlaying: true,
                scrollToView: `msg-${messages.length - 1}`
            });

            // 继续播放下一个事件
            setTimeout(() => {
                this.playNextEvent();
            }, 1000);
        }
    },

    /**
     * 组件生命周期
     */
    lifetimes: {
        attached() {
            // 如果有设置数据源，则加载数据
            if (this.properties.dataSource) {
                this.loadData(this.properties.dataSource);
            }
        },
        detached() {
            // 组件销毁时，确保暂停播放
            this.pausePlayback();
        }
    }
}); 