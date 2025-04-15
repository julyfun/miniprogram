/// <reference path="./wx/index.d.ts" />

interface IAppOption {
    globalData: {
        userInfo?: WechatMiniprogram.UserInfo,
        aliCloudConfig?: {
            AKID: string,
            AKKEY: string,
            APPKEY: string,
            URL: string
        },
        userLearningProgress?: any,
        cloudInitialized?: boolean,
        databaseInitialized?: boolean
    }
    userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
    loadUserLearningProgress?: () => void,
    updateUserLearningProgress?: () => void,
    isCloudInitialized?: () => boolean,
    isDatabaseInitialized?: () => boolean,
    initDatabase?: () => void
} 