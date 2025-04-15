Component({
    /**
     * Component properties
     */
    properties: {
        visible: {
            type: Boolean,
            value: false
        },
        callerName: {
            type: String,
            value: '未知联系人'
        },
        avatarUrl: {
            type: String,
            value: '/assets/icons/default-avatar.svg'
        },
        callerId: {
            type: String,
            value: ''
        },
        callStatus: {
            type: String,
            value: '来电'
        },
        ringtonePath: {
            type: String,
            value: '/assets/audio/ringtone.mp3'
        }
    },

    /**
     * Component initial data
     */
    data: {
        audioContext: null as WechatMiniprogram.InnerAudioContext | null,
        isRinging: false
    },

    /**
     * Component methods
     */
    methods: {
        // 显示来电界面并播放铃声
        showIncomingCall(options?: {
            callerName?: string;
            avatarUrl?: string;
            callerId?: string;
            callStatus?: string;
            ringtonePath?: string;
        }) {
            // 更新属性
            if (options) {
                if (options.callerName) this.setData({ callerName: options.callerName });
                if (options.avatarUrl) this.setData({ avatarUrl: options.avatarUrl });
                if (options.callerId) this.setData({ callerId: options.callerId });
                if (options.callStatus) this.setData({ callStatus: options.callStatus });
                if (options.ringtonePath) this.setData({ ringtonePath: options.ringtonePath });
            }

            // 显示界面
            this.setData({ visible: true });

            // 播放铃声
            this.playRingtone();

            // 触发事件
            this.triggerEvent('callStarted', {
                callerId: this.data.callerId,
                callerName: this.data.callerName
            });
        },

        // 隐藏来电界面并停止铃声
        hideIncomingCall() {
            this.setData({ visible: false });
            this.stopRingtone();
        },

        // 播放铃声
        playRingtone() {
            // 停止之前的铃声
            this.stopRingtone();

            // 创建新的音频上下文
            const audioContext = wx.createInnerAudioContext();
            audioContext.src = this.data.ringtonePath;
            audioContext.loop = true; // 循环播放直到接听或拒绝
            audioContext.autoplay = true;

            audioContext.onPlay(() => {
                console.log('铃声开始播放');
                this.setData({
                    audioContext,
                    isRinging: true
                });
            });

            audioContext.onError((err) => {
                console.error('铃声播放错误:', err);
                this.setData({ isRinging: false });
            });
        },

        // 停止铃声
        stopRingtone() {
            if (this.data.audioContext) {
                this.data.audioContext.stop();
                this.data.audioContext.destroy();
                this.setData({
                    audioContext: null,
                    isRinging: false
                });
            }
        },

        // 拒绝来电
        onDeclineCall() {
            this.stopRingtone();
            this.setData({ visible: false });

            // 触发拒绝事件
            this.triggerEvent('callDeclined', {
                callerId: this.data.callerId,
                callerName: this.data.callerName
            });
        },

        // 接听来电
        onAcceptCall() {
            this.stopRingtone();
            this.setData({ visible: false });

            // 触发接听事件
            this.triggerEvent('callAccepted', {
                callerId: this.data.callerId,
                callerName: this.data.callerName
            });
        }
    },

    /**
     * Component lifecycle functions
     */
    lifetimes: {
        attached() {
            // 组件加载时
        },
        detached() {
            // 组件卸载时，确保停止铃声
            this.stopRingtone();
        }
    }
}); 