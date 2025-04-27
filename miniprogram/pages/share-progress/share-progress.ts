interface ModuleInfo {
    id: string;
    name: string;
    completed: boolean;
    score: number;
}

interface PageData {
    scamModules: ModuleInfo[];
    featureModules: ModuleInfo[];
    scamProgressPercentage: number;
    featureProgressPercentage: number;
    scamCompletedCount: number;
    featureTotalModules: number;
    scamTotalModules: number;
    featureCompletedCount: number;
    userName: string;
}

// 模块名称映射
const MODULE_NAMES: Record<string, string> = {
    'scam_call': '防范诈骗电话基础',
    'scam_call2': '亲友求助诈骗识别',
    'scam_call3': '投资理财诈骗防范',
    'scam_call4': '冒充社保局诈骗防范',
    'next_scam_call': '诈骗电话综合演练',
    'hongbao': '微信红包功能',
    'photo_tutorial': '照片发送功能',
    'emergency': '紧急求助功能',
    'health': '健康咨询功能',
}

Page<PageData, WechatMiniprogram.IAnyObject>({
    data: {
        scamModules: [],
        featureModules: [],
        scamProgressPercentage: 0,
        featureProgressPercentage: 0,
        scamCompletedCount: 0,
        scamTotalModules: 0,
        featureCompletedCount: 0,
        featureTotalModules: 0,
        userName: '用户',
    },

    onLoad() {
        // 获取全局数据和用户信息
        const app = getApp<IAppOption>();
        const globalData = app.globalData || {};

        // 合并页面数据
        this.loadProgressData();

        // 如果有用户信息，更新用户名
        if (globalData.userInfo && globalData.userInfo.nickName) {
            this.setData({
                userName: globalData.userInfo.nickName
            });
        }
    },

    // 加载进度数据
    loadProgressData() {
        try {
            // 获取主页面数据
            const pages = getCurrentPages();
            const indexPage = pages.find(p => p.route === 'pages/index/index');

            if (!indexPage) {
                console.error('无法获取主页面数据');
                this.loadFallbackData();
                return;
            }

            // 获取学习进度数据
            const learningProgress = indexPage.data.learningProgress || { modules: {}, totalCompleted: 0 };
            const featureTutorialsProgress = indexPage.data.featureTutorialsProgress || { modules: {}, totalCompleted: 0 };

            // 处理诈骗防范模块
            const scamModules: ModuleInfo[] = [];
            const scamModuleKeys = ['scam_call', 'scam_call2', 'scam_call3', 'scam_call4', 'next_scam_call'];

            for (const key of scamModuleKeys) {
                const moduleData = learningProgress.modules[key] || { completed: false, score: 0 };
                scamModules.push({
                    id: key,
                    name: MODULE_NAMES[key] || key,
                    completed: moduleData.completed,
                    score: moduleData.score || 0
                });
            }

            // 处理微信功能教学模块
            const featureModules: ModuleInfo[] = [];
            const featureModuleKeys = ['hongbao', 'photo_tutorial', 'health', 'emergency'];

            for (const key of featureModuleKeys) {
                const moduleData = featureTutorialsProgress.modules[key] || { completed: false, score: 0 };
                featureModules.push({
                    id: key,
                    name: MODULE_NAMES[key] || key,
                    completed: moduleData.completed,
                    score: moduleData.score || 0
                });
            }

            // 计算完成百分比
            const scamCompletedCount = scamModules.filter(m => m.completed).length;
            const featureCompletedCount = featureModules.filter(m => m.completed).length;

            const scamProgressPercentage = Math.round((scamCompletedCount / scamModules.length) * 100) || 0;
            const featureProgressPercentage = Math.round((featureCompletedCount / featureModules.length) * 100) || 0;

            // 更新页面数据
            this.setData({
                scamModules,
                featureModules,
                scamProgressPercentage,
                featureProgressPercentage,
                scamCompletedCount,
                scamTotalModules: scamModules.length,
                featureCompletedCount,
                featureTotalModules: featureModules.length
            });

        } catch (error) {
            console.error('加载学习进度数据失败:', error);
            this.loadFallbackData();
        }
    },

    // 加载备用数据（当无法从主页面获取数据时）
    loadFallbackData() {
        // 从本地存储获取数据
        const learningProgress = wx.getStorageSync('learningProgress') || { modules: {}, totalCompleted: 0 };
        const featureTutorialsProgress = wx.getStorageSync('featureTutorialsProgress') || { modules: {}, totalCompleted: 0 };

        // 使用本地存储数据构建模块列表
        const scamModules: ModuleInfo[] = [];
        const featureModules: ModuleInfo[] = [];

        // 处理诈骗防范模块
        const scamModuleKeys = ['scam_call', 'scam_call2', 'scam_call3', 'scam_call4', 'next_scam_call'];
        for (const key of scamModuleKeys) {
            const moduleData = learningProgress.modules[key] || { completed: false, score: 0 };
            scamModules.push({
                id: key,
                name: MODULE_NAMES[key] || key,
                completed: moduleData.completed,
                score: moduleData.score || 0
            });
        }

        // 处理微信功能教学模块
        const featureModuleKeys = ['hongbao', 'photo_tutorial', 'health', 'emergency'];
        for (const key of featureModuleKeys) {
            const moduleData = featureTutorialsProgress.modules[key] || { completed: false, score: 0 };
            featureModules.push({
                id: key,
                name: MODULE_NAMES[key] || key,
                completed: moduleData.completed,
                score: moduleData.score || 0
            });
        }

        // 计算完成百分比
        const scamCompletedCount = scamModules.filter(m => m.completed).length;
        const featureCompletedCount = featureModules.filter(m => m.completed).length;

        const scamProgressPercentage = Math.round((scamCompletedCount / scamModules.length) * 100) || 0;
        const featureProgressPercentage = Math.round((featureCompletedCount / featureModules.length) * 100) || 0;

        // 更新页面数据
        this.setData({
            scamModules,
            featureModules,
            scamProgressPercentage,
            featureProgressPercentage,
            scamCompletedCount,
            scamTotalModules: scamModules.length,
            featureCompletedCount,
            featureTotalModules: featureModules.length
        });
    },

    // 返回首页
    returnToHome() {
        wx.navigateBack({
            delta: 1
        });
    },

    // 自定义分享消息
    onShareAppMessage() {
        const { scamProgressPercentage, featureProgressPercentage, userName } = this.data;
        const averageProgress = Math.round((scamProgressPercentage + featureProgressPercentage) / 2);

        return {
            title: `${userName}的学习进度: 已完成${averageProgress}%的课程`,
            path: '/pages/index/index',
            imageUrl: '/assets/images/share-cover.png', // 分享封面图片
        };
    }
}); 