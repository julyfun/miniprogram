Component({
    /**
     * 组件的属性列表
     */
    properties: {
        // 是否显示红包页面
        visible: {
            type: Boolean,
            value: false
        },
        // 接收人ID
        recipientId: {
            type: String,
            value: ''
        },
        // 接收人昵称
        recipientName: {
            type: String,
            value: ''
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        amount: '', // 红包金额
        greeting: '恭喜发财，大吉大利', // 默认祝福语
        coverImageUrl: '/assets/images/cat-cover.jpg', // 封面图片URL
        coverText: '无故又因了', // 封面文字
        showAmountKeyboard: false // 是否显示金额键盘
    },

    /**
     * 组件的方法列表
     */
    methods: {
        // 处理返回按钮点击
        onBack() {
            // 如果键盘正在显示，先隐藏键盘
            if (this.data.showAmountKeyboard) {
                this.hideAmountKeyboard();
                return;
            }

            // 触发关闭事件
            this.triggerEvent('close');
        },

        // 处理金额输入
        onAmountInput(e: WechatMiniprogram.Input) {
            // 验证输入是否为有效金额
            const value = e.detail.value;
            this.validateAndSetAmount(value);
        },

        // 验证并设置金额
        validateAndSetAmount(value: string) {
            const regex = /^\d*(\.\d{0,2})?$/;

            if (regex.test(value)) {
                // 限制金额不超过200
                if (parseFloat(value) > 200) {
                    wx.showToast({
                        title: '单个红包不能超过200元',
                        icon: 'none'
                    });
                    return;
                }

                this.setData({
                    amount: value
                });
            }
        },

        // 显示金额键盘
        showAmountKeyboard() {
            this.setData({
                showAmountKeyboard: true
            });
        },

        // 隐藏金额键盘
        hideAmountKeyboard() {
            this.setData({
                showAmountKeyboard: false
            });
        },

        // 处理键盘按键
        onKeyPress(e: WechatMiniprogram.TouchEvent) {
            const key = e.currentTarget.dataset.key;
            let currentAmount = this.data.amount || '';

            // 处理删除键
            if (key === 'delete') {
                if (currentAmount.length > 0) {
                    currentAmount = currentAmount.slice(0, -1);
                }
            }
            // 处理小数点
            else if (key === '.') {
                // 如果已经有小数点，忽略
                if (currentAmount.includes('.')) {
                    return;
                }
                // 如果是空字符串，默认为0.
                if (currentAmount === '') {
                    currentAmount = '0.';
                } else {
                    currentAmount += '.';
                }
            }
            // 处理数字
            else {
                // 检查小数点后的位数
                if (currentAmount.includes('.')) {
                    const decimalParts = currentAmount.split('.');
                    if (decimalParts[1].length >= 2) {
                        // 已有两位小数，忽略
                        return;
                    }
                }
                currentAmount += key;
            }

            // 验证并设置金额
            this.validateAndSetAmount(currentAmount);
        },

        // 处理祝福语输入
        onGreetingInput(e: WechatMiniprogram.Input) {
            this.setData({
                greeting: e.detail.value
            });
        },

        // 处理表情选择
        onEmojiSelect() {
            // 表情选择逻辑，后续实现
            wx.showToast({
                title: '暂不支持表情选择',
                icon: 'none'
            });
        },

        // 处理换封面
        onChangeCover() {
            // 封面切换逻辑，后续实现
            wx.showToast({
                title: '暂不支持更换封面',
                icon: 'none'
            });
        },

        // 处理发送红包
        onSendRedpacket() {
            // 验证金额是否有效
            if (!this.data.amount || parseFloat(this.data.amount) <= 0) {
                wx.showToast({
                    title: '请输入有效金额',
                    icon: 'none'
                });
                return;
            }

            // 发送红包逻辑，后续实现
            this.triggerEvent('send', {
                type: 'single', // 单个红包
                amount: this.data.amount,
                greeting: this.data.greeting,
                coverUrl: this.data.coverImageUrl,
                recipientId: this.properties.recipientId,
                recipientName: this.properties.recipientName
            });

            // 示例：显示发送成功提示并关闭页面
            wx.showToast({
                title: '发送成功',
                icon: 'success',
                duration: 2000
            });

            setTimeout(() => {
                this.onBack();
            }, 2000);
        }
    }
}) 