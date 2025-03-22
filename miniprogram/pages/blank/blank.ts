// 空白页面
Page({
    data: {
        // 页面数据放这里
    },

    onLoad() {
        // 页面加载时执行的操作
    },

    // 返回上一页
    navigateBack() {
        wx.navigateBack({
            delta: 1,
            fail: () => {
                // 如果返回失败，就导航到主页
                wx.navigateTo({
                    url: '/pages/index/index'
                });
            }
        });
    }
}); 