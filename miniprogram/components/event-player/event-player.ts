// 事件类型定义
interface EventMessage {
    id: string;           // 事件唯一标识符
    type: string;         // 事件类型，如 'message', 'assessment', 'task_complete'
    role: string;         // 角色，'self' 或 'opponent' 或 'system'
    content: string;      // 内容
    options?: string[];   // 选项，用于assessment事件
    correctAnswer?: string; // 正确答案，用于assessment事件
    explanation?: string;   // 解释，用于assessment事件
    transitions?: EventTransition[]; // 过渡条件，用于有向图跳转
    nextId?: string;      // 简单跳转的下一个事件ID (用于没有条件的转换)
    delay?: number;       // 已废弃: 使用 transitions[i].delay 替代
    setFlags?: Record<string, any>; // 用于设置自定义标志
    highlightTarget?: string; // 高亮目标元素
    audioUri?: string;    // 用于语音播放的音频URI
    // 来电相关信息
    callerName?: string;  // 来电者姓名
    callerAvatar?: string; // 来电者头像
    callerId?: string;    // 来电者ID
    callRingtone?: string; // 来电铃声路径
    callAudio?: string;   // 通话中播放的音频路径
}

// 过渡条件定义
interface EventTransition {
    targetId: string;     // 目标事件ID
    conditions?: EventCondition[]; // 跳转条件列表
    delay?: number;       // 可选的延迟时间（毫秒），控制转换延迟
}

// 事件条件
interface EventCondition {
    type: 'messageCount' | 'flag' | 'lastEvent' | 'correctAnswerCount' | 'wrongAnswerCount' | 'correctAnswer' | 'custom'; // 条件类型
    value?: any; // 条件值
    key?: string; // 用于flag类型条件的键名
    param?: string; // 额外参数
    operator?: string; // 运算符: '==', '!=', '>', '<', '>=', '<='
}

// 事件订阅定义
interface EventSubscription {
    eventId: string;
    callback: () => void;
    once: boolean;
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

// 条件状态
interface ConditionState {
    messageCount: number;           // 用户消息计数
    correctAnswerCount: number;     // 正确回答计数
    wrongAnswerCount: number;       // 错误回答计数
    lastEventId: string;            // 最后一个事件ID
    customFlags: Record<string, any>; // 自定义标志
    userAnswers: Record<string, any>; // 用户回答记录
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
            value: true  // 修改为默认允许用户输入
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
        // 当前事件ID
        currentEventId: '',
        // 是否正在播放
        isPlaying: false,
        // 是否完成播放
        isComplete: false,
        // 输入文本
        inputText: '',
        // 是否允许输入
        allowInput: true,  // 修改为默认允许用户输入
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
            lastEventId: '',
            customFlags: {},
            userAnswers: {}
        } as ConditionState,
        // 默认延迟时间（毫秒）
        defaultDelay: 1000,
        // 进行中的定时器ID
        activeTimers: [] as number[],
        // 播放开始时间戳
        playbackStartTime: 0,
        // 事件订阅映射
        _eventSubscriptions: {} as Record<string, EventSubscription[]>,
        // UI高亮相关
        showHighlight: false,       // 是否显示高亮
        highlightTarget: '',        // 要高亮的目标元素
        highlightRectPosition: {},   // 高亮区域的位置信息
        // 音频相关
        audioContext: null as WechatMiniprogram.InnerAudioContext | null,
        isAudioPlaying: false,
        currentAudioUri: '',
        // 导航栏标题
        navTitle: '',
        // 红包页面状态
        showRedpacketPage: false,
        // 来电相关
        showIncomingCall: false,
        incomingCallData: {
            callerName: '',
            avatarUrl: '',
            callerId: '',
            callStatus: '来电',
            ringtonePath: ''
        },
        // 通话中相关
        showOngoingCall: false,
        ongoingCallData: {
            callerName: '',
            avatarUrl: '',
            callerId: '',
            audioPath: '/assets/audio/scam_call/scam_call1.mp3'
        },
        // 显示照片选择器
        showPhotoSelector: false,
    },

    /**
     * 组件的方法列表
     */
    methods: {
        // 订阅事件
        subscribeToEvent(eventId: string, callback: () => void, once = false) {
            // 确保订阅映射已初始化
            const subscriptions = this.data._eventSubscriptions || {};
            if (!subscriptions[eventId]) {
                subscriptions[eventId] = [];
            }
            subscriptions[eventId].push({ eventId, callback, once });
            this.setData({ _eventSubscriptions: subscriptions });
        },

        // 取消订阅事件
        unsubscribeFromEvent(eventId: string, callback?: () => void) {
            const subscriptions = this.data._eventSubscriptions;
            if (!subscriptions || !subscriptions[eventId]) return;

            if (callback) {
                // 移除特定回调的订阅
                subscriptions[eventId] = subscriptions[eventId].filter(
                    (subscription: EventSubscription) => subscription.callback !== callback
                );
            } else {
                // 移除所有该事件的订阅
                subscriptions[eventId] = [];
            }

            this.setData({ _eventSubscriptions: subscriptions });
        },

        // 触发事件
        triggerEventById(eventId: string) {
            const subscriptions = this.data._eventSubscriptions[eventId];
            if (!subscriptions || subscriptions.length === 0) return;

            // 执行回调并移除once类型的订阅
            const remainingSubscriptions = [];

            for (const subscription of subscriptions) {
                try {
                    subscription.callback();
                } catch (e) {
                    console.error(`Error executing subscription for event ${eventId}:`, e);
                }

                if (!subscription.once) {
                    remainingSubscriptions.push(subscription);
                }
            }

            // 更新订阅列表
            const updatedSubscriptions = { ...this.data._eventSubscriptions };
            updatedSubscriptions[eventId] = remainingSubscriptions;
            this.setData({ _eventSubscriptions: updatedSubscriptions });
        },

        // 清除所有事件订阅
        clearAllSubscriptions() {
            console.log('清除所有事件订阅');
            this.setData({ _eventSubscriptions: {} });
        },

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
        processData(data: any) {
            if (!data || !Array.isArray(data.events)) {
                console.error('无效的事件数据');
                return false;
            }

            console.log('处理事件数据:', data);

            // 清除所有现有订阅和定时器
            this.clearAllSubscriptions();
            this.clearAllTimers();

            // 提取元数据
            const metadata = data.metadata || {};
            const startId = (metadata && metadata.startId) || (data.events[0] && data.events[0].id);
            const defaultDelay = metadata.defaultDelay || 1000;

            // 构建事件映射
            const eventMap: Record<string, EventMessage> = {};
            const allEvents: EventMessage[] = [];

            // 处理事件
            for (const event of data.events) {
                if (!event.id) {
                    console.warn('跳过没有ID的事件:', event);
                    continue;
                }

                // 确保每个事件都有type属性
                if (!event.type) {
                    event.type = 'message';
                }

                // 确保消息事件有role属性
                if (event.type === 'message' && !event.role) {
                    event.role = 'system';
                }

                // 存储事件
                eventMap[event.id] = event;
                allEvents.push(event);
            }

            console.log(`处理了 ${allEvents.length} 个事件，起始事件: ${startId}`);

            // 更新组件状态
            this.setData({
                metadata,
                startId,
                defaultDelay,
                eventMap,
                allEvents,
                isComplete: false,
                isPlaying: false,
                playbackStartTime: Date.now(),
                allowInput: true // 启用输入功能
            });

            // 准备完成，延迟一点启动播放以确保UI更新
            setTimeout(() => {
                this.startPlayback();
            }, 100);

            return true;
        },

        // 格式化消息，将原始消息格式转换为chat-container所需的格式
        formatMessages(messages: EventMessage[]): FormattedMessage[] {
            return messages.map((msg, index) => ({
                _id: `msg-${index}`,
                type: 'text', // 默认为文本类型
                content: msg.content,
                role: msg.role === 'self' ? 'user' : 'assistant', // 将self转为user，将opponent转为assistant
                timestamp: Date.now() - (messages.length - index) * 1000 // 简单生成时间戳，较新的消息时间较晚
            }));
        },

        // 格式化时间显示
        formatTimeText(date: Date): string {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `今天 ${hours}:${minutes}`;
        },

        // 清除所有计时器
        clearAllTimers() {
            console.log(`清除所有计时器: ${this.data.activeTimers.length}个`);

            // 清除所有活动的计时器
            this.data.activeTimers.forEach(timerId => {
                clearTimeout(timerId);
            });

            // 重置计时器列表
            this.setData({ activeTimers: [] });
        },

        // 开始播放
        startPlayback() {
            console.log('开始播放');

            if (this.data.isComplete) {
                console.log('事件序列已完成，无法开始播放');
                return;
            }

            // 设置播放状态
            this.setData({
                isPlaying: true,
                allowInput: this.properties.interactionMode, // 根据交互模式设置允许输入
                playbackStartTime: Date.now()
            });

            // 记录开始时间
            this.triggerEvent('playStart');

            // 如果是首次开始，从第一个事件开始
            if (!this.data.currentEventId) {
                if (this.data.metadata.startId) {
                    this.processEvent(this.data.metadata.startId);
                } else if (this.data.allEvents.length > 0) {
                    this.processEvent(this.data.allEvents[0].id);
                } else {
                    console.warn('没有事件可播放');
                    this.setData({ isPlaying: false });
                }
            } else {
                // 如果是重新开始，检查条件并进行合适的转换
                this.checkAndTransitionBasedOnFlags();
            }
        },

        // 检查条件是否满足
        checkCondition(condition: EventCondition): boolean {
            return this.evaluateCondition(condition);
        },

        // 获取下一个事件的ID
        getNextEventId(event: EventMessage): { id: string | null, delay?: number } {
            console.log(`获取 ${event.id} 的下一事件ID`);

            // 检查条件转换
            if (event.transitions && event.transitions.length > 0) {
                console.log(`事件 ${event.id} 有 ${event.transitions.length} 个可能的转换`);

                // 查找满足所有条件的第一个转换
                for (const transition of event.transitions) {
                    // 如果没有条件，直接使用这个转换
                    if (!transition.conditions || transition.conditions.length === 0) {
                        console.log(`找到无条件转换到 ${transition.targetId}${transition.delay ? `，延迟 ${transition.delay}ms` : ''}`);
                        return {
                            id: transition.targetId,
                            delay: transition.delay
                        };
                    }

                    // 检查所有条件是否满足
                    const conditionResults = transition.conditions.map(condition => {
                        const result = this.evaluateCondition(condition);
                        console.log(`条件检查 ${condition.type} ${condition.key || ''}: ${result}`);
                        return result;
                    });

                    const allConditionsMet = conditionResults.every(result => result === true);

                    if (allConditionsMet) {
                        console.log(`所有条件满足，转换到 ${transition.targetId}${transition.delay ? `，延迟 ${transition.delay}ms` : ''}`);
                        return {
                            id: transition.targetId,
                            delay: transition.delay
                        };
                    }
                }
            }

            // 没有找到满足条件的下一个事件
            console.log(`事件 ${event.id} 无下一步或条件不满足`);
            return { id: null };
        },

        // 处理事件
        processEvent(eventId: string) {
            console.log(`处理事件: ${eventId}`);
            // 如果没有活动 ID 或 ID 无效，则退出
            if (!eventId || !this.data.eventMap[eventId]) {
                console.error(`无效的事件ID: ${eventId}`);
                return;
            }

            // 获取事件对象
            const event = this.data.eventMap[eventId];

            // 兼容处理 - 如果有nextId但没有transitions，创建一个transition
            if (event.nextId && (!event.transitions || event.transitions.length === 0)) {
                console.log(`使用nextId ${event.nextId} 创建转换`);
                event.transitions = [
                    {
                        targetId: event.nextId,
                        conditions: []
                    }
                ];
            }

            this.setData({ currentEventId: eventId });

            // 根据事件类型进行处理
            switch (event.type) {
                case 'message':
                    this.handleMessageEvent(event);
                    break;
                case 'assessment':
                    this.handleAssessmentEvent(event);
                    break;
                case 'task_complete':
                    this.handleTaskCompleteEvent(event);
                    break;
                case 'waiting_for_input':
                    this.handleWaitingForInputEvent(event);
                    break;
                case 'ui_highlight':
                    this.handleUIHighlightEvent(event);
                    break;
                case 'system':
                case 'system_display':
                    this.handleSystemEvent(event);
                    break;
                case 'incoming_call':
                    this.handleIncomingCallEvent(event);
                    break;
                default:
                    console.warn(`未知的事件类型: ${event.type}`);
                    // 未知类型的事件，直接转到下一个
                    this.transitionToNextEvent(event);
                    break;
            }
        },

        // 处理系统事件
        handleSystemEvent(event: EventMessage) {
            console.log(`处理系统事件: ${event.id}`);

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.lastEventId = event.id;

            // 设置自定义标志
            if (event.setFlags && typeof event.setFlags === 'object') {
                console.log(`设置自定义标志:`, event.setFlags);
                for (const [key, value] of Object.entries(event.setFlags)) {
                    conditionState.customFlags[key] = value;
                }
            }

            // 更新状态
            this.setData({ conditionState });

            // 系统事件不显示，直接转到下一个事件
            this.transitionToNextEvent(event);
        },

        // 处理消息类型事件
        handleMessageEvent(event: EventMessage) {
            console.log(`处理消息事件: ${event.id}`);

            // 忽略系统消息的显示，除非强制显示
            if (event.role === 'system' && event.type !== 'system_display') {
                console.log(`跳过系统消息显示: ${event.id}`);
                this.transitionToNextEvent(event);
                return;
            }

            // 添加消息到列表
            const messages = [...this.data.messages, event];
            const formattedMessages = this.formatMessages(messages);

            // 更新视图
            this.setData({
                messages,
                formattedMessages,
                scrollToView: `msg-${messages.length - 1}`
            });

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.lastEventId = event.id;
            this.setData({ conditionState });

            // 如果消息有音频URI，播放语音
            if (event.audioUri) {
                this.playAudio(event.audioUri);
            }

            // 检查是否需要用户交互
            if (event.transitions && event.transitions.some(t =>
                t.conditions && t.conditions.some(c => c.type === 'messageCount' && c.value > 0))) {
                console.log(`事件 ${event.id} 等待用户交互`);
                // 确保用户可以输入消息
                this.setData({ allowInput: true });
                // 无需设置定时器，用户消息会触发下一步
                return;
            }

            // 处理转到下一个事件 - 由 transitionToNextEvent 方法处理延迟
            this.transitionToNextEvent(event);
        },

        // 处理评估类型事件
        handleAssessmentEvent(event: EventMessage) {
            console.log(`处理评估事件: ${event.id}`);

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.lastEventId = event.id;

            // 显示评估对话框
            this.setData({
                currentAssessment: event,
                showAssessment: true,
                conditionState
            });

            // 评估事件通常等待用户交互，无需自动转到下一个事件
        },

        /**
         * 处理任务完成事件
         */
        handleTaskCompleteEvent(event: EventMessage) {
            console.log('任务完成：', event.content);

            // 显示提示
            wx.showToast({
                title: event.content || '任务完成！',
                icon: 'success',
                duration: 2000
            });

            // 设置完成状态
            this.setData({
                isComplete: true
            });

            // 标记学习进度为已完成
            this.recordLearningProgress(true);

            // 播放音频（如果有）
            if (event.audioUri) {
                this.playAudio(event.audioUri);
            }

            // 转到下一个事件
            this.transitionToNextEvent(event);
        },

        // 记录用户学习进度
        recordLearningProgress(completed: boolean, score?: number) {
            // 获取当前模块ID（从URL参数中获取）
            const currentPageUrl = getCurrentPages().pop()?.route || '';
            const queryString = getCurrentPages().pop()?.options || {};

            // 从URL获取id参数
            let moduleId = queryString.id || '';

            // 如果没有id参数，尝试从路径中推断
            if (!moduleId && currentPageUrl.includes('event-demo')) {
                moduleId = 'default_event_demo';
            }

            // 确保有moduleId和openid才进行记录
            if (!moduleId) {
                console.warn('无法确定当前模块ID，无法记录学习进度');
                return;
            }

            // 获取openid
            const openid = wx.getStorageSync('user_openid');
            if (!openid) {
                console.warn('用户未登录，无法记录学习进度');
                wx.showToast({
                    title: '请先登录以保存进度',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }

            console.log(`记录学习进度: 模块=${moduleId}, 完成=${completed}, 分数=${score || 0}`);

            try {
                // 确保云函数已初始化
                if (!wx.cloud || !wx.cloud.callFunction) {
                    console.error('云服务未初始化');
                    wx.showToast({
                        title: '云服务不可用',
                        icon: 'none'
                    });
                    return;
                }

                // 调用云函数更新学习进度
                wx.cloud.callFunction({
                    name: 'updateLearningProgress',
                    data: {
                        openid: openid,
                        moduleId: moduleId,
                        completed: completed,
                        score: score || 0
                    },
                    success: (res: any) => {
                        if (res.result && res.result.success === false) {
                            console.error('学习进度记录失败:', res.result.error);
                            wx.showToast({
                                title: '进度保存失败',
                                icon: 'none',
                                duration: 2000
                            });
                            return;
                        }
                        console.log('学习进度记录成功:', res);
                        if (completed) {
                            wx.showToast({
                                title: '恭喜完成学习！',
                                icon: 'success',
                                duration: 2000
                            });
                        }
                    },
                    fail: (err) => {
                        console.error('学习进度记录失败:', err);

                        // 如果是数据库集合不存在的错误，尝试初始化数据库
                        if (err && err.errMsg &&
                            (err.errMsg.includes('database collection not exists') ||
                                err.errMsg.includes('-502005'))) {
                            console.log('检测到数据库集合不存在，尝试初始化数据库...');

                            // 调用初始化数据库云函数
                            wx.cloud.callFunction({
                                name: 'initDatabase',
                                success: (res: any) => {
                                    console.log('数据库初始化结果:', res);

                                    // 数据库初始化成功后，重新尝试记录学习进度
                                    if (res.result && res.result.success) {
                                        console.log('数据库初始化成功，重新尝试记录学习进度');
                                        setTimeout(() => {
                                            this.recordLearningProgress(completed, score);
                                        }, 1000); // 延迟1秒后重试
                                    }
                                },
                                fail: (initErr) => {
                                    console.error('初始化数据库失败:', initErr);
                                    wx.showToast({
                                        title: '数据库初始化失败',
                                        icon: 'none',
                                        duration: 2000
                                    });
                                }
                            });
                        } else {
                            wx.showToast({
                                title: '进度保存失败',
                                icon: 'none',
                                duration: 2000
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('云函数调用异常:', error);
                wx.showToast({
                    title: '云服务调用异常',
                    icon: 'none',
                    duration: 2000
                });
            }
        },

        // 评估条件是否满足
        evaluateCondition(condition: EventCondition): boolean {
            const { type, param, value, operator = '==' } = condition;
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
                    leftValue = eventId ? conditionState.userAnswers[eventId] === (this.data.eventMap[eventId] && this.data.eventMap[eventId].correctAnswer) : false;
                    break;
                case 'flag':
                    if (condition.key) {
                        leftValue = conditionState.customFlags[condition.key];
                        console.log(`评估标志 ${condition.key}:`, leftValue, '与', value);
                    }
                    break;
                case 'custom':
                    leftValue = param ? conditionState.customFlags[param] : undefined;
                    break;
                default:
                    console.warn('未知条件类型:', type);
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
                    return leftValue === value; // 默认使用严格相等
            }
        },

        // 根据事件转换到下一个事件
        transitionToNextEvent(event: EventMessage) {
            console.log(`尝试转换事件: ${event.id}`);

            // 如果当前ID不是传入的事件ID，则可能是由于其他并发触发，忽略此次转换
            if (this.data.currentEventId !== event.id) {
                console.log(`当前事件ID (${this.data.currentEventId}) 与传入事件ID (${event.id}) 不匹配，忽略转换`);
                return;
            }

            if (!this.data.isPlaying) {
                console.log(`播放已暂停，不进行转换`);
                return;
            }

            // 尝试获取下一个事件ID和延迟
            const nextEventInfo = this.getNextEventId(event);

            if (nextEventInfo.id) {
                console.log(`找到下一个事件: ${nextEventInfo.id}${nextEventInfo.delay ? `，延迟 ${nextEventInfo.delay}ms` : ''}`);

                const transitionDelay = nextEventInfo.delay || 0;

                if (transitionDelay > 0) {
                    // 如果指定了延迟，使用定时器延迟执行
                    console.log(`将在 ${transitionDelay}ms 后转换到事件 ${nextEventInfo.id}`);

                    const timerId = setTimeout(() => {
                        // 只有当仍在播放状态，且当前事件ID仍然是此事件时，才执行转换
                        if (this.data.isPlaying && this.data.currentEventId === event.id) {
                            // 移除活动定时器
                            const activeTimers = [...this.data.activeTimers];
                            const timerIndex = activeTimers.indexOf(timerId);
                            if (timerIndex !== -1) {
                                activeTimers.splice(timerIndex, 1);
                                this.setData({ activeTimers });
                            }

                            // 处理下一个事件
                            this.processEvent(nextEventInfo.id as string);
                        }
                    }, transitionDelay);

                    // 添加到活动定时器列表
                    this.setData({
                        activeTimers: [...this.data.activeTimers, timerId]
                    });
                } else {
                    // 如果没有延迟，立即处理下一个事件
                    this.processEvent(nextEventInfo.id as string);
                }
            } else if (!nextEventInfo.id && !event.transitions) {
                // 如果没有找到下一个事件，且当前事件也没有定义转换
                console.log(`事件 ${event.id} 没有下一步，播放完成`);
                this.completePlayback();
            } else {
                console.log(`事件 ${event.id} 没有满足条件的下一步，等待用户操作`);
            }
        },

        // 完成播放
        completePlayback() {
            console.log('完成对话播放');

            // 清除所有计时器
            this.clearAllTimers();

            // 更新状态
            this.setData({
                isComplete: true,
                isPlaying: false,
                allowInput: true // 完成后也允许输入，以便用户可以继续交互
            });

            // 触发完成事件
            this.triggerEvent('playComplete', {
                messageCount: this.data.messages.length,
                userMessageCount: this.data.conditionState.messageCount,
                duration: Date.now() - this.data.playbackStartTime
            });
        },

        // 暂停播放
        pausePlayback() {
            if (!this.data.isPlaying) return;

            this.setData({ isPlaying: false });
            this.clearAllTimers();

            // 停止音频播放
            this.stopAudio();

            // 触发暂停事件
            this.triggerEvent('playPause');
        },

        // 切换播放状态
        onTogglePlay() {
            if (this.data.isPlaying) {
                this.pausePlayback();
            } else {
                this.resumePlayback();
            }
        },

        // 恢复播放
        resumePlayback() {
            if (this.data.isComplete) {
                console.log('事件序列已完成，无法恢复播放');
                return;
            }

            this.setData({
                isPlaying: true,
                playbackStartTime: Date.now()
            });

            // 触发播放开始事件
            this.triggerEvent('playStart');

            // 检查当前状态并进行下一步转换
            this.checkAndTransitionBasedOnFlags();
        },

        // 重新开始播放
        onRestart() {
            console.log('重新开始播放');

            // 停止当前播放
            this.clearAllTimers();

            // 停止音频播放
            this.stopAudio();

            // 重置状态
            this.setData({
                messages: [],
                formattedMessages: [],
                currentEventId: '',
                isPlaying: false,
                isComplete: false,
                showAssessment: false,
                conditionState: {
                    messageCount: 0,
                    correctAnswerCount: 0,
                    wrongAnswerCount: 0,
                    lastEventId: '',
                    customFlags: {},
                    userAnswers: {}
                }
            });

            // 触发重新开始事件
            this.triggerEvent('restart');

            // 开始播放
            this.startPlayback();
        },

        // 跳过当前事件
        onSkipNext() {
            if (this.data.isPlaying) {
                // 如果当前正在播放，取消当前正在处理的事件的所有定时器，并直接转到下一个
                this.clearAllTimers();

                const currentEvent = this.data.eventMap[this.data.currentEventId];
                if (currentEvent) {
                    this.transitionToNextEvent(currentEvent);
                }
            } else {
                // 如果当前暂停，则恢复播放
                this.resumePlayback();
            }
        },

        // 返回上一页
        onBack() {
            // 如果红包页面正在显示，则关闭红包页面而不是返回上一页
            if (this.data.showRedpacketPage) {
                this.onRedpacketPageClose();
                return;
            }

            // 清除所有定时器和订阅
            this.clearAllTimers();
            this.clearAllSubscriptions();

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

            console.log(`用户发送消息: ${content}`);

            // 创建一条新消息
            const newMessage: EventMessage = {
                id: `user-msg-${now}`,
                type: "message",
                role: "self",
                content
            };

            // 添加到消息列表
            const messages = [...this.data.messages, newMessage];
            const formattedMessages = this.formatMessages(messages);

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.messageCount++;
            conditionState.lastEventId = newMessage.id;

            // 分析用户消息内容，设置相应的标志
            this.analyzeUserMessage(content, conditionState);

            // 清空输入框并更新消息列表，确保输入区域保持启用状态
            this.setData({
                inputText: '',
                messages,
                formattedMessages,
                conditionState,
                scrollToView: `msg-${messages.length - 1}`,
                allowInput: true // 保持输入区域启用
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

            // 发送消息后检查是否有条件转换需要执行
            if (this.data.currentEventId) {
                console.log('用户消息后检查条件转换');
                const currentEvent = this.data.eventMap[this.data.currentEventId];
                if (currentEvent) {
                    // 取消当前事件的所有计时器
                    this.clearAllTimers();
                    // 立即处理转换
                    this.transitionToNextEvent(currentEvent);
                }
            }
        },

        // 分析用户消息并设置相应的标志
        analyzeUserMessage(content: string, conditionState: ConditionState) {
            // 将消息内容转为小写，便于分析
            const lowerContent = content.toLowerCase();

            console.log(`分析用户消息内容: ${lowerContent}`);

            // 解析用户选择的主题
            if (lowerContent.includes('网络') || lowerContent.includes('安全') || lowerContent.includes('网安') || lowerContent.includes('1') || lowerContent.includes('一')) {
                console.log('用户选择了网络安全主题');
                conditionState.customFlags.userSelectedTopic = 'cyber';
            } else if (lowerContent.includes('健康') || lowerContent.includes('生活') || lowerContent.includes('2') || lowerContent.includes('二')) {
                console.log('用户选择了健康建议主题');
                conditionState.customFlags.userSelectedTopic = 'health';
            } else if (lowerContent.includes('财务') || lowerContent.includes('金融') || lowerContent.includes('财经') || lowerContent.includes('3') || lowerContent.includes('三')) {
                console.log('用户选择了金融知识主题');
                conditionState.customFlags.userSelectedTopic = 'finance';
            }

            // 解析用户最终选择
            if (lowerContent.includes('继续') || lowerContent.includes('yes') || lowerContent.includes('是') || lowerContent.includes('好')) {
                console.log('用户选择继续浏览其他主题');
                conditionState.customFlags.userFinalChoice = 'continue';
            } else if (lowerContent.includes('结束') || lowerContent.includes('no') || lowerContent.includes('否') || lowerContent.includes('退出')) {
                console.log('用户选择结束演示');
                conditionState.customFlags.userFinalChoice = 'end';
            }

            // 更新条件状态
            this.setData({ conditionState });
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

            // 短暂显示结果后关闭评估对话框并继续播放
            const timerId = setTimeout(() => {
                // 从活动定时器列表中移除
                const activeTimers = [...this.data.activeTimers];
                const timerIndex = activeTimers.indexOf(timerId);
                if (timerIndex !== -1) {
                    activeTimers.splice(timerIndex, 1);
                    this.setData({ activeTimers });
                }

                this.setData({
                    showAssessment: false,
                    currentAssessment: null,
                    isPlaying: true
                });

                this.transitionToNextEvent(currentAssessment);
            }, 2000);

            // 添加到活动定时器列表
            this.setData({
                activeTimers: [...this.data.activeTimers, timerId]
            });
        },

        // 处理等待用户交互的事件
        handleWaitingForInputEvent(event: EventMessage) {
            console.log(`处理等待用户输入事件: ${event.id}`);

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.lastEventId = event.id;

            // 设置自定义标志
            if (event.setFlags && typeof event.setFlags === 'object') {
                console.log(`设置自定义标志:`, event.setFlags);
                for (const [key, value] of Object.entries(event.setFlags)) {
                    conditionState.customFlags[key] = value;
                }
            }

            // 更新状态
            this.setData({
                conditionState,
                allowInput: true // 确保用户可以输入
            });

            // 等待用户输入的事件不会自动转到下一个事件，需要用户交互触发
        },

        // 处理UI高亮事件
        handleUIHighlightEvent(event: EventMessage) {
            console.log(`处理UI高亮事件: ${event.id}`);

            // 获取要高亮的目标元素
            const targetElement = event.highlightTarget;
            console.log(`要高亮的目标元素: ${targetElement}`);

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.lastEventId = event.id;

            // 设置高亮状态
            this.setData({
                highlightTarget: targetElement,
                showHighlight: true,
                conditionState
            });

            // 转到下一个事件
            this.transitionToNextEvent(event);
        },

        // 组件挂载
        attached() {
            console.log('事件播放器组件已加载');
            // 初始化空的订阅映射
            this.setData({ _eventSubscriptions: {} });
        },

        // 组件卸载
        detached() {
            console.log('事件播放器组件已卸载，清理资源');
            this.clearAllTimers();
            this.clearAllSubscriptions();
            this.stopAudio();
        },

        // 处理加号按钮点击
        onPlusClick() {
            console.log('用户点击了加号按钮');
            console.log('当前高亮状态:', {
                highlightTarget: this.data.highlightTarget,
                showHighlight: this.data.showHighlight
            });

            // 检查是否在等待用户点击加号
            if (this.data.highlightTarget === 'more-button' && this.data.showHighlight) {
                console.log('检测到加号点击，更新标志状态');

                // 更新条件状态
                const conditionState = { ...this.data.conditionState };
                conditionState.customFlags = conditionState.customFlags || {};
                conditionState.customFlags.userClickedPlus = true;

                console.log('新的条件状态:', conditionState);

                // 更新状态并隐藏高亮
                this.setData({
                    conditionState,
                    showHighlight: false
                }, () => {
                    // 在状态更新完成后检查转换
                    console.log('状态已更新，检查转换');
                    this.checkAndTransitionBasedOnFlags();
                });
            } else {
                console.log('加号点击，但不在等待点击状态');
            }
        },

        // 处理功能按钮点击
        onFeatureClick(e: WechatMiniprogram.CustomEvent) {
            const { feature, customFlags = {} } = e.detail;
            console.log('功能点击:', feature, customFlags);

            // 处理键盘上菜单的各功能
            if (feature === 'photo') {
                // 打开照片选择器
                this.setData({
                    showPhotoSelector: true
                });
                // Set the page navigation title when photo selector opens
                wx.setNavigationBarTitle({ title: '照片和视频' });

                // 更新条件状态
                if (this.data.highlightTarget === 'photo' && this.data.showHighlight) {
                    const conditionState = { ...this.data.conditionState };
                    conditionState.customFlags = conditionState.customFlags || {};
                    conditionState.customFlags.userClickedPhoto = true;

                    this.setData({
                        conditionState,
                        showHighlight: false
                    }, () => {
                        // 检查条件转换
                        this.checkAndTransitionBasedOnFlags();
                    });
                }
            }

            // 检查是否在等待用户点击红包按钮
            if (feature === 'redpacket' && this.data.highlightTarget === 'redpacket' && this.data.showHighlight) {
                console.log('检测到红包按钮点击，更新标志状态');

                // 更新条件状态
                const conditionState = { ...this.data.conditionState };
                conditionState.customFlags = conditionState.customFlags || {};
                conditionState.customFlags.userClickedRedPacket = true;

                console.log('新的条件状态:', conditionState);

                // 更新状态并隐藏高亮
                this.setData({
                    conditionState,
                    showHighlight: false
                }, () => {
                    // 在状态更新完成后检查转换
                    console.log('状态已更新，检查转换');
                    this.checkAndTransitionBasedOnFlags();
                });
            } else {
                console.log('功能按钮点击，但不是等待中的红包按钮');
            }
        },

        // 处理发送照片
        onPhotoSent(e: WechatMiniprogram.CustomEvent) {
            const { photos } = e.detail;
            console.log('照片已发送:', photos);

            // 创建照片消息并添加到消息列表
            const photoMessage: FormattedMessage = {
                _id: `msg-${Date.now()}`,
                type: 'photo',
                content: JSON.stringify(photos),
                role: 'user',
                timestamp: Date.now()
            };

            // 更新消息列表
            this.setData({
                formattedMessages: [...this.data.formattedMessages, photoMessage],
                showPhotoSelector: false, // 关闭照片选择器
                scrollToView: photoMessage._id // 自动滚动到新消息
            });

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.messageCount += 1;
            conditionState.customFlags = conditionState.customFlags || {};
            conditionState.customFlags.userSentPhoto = true;

            // 记录发送的照片数量
            conditionState.customFlags.photoCount = (conditionState.customFlags.photoCount || 0) + photos.length;

            this.setData({
                conditionState
            }, () => {
                // 检查条件转换
                this.checkAndTransitionBasedOnFlags();
            });
        },

        // 处理照片选择器关闭
        onPhotoSelectorClose() {
            this.setData({
                showPhotoSelector: false
            });
            // Restore the original page navigation title
            const originalTitle = this.data.metadata?.title || '聊天';
            wx.setNavigationBarTitle({ title: originalTitle });
        },

        // 处理发送红包按钮点击
        onSendRedpacketClicked(e: WechatMiniprogram.CustomEvent) {
            const { customFlags } = e.detail;
            console.log('发送红包按钮被点击', customFlags);

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };

            // 直接设置 userClickedSendRedpacket 标志
            conditionState.customFlags = conditionState.customFlags || {};
            conditionState.customFlags.userClickedSendRedpacket = true;

            console.log('设置 userClickedSendRedpacket 标志为 true', conditionState);

            // 如果有自定义标志，则合并
            if (customFlags) {
                // 合并自定义标志
                for (const [key, value] of Object.entries(customFlags)) {
                    conditionState.customFlags[key] = value;
                }
            }

            // 更新状态
            this.setData({
                conditionState,
                showHighlight: false // 如果有高亮状态，清除高亮
            }, () => {
                // 检查条件转换
                console.log('检查塞钱进红包后的条件转换');
                this.checkAndTransitionBasedOnFlags();
            });
        },

        // 处理支付确认
        onPaymentConfirmed(e: WechatMiniprogram.CustomEvent) {
            const { customFlags } = e.detail;
            console.log('支付按钮被点击', customFlags);

            if (customFlags) {
                // 更新条件状态
                const conditionState = { ...this.data.conditionState };

                // 合并自定义标志
                for (const [key, value] of Object.entries(customFlags)) {
                    conditionState.customFlags[key] = value;
                }

                // 更新状态并隐藏高亮
                this.setData({
                    conditionState,
                    showHighlight: false
                }, () => {
                    // 检查条件转换
                    this.checkAndTransitionBasedOnFlags();
                });
            }
        },

        // 修改 onRedpacketSend 方法，确保它可以正确处理转账确认步骤
        onRedpacketSend(e: WechatMiniprogram.CustomEvent) {
            console.log('收到红包发送事件', e.detail);

            // 可以在这里处理红包发送后的业务逻辑
            // 例如添加一条红包消息到聊天中
            const redpacketData = e.detail;

            // 创建一个新的消息
            const newMessage: EventMessage = {
                id: `msg-${Date.now()}`,
                type: 'redpacket_message',
                role: 'self',
                content: `发送了一个红包: ${redpacketData.greeting}`
            };

            // 添加消息到消息列表
            const messages = [...this.data.messages, newMessage];
            const formattedMessages = this.formatMessages(messages);

            // 更新数据
            this.setData({
                messages,
                formattedMessages,
                scrollToView: `msg-${formattedMessages.length - 1}`
            });

            // 如果在支付按钮高亮状态，则设置支付标志
            if (this.data.highlightTarget === 'pay-button' && this.data.showHighlight) {
                console.log('支付操作已完成，更新支付标志状态');

                // 更新条件状态
                const conditionState = { ...this.data.conditionState };
                conditionState.customFlags = conditionState.customFlags || {};
                conditionState.customFlags.userConfirmedPayment = true;

                // 更新状态并隐藏高亮
                this.setData({
                    conditionState,
                    showHighlight: false
                }, () => {
                    // 在状态更新完成后检查转换
                    console.log('支付状态已更新，检查转换');
                    this.checkAndTransitionBasedOnFlags();
                });
            }
        },

        // 检查自定义标志并根据当前状态进行转换
        checkAndTransitionBasedOnFlags() {
            const { currentEventId } = this.data;

            // 如果没有当前事件ID，从第一个事件开始
            if (!currentEventId) {
                if (this.data.metadata.startId) {
                    this.processEvent(this.data.metadata.startId);
                } else if (this.data.allEvents.length > 0) {
                    this.processEvent(this.data.allEvents[0].id);
                }
                return;
            }

            // 获取当前事件
            const currentEvent = this.data.eventMap[currentEventId];
            if (!currentEvent) {
                console.error(`未找到当前事件: ${currentEventId}`);
                return;
            }

            // 转到下一个事件
            this.transitionToNextEvent(currentEvent);
        },

        // 添加处理金额修改事件
        onAmountChanged() {
            console.log('用户修改了红包金额');

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.customFlags = conditionState.customFlags || {};
            conditionState.customFlags.userChangedAmount = true;

            // 更新状态
            this.setData({
                conditionState
            }, () => {
                // 在状态更新完成后检查转换
                console.log('金额已修改，更新标志状态，检查转换');
                this.checkAndTransitionBasedOnFlags();
            });
        },

        // 处理表情选择
        onSelectEmoji(e: WechatMiniprogram.CustomEvent) {
            const emoji = e.detail.emoji;
            console.log('选择了表情:', emoji);

            // 将表情添加到当前输入文本中
            const newInputText = this.data.inputText + emoji;

            this.setData({
                inputText: newInputText
            });
        },

        // 处理表情删除
        onDeleteEmoji() {
            if (this.data.inputText.length > 0) {
                // 使用Array.from将字符串拆分为Unicode字符（包括表情），
                // 然后删除最后一个字符或表情
                const characters = Array.from(this.data.inputText);
                characters.pop();

                this.setData({
                    inputText: characters.join('')
                });
            }
        },

        // 处理导航栏标题更新
        onUpdateNavTitle(e: WechatMiniprogram.CustomEvent) {
            const { title } = e.detail;
            this.setData({ navTitle: title });
        },

        // 播放音频
        playAudio(uri: string) {
            // 停止之前的音频播放
            this.stopAudio();

            if (!uri) return;

            console.log('播放音频:', uri);

            // 创建音频上下文
            const audioContext = wx.createInnerAudioContext();
            audioContext.src = uri;
            audioContext.autoplay = true;

            audioContext.onPlay(() => {
                console.log('音频开始播放');
                this.setData({
                    audioContext,
                    isAudioPlaying: true,
                    currentAudioUri: uri
                });
            });

            audioContext.onEnded(() => {
                console.log('音频播放结束');
                this.setData({
                    isAudioPlaying: false
                });
                // 释放资源
                audioContext.destroy();
            });

            audioContext.onError((err) => {
                console.error('音频播放错误:', err);
                this.setData({
                    isAudioPlaying: false
                });
                // 释放资源
                audioContext.destroy();
            });
        },

        // 停止音频播放
        stopAudio() {
            if (this.data.audioContext) {
                console.log('停止音频播放');
                this.data.audioContext.stop();
                this.data.audioContext.destroy();
                this.setData({
                    audioContext: null,
                    isAudioPlaying: false,
                    currentAudioUri: ''
                });
            }
        },

        // 处理显示红包页面事件
        onShowRedpacket() {
            this.setData({
                showRedpacketPage: true
            });
        },

        // 处理红包页面关闭
        onRedpacketPageClose() {
            this.setData({
                showRedpacketPage: false
            });
            // Restore the original page navigation title
            const originalTitle = this.data.metadata?.title || '聊天';
            wx.setNavigationBarTitle({ title: originalTitle });
        },

        // 处理隐藏红包页面事件
        onHideRedpacket() {
            this.setData({
                showRedpacketPage: false
            });
            // Restore the original page navigation title
            const originalTitle = this.data.metadata?.title || '聊天';
            wx.setNavigationBarTitle({ title: originalTitle });
        },

        // 处理来电类型事件
        handleIncomingCallEvent(event: EventMessage) {
            console.log(`处理来电事件: ${event.id}`);

            // 停止当前正在播放的音频
            this.stopAudio();

            // 准备来电数据
            const incomingCallData = {
                callerName: event.callerName || event.content || this.data.metadata.opponent.nickname,
                avatarUrl: event.callerAvatar || this.data.metadata.opponent.avatarUrl || '/assets/icons/default-avatar.svg',
                callerId: event.callerId || event.id,
                callStatus: '来电',
                ringtonePath: event.callRingtone || '/assets/audio/ringtone.mp3'
            };

            // 更新状态
            this.setData({
                incomingCallData,
                showIncomingCall: true
            });

            // 获取来电组件实例并调用显示方法
            const incomingCallComponent = this.selectComponent('#incomingCall');
            if (incomingCallComponent) {
                incomingCallComponent.showIncomingCall(incomingCallData);
            } else {
                console.error('未找到来电组件实例');
            }

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.lastEventId = event.id;

            // 设置自定义标志
            if (event.setFlags && typeof event.setFlags === 'object') {
                console.log(`设置自定义标志:`, event.setFlags);
                for (const [key, value] of Object.entries(event.setFlags)) {
                    conditionState.customFlags[key] = value;
                }
            }

            // 更新状态
            this.setData({ conditionState });

            // 注意：不自动转到下一个事件，等待用户操作（接听或拒绝）
        },

        // 处理接听来电
        onCallAccepted(e: WechatMiniprogram.CustomEvent) {
            console.log('用户接听了来电:', e.detail);

            // 隐藏来电界面
            this.setData({ showIncomingCall: false });

            // 从事件对象中获取当前事件
            const currentEvent = this.data.eventMap[this.data.currentEventId];

            // 准备通话中数据
            const ongoingCallData = {
                callerName: e.detail.callerName || this.data.incomingCallData.callerName,
                avatarUrl: this.data.incomingCallData.avatarUrl,
                callerId: e.detail.callerId || this.data.incomingCallData.callerId,
                audioPath: currentEvent.callAudio || '/assets/audio/scam_call/scam_call1.mp3' // 使用事件中指定的音频
            };

            console.log('使用通话音频路径:', ongoingCallData.audioPath);

            // 显示通话中界面
            this.setData({
                ongoingCallData,
                showOngoingCall: true
            });

            // 获取通话组件实例并调用显示方法
            const ongoingCallComponent = this.selectComponent('#ongoingCall');
            if (ongoingCallComponent) {
                ongoingCallComponent.showOngoingCall(ongoingCallData);
            }

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.customFlags = conditionState.customFlags || {};
            conditionState.customFlags.callAccepted = true;
            conditionState.customFlags.callStatus = 'accepted';
            conditionState.customFlags.callerName = e.detail.callerName;
            conditionState.customFlags.callerId = e.detail.callerId;

            // 更新状态
            this.setData({ conditionState }, () => {
                // 在状态更新完成后检查转换
                this.checkAndTransitionBasedOnFlags();
            });

            // 创建一条系统消息，表示接听了来电
            const newMessage: EventMessage = {
                id: `call-accepted-${Date.now()}`,
                type: 'message',
                role: 'system',
                content: `接听了 ${e.detail.callerName} 的来电`
            };

            // 添加消息到列表
            const messages = [...this.data.messages, newMessage];
            const formattedMessages = this.formatMessages(messages);

            // 更新视图
            this.setData({
                messages,
                formattedMessages,
                scrollToView: `msg-${messages.length - 1}`
            });
        },

        // 处理拒绝来电
        onCallDeclined(e: WechatMiniprogram.CustomEvent) {
            console.log('用户拒绝了来电:', e.detail);

            // 隐藏来电界面
            this.setData({ showIncomingCall: false });

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.customFlags = conditionState.customFlags || {};
            conditionState.customFlags.callAccepted = false;
            conditionState.customFlags.callStatus = 'declined';
            conditionState.customFlags.callerName = e.detail.callerName;
            conditionState.customFlags.callerId = e.detail.callerId;

            // 更新状态
            this.setData({ conditionState }, () => {
                // 在状态更新完成后检查转换
                this.checkAndTransitionBasedOnFlags();
            });

            // 创建一条系统消息，表示拒绝了来电
            const newMessage: EventMessage = {
                id: `call-declined-${Date.now()}`,
                type: 'message',
                role: 'system',
                content: `拒绝了 ${e.detail.callerName} 的来电`
            };

            // 添加消息到列表
            const messages = [...this.data.messages, newMessage];
            const formattedMessages = this.formatMessages(messages);

            // 更新视图
            this.setData({
                messages,
                formattedMessages,
                scrollToView: `msg-${messages.length - 1}`
            });
        },

        // 处理来电开始
        onCallStarted(e: WechatMiniprogram.CustomEvent) {
            console.log('来电开始:', e.detail);
        },

        // 处理通话结束
        onCallEnded(e: WechatMiniprogram.CustomEvent) {
            console.log('通话已结束:', e.detail);

            // 隐藏通话中界面
            this.setData({ showOngoingCall: false });

            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.customFlags = conditionState.customFlags || {};
            conditionState.customFlags.callEnded = true;
            conditionState.customFlags.callDuration = e.detail.duration;
            conditionState.customFlags.formattedCallDuration = e.detail.formattedDuration;

            // 更新状态
            this.setData({ conditionState }, () => {
                // 在状态更新完成后立即检查转换，不等待用户交互
                setTimeout(() => {
                    this.checkAndTransitionBasedOnFlags();
                }, 500);
            });

            // 创建一条系统消息，表示通话已结束
            const newMessage: EventMessage = {
                id: `call-ended-${Date.now()}`,
                type: 'message',
                role: 'system',
                content: `结束了与 ${e.detail.callerName} 的通话，通话时长 ${e.detail.formattedDuration}`
            };

            // 添加消息到列表
            const messages = [...this.data.messages, newMessage];
            const formattedMessages = this.formatMessages(messages);

            // 更新视图
            this.setData({
                messages,
                formattedMessages,
                scrollToView: `msg-${messages.length - 1}`
            });
        },

        // 处理通话中事件
        onCallOngoing(e: WechatMiniprogram.CustomEvent) {
            console.log('通话中事件:', e.detail);
        },

        // 处理麦克风状态切换
        onMicrophoneToggled(e: WechatMiniprogram.CustomEvent) {
            console.log('麦克风状态切换:', e.detail);
            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.customFlags = conditionState.customFlags || {};
            conditionState.customFlags.isMicrophoneMuted = e.detail.isMuted;

            // 更新状态
            this.setData({ conditionState });
        },

        // 处理扬声器状态切换
        onSpeakerToggled(e: WechatMiniprogram.CustomEvent) {
            console.log('扬声器状态切换:', e.detail);
            // 更新条件状态
            const conditionState = { ...this.data.conditionState };
            conditionState.customFlags = conditionState.customFlags || {};
            conditionState.customFlags.isSpeakerOn = e.detail.isOn;

            // 更新状态
            this.setData({ conditionState });
        },

        // 主动触发来电
        showIncomingCall(options: {
            callerName?: string;
            avatarUrl?: string;
            callerId?: string;
            callStatus?: string;
            ringtonePath?: string;
        }) {
            const incomingCallData = {
                callerName: options.callerName || this.data.metadata.opponent.nickname,
                avatarUrl: options.avatarUrl || this.data.metadata.opponent.avatarUrl || '/assets/icons/default-avatar.svg',
                callerId: options.callerId || `call-${Date.now()}`,
                callStatus: options.callStatus || '来电',
                ringtonePath: options.ringtonePath || '/assets/audio/ringtone.mp3'
            };

            // 更新状态
            this.setData({
                incomingCallData,
                showIncomingCall: true
            });

            // 获取来电组件实例并调用显示方法
            const incomingCallComponent = this.selectComponent('#incomingCall');
            if (incomingCallComponent) {
                incomingCallComponent.showIncomingCall(incomingCallData);
            }
        },
    }
}); 