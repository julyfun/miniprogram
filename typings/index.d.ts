/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    aliCloudConfig?: {
      AKID: string,
      AKKEY: string,
      APPKEY: string,
      URL: string
    }
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}