import { getCloudFileID } from '../../utils/cloudAudio';

// Default video URL in the cloud storage
const DEFAULT_VIDEO_URL = 'cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/assets/videos/transparent-hamburger.mp4';

// Format time in seconds to MM:SS format
const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

Page({
    /**
     * Page initial data
     */
    data: {
        videoUrl: '',
        videoContext: null as WechatMiniprogram.VideoContext | null,
        isPlaying: false,
        isLiked: false,
        isSaved: false,
        commentCount: 0,
        // Progress bar related data
        currentTime: '00:00',
        duration: '00:00',
        progressPercent: 0
    },

    /**
     * Lifecycle function--Called when page load
     */
    onLoad(options: { videoUrl?: string }) {
        // Get video URL from page parameters or use default
        let videoUrl = DEFAULT_VIDEO_URL;

        if (options && options.videoUrl) {
            // If a video URL is provided, use it
            videoUrl = options.videoUrl;

            // If it's not a cloud path, convert it
            if (!videoUrl.startsWith('cloud://')) {
                videoUrl = getCloudFileID(videoUrl);
            }
        }

        this.setData({ videoUrl });

        // Initialize video context
        this.setData({
            videoContext: wx.createVideoContext('foodVideo', this)
        });
    },

    /**
     * Video event handlers
     */
    onVideoPlay() {
        this.setData({ isPlaying: true });
        console.log('Video started playing');
    },

    onVideoPause() {
        this.setData({ isPlaying: false });
        console.log('Video paused');
    },

    onVideoEnded() {
        this.setData({
            isPlaying: false,
            currentTime: '00:00',
            progressPercent: 0
        });
        console.log('Video playback ended');

        // Optionally restart the video
        setTimeout(() => {
            if (this.data.videoContext) {
                this.data.videoContext.seek(0);
                this.data.videoContext.play();
            }
        }, 2000);
    },

    /**
     * Track video progress
     */
    onVideoTimeUpdate(e: WechatMiniprogram.VideoTimeUpdate) {
        const { currentTime, duration } = e.detail;

        // Calculate progress percentage
        const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

        // Format time strings
        const formattedCurrentTime = formatTime(currentTime);
        const formattedDuration = formatTime(duration);

        this.setData({
            currentTime: formattedCurrentTime,
            duration: formattedDuration,
            progressPercent
        });
    },

    /**
     * Toggle play/pause when video is tapped
     */
    onVideoTap() {
        if (this.data.videoContext) {
            if (this.data.isPlaying) {
                this.data.videoContext.pause();
            } else {
                this.data.videoContext.play();
            }
        }
    },

    /**
     * Interaction button handlers
     */
    onLikeClick() {
        this.setData({ isLiked: !this.data.isLiked });
        console.log(`Video ${this.data.isLiked ? 'liked' : 'unliked'}`);
    },

    onSaveClick() {
        this.setData({ isSaved: !this.data.isSaved });
        console.log(`Video ${this.data.isSaved ? 'saved' : 'unsaved'}`);
    },

    onCommentClick() {
        console.log('Comment button clicked');
        // This would open a comment interface in a full implementation
    },

    /**
     * Lifecycle function--Called when page is initially rendered
     */
    onReady() {
        // You can perform additional initialization when the page is ready
    },

    /**
     * Lifecycle function--Called when page show
     */
    onShow() {
        // You can resume video playback here if needed
        if (this.data.videoContext && !this.data.isPlaying) {
            this.data.videoContext.play();
        }
    },

    /**
     * Lifecycle function--Called when page hide
     */
    onHide() {
        // Pause video when page is hidden
        if (this.data.videoContext && this.data.isPlaying) {
            this.data.videoContext.pause();
        }
    },

    /**
     * Lifecycle function--Called when page unload
     */
    onUnload() {
        // Clean up resources when page is unloaded
        if (this.data.videoContext) {
            this.data.videoContext.stop();
        }
    }
}); 