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

            console.log('显示来电界面，铃声路径:', this.data.ringtonePath);

            // 先播放铃声，确保音频开始播放
            this.playRingtone();

            // 短暂延迟后再显示界面，确保铃声已经开始播放
            setTimeout(() => {
                // 显示界面
                this.setData({ visible: true });

                // 触发事件
                this.triggerEvent('callStarted', {
                    callerId: this.data.callerId,
                    callerName: this.data.callerName
                });
            }, 100);
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

            // 记录铃声路径以便调试
            console.log('尝试播放铃声:', this.data.ringtonePath);

            try {
                // 创建新的音频上下文
                const audioContext = wx.createInnerAudioContext();

                // 配置音频属性
                audioContext.src = this.data.ringtonePath;
                audioContext.loop = true; // 循环播放直到接听或拒绝
                audioContext.volume = 1.0; // 设置最大音量

                // 先设置回调再设置自动播放，避免错过回调
                audioContext.onCanplay(() => {
                    console.log('铃声已准备好播放');
                    // 确保播放开始
                    audioContext.play();
                });

                audioContext.onPlay(() => {
                    console.log('铃声开始播放');
                    this.setData({
                        audioContext,
                        isRinging: true
                    });
                });

                audioContext.onWaiting(() => {
                    console.log('铃声等待加载中');
                });

                audioContext.onError((err) => {
                    console.error('铃声播放错误:', err);
                    // 尝试使用备用铃声
                    this.tryFallbackRingtone(err);
                });

                // 设置完回调后开始播放
                audioContext.autoplay = true;
                audioContext.play();

                // 保存音频上下文引用
                this.setData({ audioContext });

                // 设置安全定时器，确保铃声开始播放
                setTimeout(() => {
                    if (this.data.audioContext && !this.data.isRinging) {
                        console.log('铃声可能未成功播放，尝试重新播放');
                        this.data.audioContext.play();
                    }
                }, 1000);
            } catch (error) {
                console.error('创建音频上下文失败:', error);
                this.tryFallbackRingtone(error);
            }
        },

        // 尝试使用备用铃声
        tryFallbackRingtone(originalError: any) {
            console.log('尝试使用备用铃声');

            // 备用铃声路径列表
            const fallbackPaths = [
                '/assets/audio/ringtone.mp3',
                '/assets/audio/default_ringtone.mp3',
                // 可以添加更多备用铃声
            ];

            // 如果当前路径已经是备用路径之一，找下一个备用路径
            let nextPathIndex = 0;
            if (this.data.ringtonePath) {
                const currentIndex = fallbackPaths.indexOf(this.data.ringtonePath);
                if (currentIndex >= 0 && currentIndex < fallbackPaths.length - 1) {
                    nextPathIndex = currentIndex + 1;
                }
            }

            // 如果已经尝试过所有备用铃声，就放弃
            if (nextPathIndex >= fallbackPaths.length) {
                console.error('所有备用铃声都无法播放:', originalError);
                this.setData({ isRinging: false });
                return;
            }

            const nextRingtonePath = fallbackPaths[nextPathIndex];
            console.log(`尝试备用铃声 ${nextPathIndex + 1}/${fallbackPaths.length}: ${nextRingtonePath}`);

            try {
                // 创建新的音频上下文
                const audioContext = wx.createInnerAudioContext();
                audioContext.src = nextRingtonePath;
                audioContext.loop = true;
                audioContext.volume = 1.0;

                // 设置回调
                audioContext.onCanplay(() => {
                    console.log('备用铃声已准备好播放');
                    audioContext.play();
                });

                audioContext.onPlay(() => {
                    console.log('备用铃声开始播放:', nextRingtonePath);
                    this.setData({
                        audioContext,
                        isRinging: true,
                        ringtonePath: nextRingtonePath
                    });
                });

                audioContext.onError((err) => {
                    console.error('备用铃声播放错误:', err);
                    // 递归尝试下一个备用铃声
                    this.setData({ ringtonePath: nextRingtonePath }, () => {
                        this.tryFallbackRingtone(err);
                    });
                });

                // 开始播放
                audioContext.autoplay = true;
                audioContext.play();

                // 安全检查
                setTimeout(() => {
                    if (!this.data.isRinging) {
                        console.log('备用铃声可能未成功播放，尝试下一个');
                        audioContext.destroy();
                        // 递归尝试下一个备用铃声
                        this.setData({ ringtonePath: nextRingtonePath }, () => {
                            this.tryFallbackRingtone({ reason: '备用铃声未开始播放' });
                        });
                    }
                }, 1000);
            } catch (error) {
                console.error('创建备用音频上下文失败:', error);
                this.setData({ isRinging: false });
            }
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