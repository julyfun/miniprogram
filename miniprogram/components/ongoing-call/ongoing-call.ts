import { downloadCloudAudio, getCloudFileID } from '../../utils/cloudAudio';

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
        audioPath: {
            type: String,
            value: 'cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/assets/audio/ringtone.mp3'
        }
    },

    /**
     * Component initial data
     */
    data: {
        audioContext: null as WechatMiniprogram.InnerAudioContext | null,
        callStartTime: 0,
        callDuration: '00:00',
        isMicrophoneMuted: false,
        isSpeakerOn: false,
        durationTimer: null as number | null,
        localAudioPath: '', // Store the local temporary file path
        isDownloading: false // Track download state to prevent multiple downloads
    },

    /**
     * Component methods
     */
    methods: {
        // 显示通话界面
        showOngoingCall(options?: {
            callerName?: string;
            avatarUrl?: string;
            callerId?: string;
            audioPath?: string;
        }) {
            // 更新属性
            if (options) {
                if (options.callerName) this.setData({ callerName: options.callerName });
                if (options.avatarUrl) this.setData({ avatarUrl: options.avatarUrl });
                if (options.callerId) this.setData({ callerId: options.callerId });
                if (options.audioPath) this.setData({ audioPath: options.audioPath });
            }

            // 记录通话开始时间
            const callStartTime = Date.now();

            // 显示界面
            this.setData({
                visible: true,
                callStartTime,
                callDuration: '00:00',
                isMicrophoneMuted: false,
                isSpeakerOn: false
            });

            // 开始计时
            this.startTimer();

            // 播放通话音频
            this.playCallAudio();

            // 触发通话开始事件
            this.triggerEvent('callOngoing', {
                callerId: this.data.callerId,
                callerName: this.data.callerName,
                startTime: callStartTime
            });
        },

        // 隐藏通话界面
        hideOngoingCall() {
            this.stopTimer();
            this.stopCallAudio();
            this.setData({ visible: false });
        },

        // 开始计时器
        startTimer() {
            // 清除之前的计时器
            this.stopTimer();

            // 开始新的计时器
            const durationTimer = setInterval(() => {
                const now = Date.now();
                const duration = now - this.data.callStartTime;
                this.setData({
                    callDuration: this.formatDuration(duration)
                });
            }, 1000);

            this.setData({ durationTimer });
        },

        // 停止计时器
        stopTimer() {
            if (this.data.durationTimer) {
                clearInterval(this.data.durationTimer);
                this.setData({ durationTimer: null });
            }
        },

        // 格式化通话时长
        formatDuration(milliseconds: number): string {
            const totalSeconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        },

        // 播放通话音频
        playCallAudio() {
            // 停止之前的音频
            this.stopCallAudio();

            // 设置下载状态
            this.setData({ isDownloading: true });

            console.log('尝试播放通话音频:', this.data.audioPath);

            // 确保是云存储路径，如果不是则转换
            const fileID = this.data.audioPath.startsWith('cloud://') ?
                this.data.audioPath :
                getCloudFileID(this.data.audioPath);

            // 从云存储下载文件
            downloadCloudAudio(fileID)
                .then(tempFilePath => {
                    this.setData({
                        localAudioPath: tempFilePath,
                        isDownloading: false
                    });
                    console.log('通话音频下载成功，本地路径:', tempFilePath);
                    this.playLocalCallAudio(tempFilePath);
                })
                .catch(error => {
                    console.error('通话音频下载失败:', error);
                    this.setData({ isDownloading: false });
                    // 播放失败自动结束通话
                    this.endCall();
                });
        },

        // 播放本地临时文件中的通话音频
        playLocalCallAudio(filePath: string) {
            // 创建新的音频上下文
            const audioContext = wx.createInnerAudioContext();
            audioContext.src = filePath;
            audioContext.loop = false; // 只播放一次，不循环
            audioContext.autoplay = true;

            audioContext.onPlay(() => {
                console.log('通话音频开始播放');
                this.setData({ audioContext });
            });

            audioContext.onEnded(() => {
                console.log('通话音频播放结束，自动结束通话');
                // 音频播放完毕后自动结束通话
                this.endCall();
            });

            audioContext.onError((err) => {
                console.error('通话音频播放错误:', err);
                // 出错时也自动结束通话
                this.endCall();
            });
        },

        // 停止通话音频
        stopCallAudio() {
            if (this.data.audioContext) {
                this.data.audioContext.stop();
                this.data.audioContext.destroy();
                this.setData({ audioContext: null });
            }
        },

        // 切换麦克风状态
        toggleMicrophone() {
            this.setData({ isMicrophoneMuted: !this.data.isMicrophoneMuted });
            // 触发麦克风状态变更事件
            this.triggerEvent('microphoneToggled', {
                isMuted: this.data.isMicrophoneMuted
            });
        },

        // 切换扬声器状态
        toggleSpeaker() {
            this.setData({ isSpeakerOn: !this.data.isSpeakerOn });
            // 触发扬声器状态变更事件
            this.triggerEvent('speakerToggled', {
                isOn: this.data.isSpeakerOn
            });

            // 如果启用了扬声器，调整系统音量（模拟）
            if (this.data.isSpeakerOn && this.data.audioContext) {
                this.data.audioContext.volume = 1.0; // 最大音量
            } else if (this.data.audioContext) {
                this.data.audioContext.volume = 0.7; // 较小音量
            }
        },

        // 结束通话
        endCall() {
            this.stopTimer();
            this.stopCallAudio();
            this.setData({ visible: false });

            // 计算通话时长
            const now = Date.now();
            const callDuration = now - this.data.callStartTime;

            // 触发通话结束事件
            this.triggerEvent('callEnded', {
                callerId: this.data.callerId,
                callerName: this.data.callerName,
                duration: callDuration,
                formattedDuration: this.formatDuration(callDuration)
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
            // 组件卸载时，确保停止计时器和音频
            this.stopTimer();
            this.stopCallAudio();
        }
    }
}); 