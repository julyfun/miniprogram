Component({
    properties: {
        // 头像URL
        src: {
            type: String,
            value: ''
        },
        // 头像大小，单位rpx
        size: {
            type: Number,
            value: 80
        },
        // 头像形状：circle(圆形), square(方形)
        shape: {
            type: String,
            value: 'square'
        },
        // 边框宽度，单位rpx
        borderWidth: {
            type: Number,
            value: 0
        },
        // 边框颜色
        borderColor: {
            type: String,
            value: 'transparent'
        },
        // 加载失败时显示的图片
        fallbackSrc: {
            type: String,
            value: '/assets/default-avatar.png'
        }
    },

    data: {
        // 是否加载失败
        loadError: false
    },

    methods: {
        // 图片加载失败处理
        onError() {
            this.setData({
                loadError: true
            });

            this.triggerEvent('error');
        },

        // 点击头像
        onTap() {
            this.triggerEvent('tap');
        }
    }
}) 