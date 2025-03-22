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
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        // 是否正在使用语音输入
        voiceMode: false,
        // 是否正在按住语音按钮
        holding: false,
        // 是否显示更多功能面板
        showMorePanel: false,
        // 触摸开始Y坐标，用于判断滑动取消
        startY: 0,
        // 是否取消录音
        isCancelling: false,
        // 常用表情列表
        emojiList: ['😊', '😂', '🤣', '❤️', '👍', '🎉', '🔥', '😁', '😘', '🙏',
            '😍', '😒', '👌', '😢', '😭', '😅', '😳', '😏', '🤔', '🙄']
    },

    methods: {
        // 切换语音输入模式
        toggleVoiceMode() {
            this.setData({
                voiceMode: !this.data.voiceMode,
                showEmojiPanel: false,
                showMorePanel: false
            });
        },

        // 切换表情面板
        onEmojiButton() {
            this.setData({
                showEmojiPanel: !this.data.showEmojiPanel,
                voiceMode: false
            });
        },

        // 点击更多功能按钮
        onMoreFunction() {
            this.setData({
                showMorePanel: !this.data.showMorePanel,
                showEmojiPanel: false
            });
            this.triggerEvent('more');
        },

        // 输入事件
        onInput(e: WechatMiniprogram.Input) {
            this.triggerEvent('input', { value: e.detail.value });
        },

        // 按下发送按钮
        onSend() {
            if (!this.properties.value.trim() && !this.data.voiceMode) return;
            this.triggerEvent('send');
        },

        // 选择表情
        selectEmoji(e: WechatMiniprogram.TouchEvent) {
            const emoji = e.currentTarget.dataset.emoji;
            this.triggerEvent('selectemoji', { emoji });
        },

        // 点击删除按钮
        deleteEmoji() {
            this.triggerEvent('deleteemoji');
        },

        // 处理录音按钮按下
        onHoldVoiceButton(e: WechatMiniprogram.TouchEvent) {
            this.setData({
                holding: true,
                isRecording: true,
                startY: e.touches[0].clientY,
                isCancelling: false
            });
            this.triggerEvent('recordstart');
        },

        // 处理录音按钮释放
        onReleaseVoiceButton() {
            if (this.data.holding) {
                const isCancelled = this.data.isCancelling;

                this.setData({
                    holding: false,
                    isRecording: false,
                    isCancelling: false
                });

                if (isCancelled) {
                    this.triggerEvent('recordcancel');
                } else {
                    this.triggerEvent('recordend');
                }
            }
        },

        // 处理录音按钮触摸移动
        onTouchMoveVoiceButton(e: WechatMiniprogram.TouchEvent) {
            if (!this.data.holding || !this.data.isRecording) return;

            const moveY = e.touches[0].clientY;
            const diffY = this.data.startY - moveY;

            // 上滑超过50像素，判断为取消
            if (diffY > 50) {
                this.setData({
                    isCancelling: true
                });
            } else {
                this.setData({
                    isCancelling: false
                });
            }
        }
    }
}) 