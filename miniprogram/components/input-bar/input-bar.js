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
        isVoiceMode: false,
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
                isVoiceMode: !this.data.isVoiceMode,
                showEmojiPanel: false,
                showMorePanel: false
            });
        },

        // 切换表情面板
        toggleEmojiPanel() {
            this.setData({
                showEmojiPanel: !this.data.showEmojiPanel,
                isVoiceMode: false
            });
        },

        // 点击更多功能按钮
        onTapMore() {
            this.triggerEvent('more');
        },

        // 输入事件
        onInput(e) {
            this.triggerEvent('input', { value: e.detail.value });
        },

        // 按下发送按钮
        onSend() {
            if (!this.properties.value.trim() && !this.data.isVoiceMode) return;
            this.triggerEvent('send');
        },

        // 触摸录音按钮开始
        onTouchStart(e) {
            if (!this.data.isVoiceMode) return;

            this.setData({
                startY: e.touches[0].clientY,
                isRecording: true,
                isCancelling: false
            });

            this.triggerEvent('recordstart');
        },

        // 触摸录音按钮移动
        onTouchMove(e) {
            if (!this.data.isVoiceMode || !this.data.isRecording) return;

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
        },

        // 触摸录音按钮结束
        onTouchEnd() {
            if (!this.data.isVoiceMode || !this.data.isRecording) return;

            const isCancelled = this.data.isCancelling;

            this.setData({
                isRecording: false,
                isCancelling: false
            });

            if (isCancelled) {
                this.triggerEvent('recordcancel');
            } else {
                this.triggerEvent('recordend');
            }
        },

        // 选择表情
        onSelectEmoji(e) {
            const emoji = e.currentTarget.dataset.emoji;
            this.triggerEvent('selectemoji', { emoji });
        },

        // 点击删除按钮
        onDeleteEmoji() {
            this.triggerEvent('deleteemoji');
        },

        // 处理更多功能按钮点击
        onMoreFunction() {
            this.setData({
                showMorePanel: !this.data.showMorePanel,
                showEmojiPanel: false
            });
            this.triggerEvent('more');
        },

        // 处理录音按钮按下
        onHoldVoiceButton() {
            this.setData({ holding: true });
            this.triggerEvent('recordstart');
        },

        // 处理录音按钮释放
        onReleaseVoiceButton() {
            if (this.data.holding) {
                this.setData({ holding: false });
                this.triggerEvent('recordend');
            }
        },

        // 处理录音按钮触摸移动
        onTouchMoveVoiceButton(e) {
            if (this.data.holding) {
                const touch = e.touches[0];
                const element = this.selectComponent('.voice-button');
                if (element) {
                    element.boundingClientRect(rect => {
                        // 检查手指是否移出按钮区域
                        const isCancelled = touch.clientY < rect.top ||
                            touch.clientY > rect.bottom ||
                            touch.clientX < rect.left ||
                            touch.clientX > rect.right;

                        if (isCancelled) {
                            this.setData({ holding: false });
                            this.triggerEvent('recordcancel');
                        }
                    }).exec();
                }
            }
        }
    }
}) 