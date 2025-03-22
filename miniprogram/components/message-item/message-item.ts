Component({
    /**
     * 组件的属性列表
     */
    properties: {
        // 消息类型: text-文本, image-图片, voice-语音, system-系统消息
        type: {
            type: String,
            value: 'text'
        },
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
        // 消息发送状态: sending-发送中, success-发送成功, failed-发送失败, read-已读
        status: {
            type: String,
            value: ''
        },
        // 发送时间戳
        timestamp: {
            type: Number,
            value: 0
        },
        // 是否显示时间
        showTimestamp: {
            type: Boolean,
            value: false
        },
        // 用户头像
        avatar: {
            type: String,
            value: ''
        },
        // 用户昵称
        nickname: {
            type: String,
            value: ''
        },
        // 是否显示用户名
        showName: {
            type: Boolean,
            value: false
        },
        // 语音时长(单位:秒)
        duration: {
            type: Number,
            value: 0
        },
        // 文本消息是否可选择
        selectable: {
            type: Boolean,
            value: true
        },
        // 即使是自己发送的消息也显示头像
        alwaysShowAvatar: {
            type: Boolean,
            value: false
        },
        // 即使是自己发送的消息也显示昵称
        alwaysShowName: {
            type: Boolean,
            value: false
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        formatTime: '' // 格式化后的时间
    },

    /**
     * 数据监听器
     */
    observers: {
        'timestamp': function (timestamp) {
            if (timestamp) {
                this.formatTimeStamp(timestamp);
            }
        }
    },

    /**
     * 组件的方法列表
     */
    methods: {
        // 格式化时间戳
        formatTimeStamp(timestamp: number) {
            const date = new Date(timestamp);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            this.setData({
                formatTime: `${hours}:${minutes}`
            });
        },

        // 点击消息
        onMessageTap() {
            this.triggerEvent('messagetap', {
                type: this.properties.type,
                content: this.properties.content
            });
        },

        // 长按消息
        onMessageLongPress() {
            this.triggerEvent('messagelongpress', {
                type: this.properties.type,
                content: this.properties.content
            });
        },

        // 点击图片消息
        onImageTap() {
            wx.previewImage({
                urls: [this.properties.content],
                current: this.properties.content
            });

            this.triggerEvent('imagetap', {
                url: this.properties.content
            });
        },

        // 点击语音消息
        onVoiceTap() {
            this.triggerEvent('voicetap', {
                content: this.properties.content,
                duration: this.properties.duration
            });
        },

        // 点击头像
        onAvatarTap() {
            this.triggerEvent('avatartap', {
                nickname: this.properties.nickname,
                avatar: this.properties.avatar
            });
        }
    }
}) 