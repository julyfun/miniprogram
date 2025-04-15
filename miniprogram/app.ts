// app.ts
App<IAppOption>({
  globalData: {
    // 保留非敏感配置或完全移除 aliCloudConfig
    // 如果其他地方不再需要从 globalData 读取配置，可以完全删除 aliCloudConfig
    // 如果仍需URL等，可以保留非敏感部分
    // aliCloudConfig: {
    //   URL: 'wss://nls-gateway-cn-shanghai.aliyuncs.com' // Example non-sensitive part
    // }
    userLearningProgress: null as any,
    cloudInitialized: false,
    databaseInitialized: false
  },
  onLaunch() {
    // 初始化云开发环境
    try {
      wx.cloud.init({
        env: 'cloud1-6g9ht8y6f2744311', // 使用默认环境或者修改为您自己的环境ID
        traceUser: true,
      });
      this.globalData.cloudInitialized = true;
      console.log('云开发环境初始化成功');

      // 初始化数据库集合
      this.initDatabase();
    } catch (error) {
      console.error('云开发环境初始化失败:', error);
      this.globalData.cloudInitialized = false;
      wx.showToast({
        title: '云服务初始化失败',
        icon: 'none',
        duration: 2000
      });
    }

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

    // 尝试获取用户OpenID并加载学习进度
    this.loadUserLearningProgress();
  },

  // 初始化数据库集合
  initDatabase() {
    if (!this.globalData.cloudInitialized) {
      console.error('云开发环境未初始化，无法初始化数据库');
      return;
    }

    try {
      wx.cloud.callFunction({
        name: 'initDatabase',
        data: {},
        success: (res: any) => {
          console.log('数据库初始化结果:', res.result);
          if (res.result && res.result.success) {
            this.globalData.databaseInitialized = true;
            console.log('数据库集合初始化成功');
          } else {
            console.error('数据库初始化失败:', res.result.error);
          }
        },
        fail: (err) => {
          console.error('调用初始化数据库云函数失败:', err);
          // 如果是云函数不存在的错误，可能是因为云函数未部署，给出提示
          if (err && err.errMsg && err.errMsg.includes('cloud.callFunction:fail FunctionName')) {
            console.error('initDatabase云函数可能未部署，请先部署该云函数');
            wx.showToast({
              title: '请先部署initDatabase云函数',
              icon: 'none',
              duration: 3000
            });
          }
        }
      });
    } catch (error) {
      console.error('调用云函数异常:', error);
    }
  },

  // 加载用户学习进度
  loadUserLearningProgress() {
    if (!this.globalData.cloudInitialized) {
      console.error('云开发环境未初始化，无法加载学习进度');
      return;
    }

    const openid = wx.getStorageSync('user_openid');
    if (!openid) {
      console.log('用户未登录，无法加载学习进度');
      return;
    }

    // 调用云函数获取学习进度
    try {
      wx.cloud.callFunction({
        name: 'getLearningProgress',
        data: {
          openid: openid
        },
        success: (res: any) => {
          console.log('加载学习进度返回结果:', res.result);
          if (res.result && res.result.success && res.result.data) {
            this.globalData.userLearningProgress = res.result.data;
          } else if (res.result && res.result.success === false) {
            console.log('用户暂无学习进度数据');
            this.globalData.userLearningProgress = {
              totalCompleted: 0,
              modules: {}
            };
          } else {
            console.warn('学习进度返回数据格式异常:', res);
          }
        },
        fail: (err) => {
          console.error('加载学习进度失败:', err);

          // 检查错误是否是因为集合不存在
          if (err && err.errMsg && err.errMsg.includes('collection.get:fail')) {
            // 尝试初始化数据库
            console.log('尝试重新初始化数据库...');
            this.initDatabase();
          }
        }
      });
    } catch (error) {
      console.error('调用云函数异常:', error);
    }
  },

  // 更新用户学习进度
  updateUserLearningProgress() {
    if (!this.globalData.cloudInitialized) {
      console.error('云开发环境未初始化，无法更新学习进度');
      return;
    }
    this.loadUserLearningProgress();
  },

  // 检查云开发环境是否初始化
  isCloudInitialized() {
    return this.globalData.cloudInitialized;
  },

  // 检查数据库是否初始化
  isDatabaseInitialized() {
    return this.globalData.databaseInitialized;
  }
})