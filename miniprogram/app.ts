// app.ts
App<IAppOption>({
  globalData: {
    // 保留非敏感配置或完全移除 aliCloudConfig
    // 如果其他地方不再需要从 globalData 读取配置，可以完全删除 aliCloudConfig
    // 如果仍需URL等，可以保留非敏感部分
    // aliCloudConfig: {
    //   URL: 'wss://nls-gateway-cn-shanghai.aliyuncs.com' // Example non-sensitive part
    // }
  },
  onLaunch() {
    // 初始化云开发环境
    wx.cloud.init({
      env: 'cloud1-6g9ht8y6f2744311', // 使用默认环境或者修改为您自己的环境ID
      traceUser: true,
    })

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },
})