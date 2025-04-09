Page({
  data: {
    userInfo: {},
    openid: ""
  },
  onLoad: function () {
    // 页面加载时从本地存储获取缓存的openid
    const storedOpenid = wx.getStorageSync('user_openid');
    const storedUserInfo = wx.getStorageSync('user_info');

    if (storedOpenid) {
      this.setData({
        openid: storedOpenid,
        userInfo: storedUserInfo || {}
      });
      console.log("Loaded from storage, openid:", storedOpenid);
    }
  },
  onGotUserInfo: function (e: any) {
    const page = this
    this.setData({
      userInfo: e.detail.userInfo
    })
    console.log("userInfo", this.data.userInfo)

    // 保存用户信息到本地存储
    wx.setStorageSync('user_info', e.detail.userInfo);

    // 确保云开发已初始化
    try {
      wx.cloud.callFunction({
        name: "login",
        success: (res: any) => {
          console.log("cloud function success")
          page.setData({
            openid: res.result.openid
          })
          // 保存openid到本地存储
          wx.setStorageSync('user_openid', res.result.openid);
          console.log("openid", page.data.openid)
        },
        fail: (res: any) => {
          console.log("cloud function fail", res)
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          })
        }
      })
    } catch (error) {
      console.error("Cloud API error:", error)
      wx.showToast({
        title: '云开发调用失败',
        icon: 'none'
      })
    }
  },

  // 添加日志函数
  addLog: function (e: any) {
    // 从按钮的 data-value 属性获取值
    const value = e.currentTarget.dataset.value;
    console.log("创建日志", value);

    if (!this.data.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '操作中...',
      });

      // 调用云函数
      wx.cloud.callFunction({
        name: "createLog",
        data: {
          add: value,  // +1 或 -1
          date: new Date(),
          openid: this.data.openid
        },
        success: (res: any) => {
          console.log("记录添加成功", res);
          wx.hideLoading();
          wx.showToast({
            title: value > 0 ? '+1 成功' : '-1 成功',
            icon: 'success'
          });
        },
        fail: (err: any) => {
          console.error("记录添加失败", err);
          wx.hideLoading();
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error("调用失败:", error);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  }
})