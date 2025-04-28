import { getCloudFileID } from '../../utils/cloudAudio';

// Cloud storage base path
const CLOUD_BASE_PATH = 'cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/assets/videos/';

// Available video options
const VIDEO_OPTIONS = [
    'transparent-hamburger.mp4',
    '002.mp4',
    '003.mp4',
    '004.mp4',
    '005.mp4'
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

// Interface for video item
interface VideoItem {
    id: string;
    url: string;
    isPlaying: boolean;
    isLiked: boolean;
    isSaved: boolean;
    commentCount: number;
    currentTime: string;
    duration: string;
    progressPercent: number;
    videoContext: WechatMiniprogram.VideoContext | null;
}

Page({
    /**
     * Page initial data
     */
    data: {
        videoList: [] as VideoItem[],
        currentIndex: 0,
        // Comment related data
        showCommentInput: false,
        commentText: '',
        // UI controls
        showSwipeHint: true
    },

    /**
     * Lifecycle function--Called when page load
     */
    onLoad(options: { videoUrl?: string }) {
        // Initialize with 3 videos (current, next, and previous)
        const videoList: VideoItem[] = [];

        // If a specific video URL is provided, use it as the first video
        if (options && options.videoUrl) {
            let videoUrl = options.videoUrl;
            // If it's not a cloud path, convert it
            if (!videoUrl.startsWith('cloud://')) {
                videoUrl = getCloudFileID(videoUrl);
            }
            videoList.push(this.createVideoItem(videoUrl));
        } else {
            // No video specified, add a random one
            videoList.push(this.createVideoItem(getRandomVideoUrl()));
        }

        // Add two more random videos
        videoList.push(this.createVideoItem(getRandomVideoUrl()));
        videoList.push(this.createVideoItem(getRandomVideoUrl()));

        this.setData({ videoList });

        // Check if user has seen the swipe hint before
        try {
            const hasSeenHint = wx.getStorageSync('food_guide_swipe_hint_seen');
            if (hasSeenHint) {
                this.setData({ showSwipeHint: false });
            }
        } catch (e) {
            console.error('Failed to get storage:', e);
        }
    },

    /**
     * Create a new video item with default values
     */
    createVideoItem(url: string): VideoItem {
        return {
            id: `video-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            url,
            isPlaying: false,
            isLiked: false,
            isSaved: false,
            commentCount: 0,
            currentTime: '00:00',
            duration: '00:00',
            progressPercent: 0,
            videoContext: null
        };
    },

    /**
     * Initialize video context for a specific video
     */
    initVideoContext(index: number) {
        const { videoList } = this.data;
        if (index >= 0 && index < videoList.length) {
            const videoId = videoList[index].id;
            const videoContext = wx.createVideoContext(videoId, this);
            videoList[index].videoContext = videoContext;
            this.setData({ videoList });
            return videoContext;
        }
        return null;
    },

    /**
     * Handle swiper change event
     */
    onSwiperChange(e: WechatMiniprogram.TouchEvent) {
        const { current } = e.detail;
        const { currentIndex, videoList } = this.data;

        // If this is the first swipe, hide the swipe hint and save to storage
        if (this.data.showSwipeHint) {
            this.setData({ showSwipeHint: false });
            try {
                wx.setStorageSync('food_guide_swipe_hint_seen', true);
            } catch (e) {
                console.error('Failed to set storage:', e);
            }
        }

        // Pause the previous video
        if (videoList[currentIndex] && videoList[currentIndex].videoContext) {
            videoList[currentIndex].videoContext.pause();
            videoList[currentIndex].isPlaying = false;
        }

        // Update current index
        this.setData({ currentIndex: current });

        // Initialize video context if needed and play the current video
        if (!videoList[current].videoContext) {
            const videoContext = this.initVideoContext(current);
            if (videoContext) {
                videoContext.play();
            }
        } else {
            videoList[current].videoContext.play();
        }

        videoList[current].isPlaying = true;
        this.setData({ videoList });

        // Check if we need to add more videos
        if (current === videoList.length - 1) {
            this.addNewVideo();
        }
    },

    /**
     * Add a new random video to the list
     */
    addNewVideo() {
        const { videoList } = this.data;
        const newVideo = this.createVideoItem(getRandomVideoUrl());
        videoList.push(newVideo);
        this.setData({ videoList });
    },

    /**
     * Video event handlers
     */
    onVideoPlay(e: WechatMiniprogram.TouchEvent) {
        const videoId = e.currentTarget.id;
        const { videoList } = this.data;

        // Find and update the video that started playing
        const index = videoList.findIndex(v => v.id === videoId);
        if (index !== -1) {
            videoList[index].isPlaying = true;
            this.setData({ videoList });
        }
        console.log(`Video ${videoId} started playing`);
    },

    onVideoPause(e: WechatMiniprogram.TouchEvent) {
        const videoId = e.currentTarget.id;
        const { videoList } = this.data;

        // Find and update the video that was paused
        const index = videoList.findIndex(v => v.id === videoId);
        if (index !== -1) {
            videoList[index].isPlaying = false;
            this.setData({ videoList });
        }
        console.log(`Video ${videoId} paused`);
    },

    onVideoEnded(e: WechatMiniprogram.TouchEvent) {
        const videoId = e.currentTarget.id;
        const { videoList } = this.data;

        // Find and update the video that ended
        const index = videoList.findIndex(v => v.id === videoId);
        if (index !== -1) {
            videoList[index].isPlaying = false;
            videoList[index].currentTime = '00:00';
            videoList[index].progressPercent = 0;
            this.setData({ videoList });

            // Optionally restart the video
            setTimeout(() => {
                if (videoList[index].videoContext) {
                    videoList[index].videoContext.seek(0);
                    videoList[index].videoContext.play();
                    videoList[index].isPlaying = true;
                    this.setData({ videoList });
                }
            }, 2000);
        }
        console.log(`Video ${videoId} playback ended`);
    },

    /**
     * Track video progress
     */
    onVideoTimeUpdate(e: WechatMiniprogram.VideoTimeUpdate) {
        const videoId = e.currentTarget.id;
        const { currentTime, duration } = e.detail;
        const { videoList } = this.data;

        // Find and update the video progress
        const index = videoList.findIndex(v => v.id === videoId);
        if (index !== -1) {
            // Calculate progress percentage
            const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

            // Format time strings
            const formattedCurrentTime = formatTime(currentTime);
            const formattedDuration = formatTime(duration);

            videoList[index].currentTime = formattedCurrentTime;
            videoList[index].duration = formattedDuration;
            videoList[index].progressPercent = progressPercent;

            this.setData({ videoList });
        }
    },

    /**
     * Toggle play/pause when video is tapped
     */
    onVideoTap(e: WechatMiniprogram.TouchEvent) {
        const videoId = e.currentTarget.id;
        const { videoList } = this.data;

        // Find the tapped video
        const index = videoList.findIndex(v => v.id === videoId);
        if (index !== -1 && videoList[index].videoContext) {
            if (videoList[index].isPlaying) {
                videoList[index].videoContext.pause();
                videoList[index].isPlaying = false;
            } else {
                videoList[index].videoContext.play();
                videoList[index].isPlaying = true;
            }
            this.setData({ videoList });
        }
    },

    /**
     * Interaction button handlers
     */
    onLikeClick(e: WechatMiniprogram.TouchEvent) {
        const index = parseInt(e.currentTarget.dataset.index);
        const { videoList } = this.data;

        if (index >= 0 && index < videoList.length) {
            // Toggle like state
            videoList[index].isLiked = !videoList[index].isLiked;
            this.setData({ videoList });

            console.log(`Video ${index} ${videoList[index].isLiked ? 'liked' : 'unliked'}`);
        }
    },

    onSaveClick(e: WechatMiniprogram.TouchEvent) {
        const index = parseInt(e.currentTarget.dataset.index);
        const { videoList } = this.data;

        if (index >= 0 && index < videoList.length) {
            // Toggle save state
            videoList[index].isSaved = !videoList[index].isSaved;
            this.setData({ videoList });

            console.log(`Video ${index} ${videoList[index].isSaved ? 'saved' : 'unsaved'}`);
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
        const { commentText, currentIndex, videoList } = this.data;
        if (commentText.trim()) {
            console.log(`Comment submitted for video ${currentIndex}:`, commentText);

            // Here you would typically send the comment to your backend
            // For now, let's just show a success message
            wx.showToast({
                title: '评论已发送',
                icon: 'success',
                duration: 1500
            });

            // Increment comment count for the current video
            if (currentIndex >= 0 && currentIndex < videoList.length) {
                videoList[currentIndex].commentCount++;
                this.setData({ videoList });
            }

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
        // Initialize video context for the first video
        this.initVideoContext(0);

        // Start playing the first video
        const { videoList } = this.data;
        if (videoList[0].videoContext) {
            videoList[0].videoContext.play();
            videoList[0].isPlaying = true;
            this.setData({ videoList });
        }
    },

    /**
     * Lifecycle function--Called when page show
     */
    onShow() {
        // Resume video playback if needed
        const { currentIndex, videoList } = this.data;
        if (currentIndex >= 0 && currentIndex < videoList.length &&
            videoList[currentIndex].videoContext && !videoList[currentIndex].isPlaying) {
            videoList[currentIndex].videoContext.play();
            videoList[currentIndex].isPlaying = true;
            this.setData({ videoList });
        }
    },

    /**
     * Lifecycle function--Called when page hide
     */
    onHide() {
        // Pause all videos when page is hidden
        const { videoList } = this.data;
        videoList.forEach((video, index) => {
            if (video.videoContext && video.isPlaying) {
                video.videoContext.pause();
                video.isPlaying = false;
            }
        });
        this.setData({ videoList });
    },

    /**
     * Lifecycle function--Called when page unload
     */
    onUnload() {
        // Stop all videos when page is unloaded
        const { videoList } = this.data;
        videoList.forEach((video, index) => {
            if (video.videoContext) {
                video.videoContext.stop();
            }
        });
    }
}); 