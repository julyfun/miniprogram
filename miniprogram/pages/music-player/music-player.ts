interface IPageData {
    musicSrc: string;
    musicName: string;
    isPlaying: boolean;
    progressWidth: number;
    currentTime: string;
    totalTime: string;
}

// Helper function to format time in mm:ss
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

Page<IPageData, WechatMiniprogram.IAnyObject>({
    data: {
        musicSrc: '',
        musicName: '正在加载...',
        isPlaying: false,
        progressWidth: 0,
        currentTime: '00:00',
        totalTime: '00:00'
    },

    // Audio Context for playing music
    audioCtx: null as WechatMiniprogram.InnerAudioContext | null,

    // Timer for updating progress
    updateTimer: null as number | null,

    onLoad: function (options) {
        // Get the music source from URL parameters
        if (options.src) {
            this.setData({
                musicSrc: decodeURIComponent(options.src),
                musicName: options.name ? decodeURIComponent(options.name) : '音乐'
            });

            this.initAudioContext();
        } else {
            wx.showToast({
                title: '音乐链接无效',
                icon: 'none'
            });

            setTimeout(() => {
                wx.navigateBack();
            }, 1500);
        }
    },

    onUnload: function () {
        // Cleanup: stop audio and clear timer
        this.stopAudio();
    },

    initAudioContext: function () {
        // Create audio context
        this.audioCtx = wx.createInnerAudioContext();
        this.audioCtx.src = this.data.musicSrc;
        this.audioCtx.loop = false;

        // Set up event listeners
        this.audioCtx.onCanplay(() => {
            console.log('Audio can play');
            // Start playing automatically when ready
            this.playAudio();
        });

        this.audioCtx.onTimeUpdate(() => {
            if (this.audioCtx) {
                const duration = this.audioCtx.duration || 0;
                const currentTime = this.audioCtx.currentTime || 0;
                const progress = (currentTime / duration) * 100;

                this.setData({
                    progressWidth: progress,
                    currentTime: formatTime(currentTime),
                    totalTime: formatTime(duration)
                });
            }
        });

        this.audioCtx.onEnded(() => {
            console.log('Audio playback finished');
            this.setData({
                isPlaying: false,
                progressWidth: 0,
                currentTime: '00:00'
            });
        });

        this.audioCtx.onError((err: WechatMiniprogram.InnerAudioContextOnErrorCallbackResult) => {
            console.error('Audio error:', err);
            wx.showToast({
                title: '音乐播放失败',
                icon: 'none'
            });
        });
    },

    playAudio: function () {
        if (this.audioCtx) {
            this.audioCtx.play();
            this.setData({ isPlaying: true });

            // Update UI every second
            if (this.updateTimer === null) {
                this.updateTimer = setInterval(() => {
                    if (this.audioCtx && this.audioCtx.duration) {
                        const progress = (this.audioCtx.currentTime / this.audioCtx.duration) * 100;
                        this.setData({
                            progressWidth: progress,
                            currentTime: formatTime(this.audioCtx.currentTime)
                        });
                    }
                }, 1000);
            }
        }
    },

    pauseAudio: function () {
        if (this.audioCtx) {
            this.audioCtx.pause();
            this.setData({ isPlaying: false });

            // Clear update timer
            if (this.updateTimer !== null) {
                clearInterval(this.updateTimer);
                this.updateTimer = null;
            }
        }
    },

    stopAudio: function () {
        if (this.audioCtx) {
            this.audioCtx.stop();
            this.setData({ isPlaying: false, progressWidth: 0, currentTime: '00:00' });

            // Clear update timer
            if (this.updateTimer !== null) {
                clearInterval(this.updateTimer);
                this.updateTimer = null;
            }

            // Destroy the context
            this.audioCtx.destroy();
            this.audioCtx = null;
        }
    },

    // Toggle play/pause
    togglePlay: function () {
        if (this.data.isPlaying) {
            this.pauseAudio();
        } else {
            this.playAudio();
        }
    },

    // Handle previous track (dummy function for now)
    playPrevious: function () {
        wx.showToast({
            title: '没有更多音乐',
            icon: 'none'
        });
    },

    // Handle next track (dummy function for now)
    playNext: function () {
        wx.showToast({
            title: '没有更多音乐',
            icon: 'none'
        });
    },

    // Go back to previous page
    goBack: function () {
        this.stopAudio();
        wx.navigateBack();
    }
}); 