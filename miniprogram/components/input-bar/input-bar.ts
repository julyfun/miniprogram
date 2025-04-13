Component({
    /**
     * 组件的属性列表
     */
    properties: {
        // 输入框的值
        value: {
            type: String,
            value: ''
        },
        // 输入框的占位符
        placeholder: {
            type: String,
            value: '发送消息'
        },
        // 是否显示表情按钮
        showEmojiButton: {
            type: Boolean,
            value: true
        },
        // 是否显示语音按钮
        showVoiceButton: {
            type: Boolean,
            value: true
        },
        // 是否显示更多功能按钮
        showMoreButton: {
            type: Boolean,
            value: true
        },
        // 是否正在录音中
        isRecording: {
            type: Boolean,
            value: false
        },
        // 是否禁用输入框
        disabled: {
            type: Boolean,
            value: false
        },
        // 是否显示表情面板
        showEmojiPanel: {
            type: Boolean,
            value: false
        },
        // 当前高亮的目标元素
        highlight: {
            type: String,
            value: ''
        },
        // 是否显示高亮
        showHighlight: {
            type: Boolean,
            value: false
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        voiceMode: false, // 是否处于语音输入模式
        holding: false, // 是否按住语音按钮
        emojiList: ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '😬', '😰', '😱', '😳', '😵', '😡', '😠', '😇', '🤠', '🤡', '🤥', '😷', '🤒', '🤕', '🤢', '🤧', '😈', '👿', '👹', '👺', '💀', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
        showFeaturePanel: false, // 是否显示功能面板
        touchStartY: 0, // 触摸开始的Y坐标
        isCancelled: false, // 是否取消录音
        showRedpacketPage: false // 是否显示红包发送页面
    },

    /**
     * 组件的方法列表
     */
    methods: {
        // 切换语音/键盘模式
        toggleVoiceMode() {
            const voiceMode = !this.data.voiceMode;
            this.setData({
                voiceMode,
                showEmojiPanel: false,
                showFeaturePanel: false
            });
        },

        // 处理表情按钮点击
        onEmojiButton() {
            const showEmojiPanel = !this.data.showEmojiPanel;
            this.setData({
                showEmojiPanel,
                showFeaturePanel: false
            });
        },

        // 处理更多功能按钮点击
        onMoreFunction() {
            const showFeaturePanel = !this.data.showFeaturePanel;
            this.setData({
                showFeaturePanel,
                showEmojiPanel: false
            });
            this.triggerEvent('more');

            // 触发加号按钮点击事件
            this.triggerEvent('plusclick');
        },

        // 处理功能项点击
        handleFeature(e: WechatMiniprogram.TouchEvent) {
            const feature = e.currentTarget.dataset.feature;
            this.triggerEvent('feature', { feature });

            // 关闭功能面板
            this.setData({ showFeaturePanel: false });

            // 针对特定功能执行特殊处理
            if (feature === 'redpacket') {
                this.setData({ showRedpacketPage: true });
            }

            // 触发特定功能按钮点击事件
            this.triggerEvent('featureclick', { feature });
        },

        // 处理红包页面关闭
        onRedpacketPageClose() {
            this.setData({ showRedpacketPage: false });
        },

        // 处理红包发送
        onRedpacketSend(e: WechatMiniprogram.CustomEvent) {
            const redpacketData = e.detail;
            // 将红包数据传递给父组件
            this.triggerEvent('redpacketsend', redpacketData);
            // 关闭红包页面
            this.setData({ showRedpacketPage: false });
        },

        // 处理红包金额修改
        onAmountChanged(e: WechatMiniprogram.CustomEvent) {
            console.log('红包金额已修改');
            // 将金额修改事件传递给父组件
            this.triggerEvent('amountChanged');
        },

        // 处理输入框输入
        onInput(e: WechatMiniprogram.Input) {
            this.triggerEvent('input', e.detail);
        },

        // 处理发送按钮点击
        onSend() {
            this.triggerEvent('send');
        },

        // 处理选择表情
        selectEmoji(e: WechatMiniprogram.TouchEvent) {
            const emoji = e.currentTarget.dataset.emoji;
            this.triggerEvent('selectemoji', { emoji });
        },

        // 处理删除表情
        deleteEmoji() {
            this.triggerEvent('deleteemoji');
        },

        // 处理按下语音按钮
        onHoldVoiceButton(e: WechatMiniprogram.TouchEvent) {
            this.setData({
                holding: true,
                touchStartY: e.touches[0].clientY,
                isCancelled: false
            });
            // 开始录音
            this.triggerEvent('recordstart', e.touches[0]);
        },

        // 处理释放语音按钮
        onReleaseVoiceButton() {
            if (!this.data.holding) return;

            this.setData({ holding: false });

            if (this.data.isCancelled) {
                // 取消录音
                this.triggerEvent('recordcancel');
                this.setData({ isCancelled: false });
            } else {
                // 结束录音
                this.triggerEvent('recordend');
            }
        },

        // 处理触摸移动语音按钮
        onTouchMoveVoiceButton(e: WechatMiniprogram.TouchEvent) {
            if (!this.data.holding) return;

            // 上滑取消发送
            const touchMoveY = e.touches[0].clientY;
            const moveDistance = this.data.touchStartY - touchMoveY;

            // 如果上滑超过50px，视为取消
            if (moveDistance > 50) {
                this.setData({ isCancelled: true });
            } else {
                this.setData({ isCancelled: false });
            }
        }
    }
}) 