// 事件类型定义
interface EventMessage {
    id: string;           // 事件唯一标识符
    type: string;         // 事件类型，如 'message' 或 'assessment'
    role: string;         // 角色，'self' 或 'opponent'
    content: string;      // 内容
    timestamp: number;    // 时间戳，单位毫秒
    options?: string[];   // 选项，用于assessment事件
    correctAnswer?: string; // 正确答案，用于assessment事件
    explanation?: string;   // 解释，用于assessment事件
    transitions?: EventTransition[]; // 过渡条件，用于有向图跳转
    nextId?: string;      // 简单跳转的下一个事件ID (用于没有条件的转换)
}

// 过渡条件定义
interface EventTransition {
    targetId: string;     // 目标事件ID
    conditions: EventCondition[]; // 跳转条件列表
}

// 条件定义
interface EventCondition {
    type: string;         // 条件类型，如 'correctAnswer', 'messageCount', 'custom'
    param?: string;       // 额外参数
    value: any;           // 条件值
    operator: string;     // 运算符: '==', '!=', '>', '<', '>=', '<='
}

// 格式化后的消息类型（适配chat-container组件）
interface FormattedMessage {
    _id: string;          // 消息ID，格式为 msg-{index}
    type: string;         // 消息类型，如 'text'
    content: string;      // 内容
    role: string;         // 角色，'user' 或 'assistant'
    timestamp: number;    // 时间戳
}

// 元数据定义
interface Metadata {
    title: string;        // 对话标题
    description: string;  // 描述
    opponent: {
        nickname: string; // 对方昵称
        avatarUrl: string;// 对方头像
    };
    createdAt: string;    // 创建时间
    updatedAt: string;    // 更新时间
    tags: string[];       // 标签
    startId?: string;     // 开始事件ID（用于有向图的起点）
}

// 事件数据定义
interface EventData {
    metadata: Metadata;
    events: EventMessage[];
}

// 条件状态数据结构
interface ConditionState {
    messageCount: number;           // 用户消息计数
    correctAnswerCount: number;     // 正确回答计数
    wrongAnswerCount: number;       // 错误回答计数
    lastEventId: string | null;     // 最后一个事件ID
    userAnswers: Record<string, string>; // 用户答案，key是事件ID
    customFlags: Record<string, any>; // 自定义标志
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
            tags: [] as string[],
            startId: undefined
        } as Metadata,
        // 原始事件数据
        allEvents: [] as EventMessage[],
        // 事件索引查询表
        eventMap: {} as Record<string, EventMessage>,
        // 已显示的消息
        messages: [] as EventMessage[],
        // 格式化后的消息，用于chat-container
        formattedMessages: [] as FormattedMessage[],
        // 当前事件索引
        currentEventIndex: 0,
        // 当前事件ID
        currentEventId: '',
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
        startTimeText: '今天 12:00',
        // 评估对话框
        showAssessment: false,
        // 当前评估事件
        currentAssessment: null as EventMessage | null,
        // 用户选择的答案
        userAnswer: '',
        // 是否已显示结果
        showAssessmentResult: false,
        // 条件状态
        conditionState: {
            messageCount: 0,
            correctAnswerCount: 0,
            wrongAnswerCount: 0,
            lastEventId: null,
            userAnswers: {},
            customFlags: {}
        } as ConditionState
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

            // 构建事件映射表
            const eventMap: Record<string, EventMessage> = {};
            data.events.forEach(event => {
                // 如果没有ID，生成一个唯一ID
                if (!event.id) {
                    event.id = `event-${Math.random().toString(36).substring(2, 9)}`;
                }
                eventMap[event.id] = event;
            });

            // 初始化条件状态
            const conditionState: ConditionState = {
                messageCount: 0,
                correctAnswerCount: 0,
                wrongAnswerCount: 0,
                lastEventId: null,
                userAnswers: {},
                customFlags: {}
            };

            this.setData({
                metadata: data.metadata,
                allEvents: data.events,
                eventMap,
                messages: [],
                formattedMessages: [],
                currentEventIndex: 0,
                currentEventId: data.metadata.startId || data.events[0]?.id || '',
                isComplete: false,
                conditionState,
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

        // 评估条件是否满足
        evaluateCondition(condition: EventCondition): boolean {
            const { type, param, value, operator } = condition;
            const { conditionState } = this.data;

            let leftValue;

            // 获取条件左侧值
            switch (type) {
                case 'messageCount':
                    leftValue = conditionState.messageCount;
                    break;
                case 'correctAnswerCount':
                    leftValue = conditionState.correctAnswerCount;
                    break;
                case 'wrongAnswerCount':
                    leftValue = conditionState.wrongAnswerCount;
                    break;
                case 'correctAnswer':
                    const eventId = param || conditionState.lastEventId;
                    leftValue = eventId ? conditionState.userAnswers[eventId] === this.data.eventMap[eventId]?.correctAnswer : false;
                    break;
                case 'custom':
                    leftValue = param ? conditionState.customFlags[param] : undefined;
                    break;
                default:
                    return false;
            }

            // 评估条件
            switch (operator) {
                case '==':
                    return leftValue == value;
                case '!=':
                    return leftValue != value;
                case '>':
                    return leftValue > value;
                case '<':
                    return leftValue < value;
                case '>=':
                    return leftValue >= value;
                case '<=':
                    return leftValue <= value;
                default:
                    return false;
            }
        },

        // 确定下一个事件
        getNextEventId(event: EventMessage): string | null {
            // 如果有直接指定的nextId，优先使用
            if (event.nextId) {
                return event.nextId;
            }

            // 如果有transitions，处理条件转换
            if (event.transitions && event.transitions.length > 0) {
                for (const transition of event.transitions) {
                    if (!transition.conditions || transition.conditions.length === 0) {
                        // 没有条件，直接使用
                        return transition.targetId;
                    }

                    // 检查所有条件是否满足
                    const allConditionsMet = transition.conditions.every(condition =>
                        this.evaluateCondition(condition)
                    );

                    if (allConditionsMet) {
                        return transition.targetId;
                    }
                }
            }

            // 没有下一个事件
            return null;
        },

        // 播放下一个事件
        playNextEvent() {
            const { currentEventId, eventMap, isPlaying } = this.data;

            // 如果暂停则不继续
            if (!isPlaying) {
                return;
            }

            // 如果没有当前事件ID，则结束
            if (!currentEventId || !eventMap[currentEventId]) {
                this.setData({
                    isComplete: true,
                    isPlaying: false
                });
                this.triggerEvent('complete');
                return;
            }

            // 获取当前事件
            const event = eventMap[currentEventId];

            // 根据事件类型处理
            if (event.type === 'message') {
                // 添加消息
                const messages = [...this.data.messages, event];
                const formattedMessages = this.formatMessages(messages);

                this.setData({
                    messages,
                    formattedMessages,
                    scrollToView: `msg-${messages.length - 1}`
                });

                // 更新条件状态
                const conditionState = { ...this.data.conditionState };
                conditionState.lastEventId = event.id;

                // 更新到数据
                this.setData({ conditionState });

                // 获取下一个事件ID
                const nextEventId = this.getNextEventId(event);

                if (nextEventId) {
                    // 基于消息长度和播放速度计算延迟
                    const content = event.content;
                    const baseDelay = content.length * 100; // 每个字符大约需要100毫秒
                    const adjustedDelay = Math.max(500, Math.min(3000, baseDelay)) / this.properties.playbackSpeed;

                    this.setData({
                        currentEventId: nextEventId
                    });

                    setTimeout(() => {
                        this.playNextEvent();
                    }, adjustedDelay);
                } else {
                    // 没有下一个事件，结束播放
                    this.setData({
                        isComplete: true,
                        isPlaying: false,
                        allowInput: this.properties.interactionMode
                    });
                    this.triggerEvent('complete');
                }
            } else if (event.type === 'assessment') {
                // 处理评估事件
                this.setData({
                    showAssessment: true,
                    currentAssessment: event,
                    userAnswer: '',
                    showAssessmentResult: false,
                    isPlaying: false
                });
            } else if (event.type === 'task_complete') {
                // 处理任务完成事件
                wx.showToast({
                    title: event.content || '任务完成！',
                    icon: 'success',
                    duration: 2000
                });

                // 获取下一个事件ID
                const nextEventId = this.getNextEventId(event);

                if (nextEventId) {
                    this.setData({
                        currentEventId: nextEventId
                    });

                    setTimeout(() => {
                        this.playNextEvent();
                    }, 2000);
                } else {
                    // 没有下一个事件，结束播放
                    this.setData({
                        isComplete: true,
                        isPlaying: false
                    });
                    this.triggerEvent('complete');
                }
            } else {
                // 其他类型的事件可以在这里处理
                // 暂时直接获取下一个
                const nextEventId = this.getNextEventId(event);

                if (nextEventId) {
                    this.setData({
                        currentEventId: nextEventId
                    });

                    setTimeout(() => {
                        this.playNextEvent();
                    }, 0);
                } else {
                    // 没有下一个事件，结束播放
                    this.setData({
                        isComplete: true,
                        isPlaying: false
                    });
                    this.triggerEvent('complete');
                }
            }
        },

        // 暂停播放
        pausePlayback() {
            if (!this.data.isPlaying) return;

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

        // 重新开始事件序列
        onRestart() {
            wx.showLoading({
                title: '重新开始...',
            });

            try {
                // 重置状态
                const conditionState: ConditionState = {
                    messageCount: 0,
                    correctAnswerCount: 0,
                    wrongAnswerCount: 0,
                    lastEventId: null,
                    userAnswers: {},
                    customFlags: {}
                };

                this.setData({
                    messages: [],
                    formattedMessages: [],
                    isComplete: false,
                    isPlaying: false,
                    showAssessment: false,
                    currentAssessment: null,
                    currentEventId: this.data.metadata.startId || this.data.allEvents[0]?.id || '',
                    conditionState
                });

                this.triggerEvent('restart');

                // 如果设置了自动播放，则开始播放
                if (this.properties.autoPlay) {
                    this.startPlayback();
                }
            } catch (e) {
                console.error('Failed to restart:', e);
                wx.showToast({
                    title: '重新开始失败',
                    icon: 'none'
                });
            } finally {
                wx.hideLoading();
            }
        },

        // 跳过当前事件
        onSkipNext() {
            if (!this.data.isPlaying) this.startPlayback();
        },

        // 返回上一页
        onBack() {
            wx.navigateBack();
        },

        // 处理输入变更
        onInputChange(e: WechatMiniprogram.Input) {
            this.setData({
                inputText: e.detail.value
            });
        },

        // 发送消息
        onSendMessage() {
            if (!this.data.inputText.trim()) return;

            const content = this.data.inputText.trim();
            const now = new Date().getTime();

            // 创建一条新消息
            const newMessage: EventMessage = {
                id: `user-msg-${now}`,
                type: 'message',
                role: 'self',
                content,
                timestamp: now
            };

            // 添加到消息列表
            const messages = [...this.data.messages, newMessage];
            const formattedMessages = this.formatMessages(messages);

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.messageCount++;
            conditionState.lastEventId = newMessage.id;

            // 清空输入框并更新消息列表
            this.setData({
                inputText: '',
                messages,
                formattedMessages,
                conditionState,
                scrollToView: `msg-${messages.length - 1}`
            });

            // 触发自定义发送消息事件
            this.triggerEvent('messageSent', { message: newMessage });

            // 如果当前是评估对话框，关闭它
            if (this.data.showAssessment) {
                this.setData({
                    showAssessment: false,
                    currentAssessment: null
                });
            }
        },

        // 处理评估选项
        handleAssessmentOption(e: WechatMiniprogram.TouchEvent) {
            const option = e.currentTarget.dataset.option;
            this.setData({
                userAnswer: option
            });
        },

        // 提交评估答案
        submitAssessment() {
            if (!this.data.userAnswer || !this.data.currentAssessment) return;

            const { currentAssessment, userAnswer } = this.data;
            const isCorrect = userAnswer === currentAssessment.correctAnswer;

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };

            // 记录用户答案
            if (currentAssessment.id) {
                conditionState.userAnswers[currentAssessment.id] = userAnswer;
            }

            // 更新正确/错误答案计数
            if (isCorrect) {
                conditionState.correctAnswerCount++;
            } else {
                conditionState.wrongAnswerCount++;
            }

            conditionState.lastEventId = currentAssessment.id;

            // 显示结果
            this.setData({
                showAssessmentResult: true,
                conditionState
            });

            // 延迟关闭评估对话框并继续播放
            setTimeout(() => {
                this.setData({
                    showAssessment: false,
                    currentAssessment: null
                });

                // 获取下一个事件ID
                const nextEventId = this.getNextEventId(currentAssessment);

                if (nextEventId) {
                    this.setData({
                        currentEventId: nextEventId,
                        isPlaying: true
                    });

                    this.playNextEvent();
                } else {
                    // 没有下一个事件，结束播放
                    this.setData({
                        isComplete: true
                    });
                    this.triggerEvent('complete');
                }
            }, 2000);
        },

        // 组件挂载
        attached() {
            // 可以在这里进行初始化操作
        },

        // 组件卸载
        detached() {
            // 可以在这里进行清理操作
        }
    }
}); 