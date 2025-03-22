Component({
    properties: {
        // 消息内容
        content: {
            type: String,
            value: ''
        },
        // 是否是自己发送的消息
        isSelf: {
            type: Boolean,
            value: false
        },
        // 是否显示用户头像
        showAvatar: {
            type: Boolean,
            value: true
        },
        // 头像URL
        avatarUrl: {
            type: String,
            value: ''
        },
        // 气泡类型：text, image, voice, video, file
        type: {
            type: String,
            value: 'text'
        },
        // 图片URL（当type为image时使用）
        imageUrl: {
            type: String,
            value: ''
        },
        // 语音时长（当type为voice时使用）
        voiceDuration: {
            type: Number,
            value: 0
        },
        // 文件名称（当type为file时使用）
        fileName: {
            type: String,
            value: ''
        },
        // 文件大小（当type为file时使用）
        fileSize: {
            type: String,
            value: ''
        }
    },

    data: {
        // 组件内部数据
    },

    methods: {
        // 点击消息
        onTapMessage() {
            this.triggerEvent('tap');
        },

        // 长按消息
        onLongPressMessage() {
            this.triggerEvent('longpress');
        },

        // 点击头像
        onTapAvatar() {
            this.triggerEvent('tapavatar');
        },

        // 图片加载失败
        onImageError() {
            this.triggerEvent('imageerror');
        }
    }
}) 