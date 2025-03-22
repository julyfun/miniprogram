Component({
    properties: {
        timestamp: {
            type: Number,
            value: 0,
            observer: function (newVal) {
                if (newVal) {
                    this.formatTime(newVal);
                }
            }
        },
        // 自定义显示模式: full(完整时间), simple(简化时间)
        mode: {
            type: String,
            value: 'simple'
        },
        // 自定义日期格式
        customFormat: {
            type: String,
            value: ''
        }
    },

    data: {
        formattedTime: ''
    },

    lifetimes: {
        attached() {
            if (this.properties.timestamp) {
                this.formatTime(this.properties.timestamp);
            }
        }
    },

    methods: {
        // 格式化时间戳
        formatTime(timestamp) {
            if (!timestamp) return '';

            const date = new Date(timestamp);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const dayDiff = Math.floor(diff / (24 * 60 * 60 * 1000));

            // 自定义格式
            if (this.properties.customFormat) {
                this.setData({
                    formattedTime: this.formatByPattern(date, this.properties.customFormat)
                });
                return;
            }

            // 简化模式
            if (this.properties.mode === 'simple') {
                // 今天
                if (dayDiff === 0 && date.getDate() === now.getDate()) {
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    this.setData({
                        formattedTime: `${hours}:${minutes}`
                    });
                }
                // 昨天
                else if (dayDiff === 1 || (dayDiff === 0 && date.getDate() !== now.getDate())) {
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    this.setData({
                        formattedTime: `昨天 ${hours}:${minutes}`
                    });
                }
                // 一周内
                else if (dayDiff < 7) {
                    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    this.setData({
                        formattedTime: `${days[date.getDay()]} ${hours}:${minutes}`
                    });
                }
                // 今年内
                else if (date.getFullYear() === now.getFullYear()) {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    this.setData({
                        formattedTime: `${month}月${day}日`
                    });
                }
                // 其他
                else {
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    this.setData({
                        formattedTime: `${year}/${month}/${day}`
                    });
                }
            }
            // 完整模式
            else {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                this.setData({
                    formattedTime: `${year}-${month}-${day} ${hours}:${minutes}`
                });
            }
        },

        // 根据模式格式化时间
        formatByPattern(date, pattern) {
            return pattern
                .replace(/YYYY/g, date.getFullYear())
                .replace(/MM/g, (date.getMonth() + 1).toString().padStart(2, '0'))
                .replace(/DD/g, date.getDate().toString().padStart(2, '0'))
                .replace(/HH/g, date.getHours().toString().padStart(2, '0'))
                .replace(/mm/g, date.getMinutes().toString().padStart(2, '0'))
                .replace(/ss/g, date.getSeconds().toString().padStart(2, '0'));
        }
    }
}) 