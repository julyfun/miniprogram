Component({
    properties: {
        // 消息列表
        messages: {
            type: Array,
            value: []
        },
        // 是否显示时间戳
        showTimestamp: {
            type: Boolean,
            value: true
        },
        // 时间戳显示间隔（毫秒）
        timestampGap: {
            type: Number,
            value: 5 * 60 * 1000 // 默认5分钟
        },
        // 当前用户的头像
        selfAvatar: {
            type: String,
            value: ''
        },
        // 对方用户的头像
        otherAvatar: {
            type: String,
            value: ''
        },
        // 滚动相关属性
        scrollIntoView: {
            type: String,
            value: ''
        }
    },

    data: {
        // 内部数据
    },

    methods: {
        // 判断是否显示时间戳
        shouldShowTimestamp(index) {
            const { messages, timestampGap } = this.properties;

            // 第一条消息始终显示时间戳
            if (index === 0) return true;

            const currentMsg = messages[index];
            const prevMsg = messages[index - 1];

            // 如果两条消息时间间隔大于设置的阈值，显示时间戳
            return currentMsg.timestamp - prevMsg.timestamp > timestampGap;
        },

        // 气泡点击事件
        onTapBubble(e) {
            const { index } = e.currentTarget.dataset;
            this.triggerEvent('tapmessage', { index, message: this.properties.messages[index] });
        },

        // 气泡长按事件
        onLongPressBubble(e) {
            const { index } = e.currentTarget.dataset;
            this.triggerEvent('longpressmessage', { index, message: this.properties.messages[index] });
        },

        // 头像点击事件
        onTapAvatar(e) {
            const { index } = e.currentTarget.dataset;
            const message = this.properties.messages[index];
            this.triggerEvent('tapavatar', { isSelf: message.isSelf, message });
        },

        // 滚动到底部
        scrollToBottom() {
            this.triggerEvent('scrolltobottom');
        }
    }
}) 