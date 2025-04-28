import { getCloudFileID } from '../../utils/cloudAudio';

// Cloud storage base path
const CLOUD_BASE_PATH = 'cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/assets/videos/';

// Available video options
const VIDEO_OPTIONS = [
    'transparent-hamburger.mp4',
    '002.mp4',
    '003.mp4',
    '004.mp4',
    '005.mp4',
    '006.mp4',
    '007.mp4',
    '008.mp4',
    '009.mp4',
    '010.mp4',
];

// Get a random video URL from the available options
const getRandomVideoUrl = (): string => {
    const randomIndex = Math.floor(Math.random() * VIDEO_OPTIONS.length);
    return CLOUD_BASE_PATH + VIDEO_OPTIONS[randomIndex];
};

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
        progressPercent: 0,
        // Comment related data
        showCommentInput: false,
        commentText: '',
        // Swipe detection data
        touchStartY: 0,
        touchStartTime: 0,
        // Animation control
        animationClass: '',
        isAnimating: false // Prevent multiple swipes during animation
    },

    /**
     * Lifecycle function--Called when page load
     */
    onLoad(options: { videoUrl?: string }) {
        // Get video URL from page parameters or randomly select one
        let videoUrl = '';

        if (options && options.videoUrl) {
            // If a video URL is provided, use it
            videoUrl = options.videoUrl;

            // If it's not a cloud path, convert it
            if (!videoUrl.startsWith('cloud://')) {
                videoUrl = getCloudFileID(videoUrl);
            }
        } else {
            // No video specified, randomly select one
            videoUrl = getRandomVideoUrl();
        }

        this.setData({ videoUrl });

        // Initialize video context
        this.setData({
            videoContext: wx.createVideoContext('foodVideo', this)
        });

        // Start playing the initial video
        this.playCurrentVideo();
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
        // Play animation immediately when clicked
        if (!this.data.isLiked) {
            // Only play animation when liking (not when unliking)
            this.setData({ isLiked: true });

            // Optional: Play a like sound effect
            // const audioContext = wx.createInnerAudioContext();
            // audioContext.src = '/assets/audio/like.mp3';
            // audioContext.play();

            console.log('Video liked');
        } else {
            // When unliking, simply toggle the state
            this.setData({ isLiked: false });
            console.log('Video unliked');
        }
    },

    onSaveClick() {
        // Play animation immediately when clicked
        if (!this.data.isSaved) {
            // Only play animation when saving (not when unsaving)
            this.setData({ isSaved: true });

            console.log('Video saved');
        } else {
            // When unsaving, simply toggle the state
            this.setData({ isSaved: false });
            console.log('Video unsaved');
        }
    },

    onCommentClick() {
        // Show comment input area
        this.setData({
            showCommentInput: true
        });
        console.log('Comment input opened');
    },

    // Handle comment input change
    onCommentInput(e: WechatMiniprogram.Input) {
        this.setData({
            commentText: e.detail.value
        });
    },

    // Handle comment submission
    sendComment() {
        const { commentText } = this.data;
        if (commentText.trim()) {
            console.log('Comment submitted:', commentText);

            // Here you would typically send the comment to your backend
            // For now, let's just show a success message
            wx.showToast({
                title: '评论已发送',
                icon: 'success',
                duration: 1500
            });

            // Clear comment text and hide input
            this.setData({
                commentText: '',
                showCommentInput: false
            });
        } else {
            wx.showToast({
                title: '请输入评论内容',
                icon: 'none',
                duration: 1500
            });
        }
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
    },

    // --- Touch Event Handlers for Swiping ---
    onTouchStart(e: WechatMiniprogram.TouchEvent) {
        this.setData({
            touchStartY: e.touches[0].clientY,
            touchStartTime: e.timeStamp
        });
    },

    onTouchEnd(e: WechatMiniprogram.TouchEvent) {
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = e.timeStamp;
        const startY = this.data.touchStartY;
        const startTime = this.data.touchStartTime;

        const deltaY = touchEndY - startY;
        const deltaTime = touchEndTime - startTime;

        // Detect swipe: significant vertical movement in a short time
        if (deltaTime < 500 && Math.abs(deltaY) > 50) {
            if (deltaY < 0) {
                console.log('Swipe Up detected');
                this.loadNextVideo('up');
            } else {
                console.log('Swipe Down detected');
                this.loadNextVideo('down');
            }
        }

        // Reset touch start data
        this.setData({
            touchStartY: 0,
            touchStartTime: 0
        });
    },

    // --- Load and Play Next Video ---
    loadNextVideo(direction: 'up' | 'down' = 'up') { // Default direction if called without swipe
        // Prevent starting a new animation if one is already in progress
        if (this.data.isAnimating) {
            console.log('Animation already in progress, swipe ignored.');
            return;
        }

        // Stop current video if playing
        if (this.data.videoContext && this.data.isPlaying) {
            this.data.videoContext.stop();
        }

        const nextVideoUrl = getRandomVideoUrl();
        console.log('Loading next video:', nextVideoUrl, 'Direction:', direction);

        // Determine animation classes based on swipe direction
        const outClass = direction === 'up' ? 'slide-out-up' : 'slide-out-down';
        const inClass = direction === 'up' ? 'slide-in-down' : 'slide-in-up';

        // Start the outgoing animation
        this.setData({ animationClass: outClass, isAnimating: true });

        // Wait for the outgoing animation to finish (500ms matches CSS)
        setTimeout(() => {
            // Reset state for the new video and apply incoming animation
            this.setData({
                videoUrl: nextVideoUrl,
                isPlaying: false,
                isLiked: false,
                isSaved: false,
                commentCount: 0,
                currentTime: '00:00',
                duration: '00:00',
                progressPercent: 0,
                showCommentInput: false,
                commentText: '',
                animationClass: inClass // Apply incoming animation class
            }, () => {
                // Ensure the video context is valid
                if (!this.data.videoContext) {
                    this.setData({
                        videoContext: wx.createVideoContext('foodVideo', this)
                    });
                }
                // Play the new video
                this.playCurrentVideo();

                // Wait for the incoming animation to finish, then clear the class and allow swiping again
                setTimeout(() => {
                    this.setData({ animationClass: '', isAnimating: false });
                    console.log('Incoming animation finished.');
                }, 500); // Animation duration
            });
        }, 500); // Outgoing animation duration
    },

    // --- Helper to Play Current Video ---
    playCurrentVideo() {
        // Use timeout to ensure video is ready
        setTimeout(() => {
            if (this.data.videoContext) {
                console.log('Attempting to play current video');
                this.data.videoContext.play();
            } else {
                console.error('Video context not available to play video');
                // Attempt to re-initialize context
                const videoContext = wx.createVideoContext('foodVideo', this);
                if (videoContext) {
                    this.setData({ videoContext: videoContext }, () => {
                        this.data.videoContext?.play();
                    });
                }
            }
        }, 100); // Short delay
    }
}); 