Component({
    /**
     * 组件的属性列表
     */
    properties: {
        messages: {
            type: Array,
            value: []
        },
        selfAvatar: {
            type: String,
            value: '/assets/icons/default-avatar.svg'
        },
        otherAvatar: {
            type: String,
            value: '/assets/icons/default-avatar.svg'
        },
        scrollIntoView: {
            type: String,
            value: ''
        },
        showTimestamp: {
            type: Boolean,
            value: true
        },
        timeInterval: {
            type: Number,
            value: 300000 // 5分钟显示一次时间戳
        }
    },

    /**
     * 组件的初始数据
     */
    data: {

    },

    /**
     * 组件的方法列表
     */
    methods: {
        // 判断是否应该显示时间戳
        shouldShowTimestamp(index: number): boolean {
            const { messages, timeInterval } = this.properties;

            // 第一条消息总是显示时间戳
            if (index === 0) return true;

            const currentMsg = messages[index];
            const prevMsg = messages[index - 1];

            // 如果当前消息和上一条消息的时间间隔超过设定值，则显示时间戳
            return currentMsg.timestamp - prevMsg.timestamp > timeInterval;
        },

        // 点击消息气泡
        onTapBubble(e: WechatMiniprogram.TouchEvent) {
            const index = e.currentTarget.dataset.index;
            const message = this.properties.messages[index];

            this.triggerEvent('tapmessage', {
                messageId: message._id,
                message
            });
        },

        // 长按消息气泡
        onLongPressBubble(e: WechatMiniprogram.TouchEvent) {
            const index = e.currentTarget.dataset.index;
            const message = this.properties.messages[index];

            this.triggerEvent('longpressmessage', {
                messageId: message._id,
                message
            });
        },

        // 点击头像
        onTapAvatar(e: WechatMiniprogram.TouchEvent) {
            const { isSelf } = e.detail;

            this.triggerEvent('tapavatar', {
                isSelf
            });
        },

        // 滚动到底部
        scrollToBottom() {
            this.triggerEvent('scrolltobottom');
        }
    }
}) 