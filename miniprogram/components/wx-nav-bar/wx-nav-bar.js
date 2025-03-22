Component({
    /**
     * 组件的属性列表
     */
    properties: {
        // 联系人名称
        contactName: {
            type: String,
            value: ''
        },
        // 导航栏标题
        title: {
            type: String,
            value: ''
        },
        // 是否显示返回按钮
        back: {
            type: Boolean,
            value: true
        },
        // 是否显示更多菜单按钮
        showMoreMenu: {
            type: Boolean,
            value: true
        },
        // 是否有未读消息
        hasUnread: {
            type: Boolean,
            value: false
        },
        // 状态栏高度
        statusBarHeight: {
            type: Number,
            value: 20
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        navHeight: 44 // 导航栏高度，默认44
    },

    /**
     * 组件生命周期
     */
    lifetimes: {
        attached() {
            // 获取系统信息
            const systemInfo = wx.getSystemInfoSync();

            this.setData({
                statusBarHeight: systemInfo.statusBarHeight,
            });
        }
    },

    /**
     * 组件的方法列表
     */
    methods: {
        // 处理返回按钮点击
        onBack() {
            this.triggerEvent('back');
        },

        // 处理更多菜单按钮点击
        onMore() {
            this.triggerEvent('more');
        }
    }
}); 