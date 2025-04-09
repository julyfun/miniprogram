微信小程序
更新时间：2024-01-09 10:30:06
产品详情
我的收藏
本文介绍如何使用阿里云智能语音服务提供的微信小程序SDK，包括SDK的安装方法及SDK代码示例。

前提条件
在使用SDK前，请先阅读接口说明，详情请参见接口说明。

下载安装
说明
微信基础库要求2.4.4及以上版本。

请确认已经安装微信小程序开发环境，并完成基本配置。具体可参见微信开发者工具。

需要提前将如下URL添加到微信小程序后台服务器域名中：

request合法域名：https://nls-meta.cn-shanghai.aliyuncs.com

socket合法域名：wss://nls-gateway-cn-shanghai.aliyuncs.com

下载并安装SDK。

通过Github下载对应SDK代码，或直接下载alibabacloud-nls-wx-sdk-master.zip。

导入SDK。

您可将下载好的代码放入工程合适目录下，然后根据目录位置通过require进行导入。

获取Token
getToken
获取Token并以AKID（AccessKey ID）和AKKEY（AccessKey Secret）为key缓存对应Token，如果缓存的Token过期则自动刷新并获取。缓存机制请参见微信小程序文档的数据缓存部分。

参数说明：无。

返回值：String类型的Token。

getTokenInner
直接获取Token，不带任何缓存机制，适用于用户自定义缓存方式。

参数说明：无。

返回值：String类型的Token。

重要
频繁调用该接口会被服务端拒绝访问。

实时语音识别
Class: SpeechTranscription
SpeechTranscription类用于进行实时语音识别。

构造函数参数说明：




参数

类型

参数说明

config

Object

连接配置对象。

config object说明：




参数

类型

参数说明

url

String

服务URL地址。

token

String

访问Token，详情可参见获取Token概述。

appkey

String

对应项目Appkey。获取Appkey请前往控制台。

defaultStartParams()
返回一个默认的推荐参数，其中Format为PCM，采样率为16000 Hz，中间结果、标点预测和ITN均为打开状态。您在拿到默认对象后可以根据自身需求，结合接口说明中的参数列表来添加和修改参数。

参数说明：无。

返回值：

object类型对象，字段如下：

 
{
    "format": "pcm",
    "sample_rate": 16000,
    "enable_intermediate_result": true,
    "enable_punctuation_predition": true,
    "enable_inverse_text_normalization": true
}
on(which, handler)
设置事件回调。

参数说明：




参数

类型

参数说明

which

String

事件名称。

handler

Function

回调函数。

支持的回调事件如下：





事件名称

事件说明

回调函数参数个数

回调函数参数说明

started

实时语音识别开始。

1

String类型，开始信息。

changed

实时语音识别中间结果。

1

String类型，中间结果信息。

completed

实时语音识别完成。

1

String类型，完成信息。

closed

连接关闭。

0

无。

failed

错误。

1

String类型，错误信息。

begin

提示句子开始。

1

String类型，相关信息。

end

提示句子结束。

1

String类型，相关信息。

返回值：无。

async start(param)
根据param发起一次一句话识别，param可以参考defaultStartParams方法的返回，具体参数见接口说明。

参数说明：




参数

类型

参数说明

param

Object

实时语音识别参数。

返回值： Promise对象，当started事件发生后触发resolve，并携带started信息；当任何错误发生后触发reject，并携带异常信息。

async close(param)
停止一句话识别。

参数说明：




参数

类型

参数说明

param

Object

实时语音识别结束参数。

返回值：

Promise对象，当completed事件发生后触发resolve，并携带completed信息；当任何错误发生后触发reject，并携带异常信息。

shutdown()
强制断开连接。

参数说明：无。

返回值：无。

sendAudio(data)
发送音频，音频格式必须和参数中一致。

参数说明：




参数

类型

参数说明

data

ArrayBuffer

二进制音频数据。

返回值：无。

代码示例
以下代码示例仅供参考，代码中使用微信小程序自带录音功能，实际使用时，需要考虑微信小程序的限制，以及前端页面设计和具体业务功能。

 
// pages/st/st.js

const app = getApp()

const AKID = "Your AKID"
const AKKEY = "Your AKKEY"
const getToken = require("../../utils/token").getToken
const SpeechTranscription = require("../../utils/st")
const sleep = require("../../utils/util").sleep

Page({

    /**
     * 页面的初始数据
     */
    data: {
        stStart : false,
        stResult : "未开始识别"
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: async function (options) {
        wx.getRecorderManager().onFrameRecorded((res)=>{
            if (res.isLastFrame) {
                console.log("record done")
            }
            if (this.data.st && this.data.stStart) {
                console.log("send " + res.frameBuffer.byteLength)
                this.data.st.sendAudio(res.frameBuffer)
            }
        })
        wx.getRecorderManager().onStart(()=>{
            console.log("start recording...")
        })
        wx.getRecorderManager().onStop((res) => {
            console.log("stop recording...")
            if (res.tempFilePath) {
                wx.removeSavedFile({
                    filePath:res.tempFilePath
                })
            }
        })
        wx.getRecorderManager().onError((res) => {
            console.log("recording failed:" + res)
        })

        try {
            this.data.token = await getToken(AKID, AKKEY)
        } catch (e) {
            console.log("error on get token:", JSON.stringify(e))
            return
        }
        let st = new SpeechTranscription({
            url : app.globalData.URL,
            appkey: app.globalData.APPKEY,
            token: this.data.token
        })

        st.on("started", (msg)=> {
            console.log("Client recv started")
            this.setData({
                stResult : msg
            })
        })

        st.on("changed", (msg)=>{
            console.log("Client recv changed:", msg)
            this.setData({
                stResult : msg
            })
        })
      
        st.on("completed", (msg)=>{
            console.log("Client recv completed:", msg)
            this.setData({
                stResult : msg
            })
        })

        st.on("begin", (msg)=>{
            console.log("Client recv sentenceBegin:", msg)
            this.setData({
                stResult : msg
            })
          })
      
          st.on("end", (msg)=>{
            console.log("Client recv sentenceEnd:", msg)
            this.setData({
                stResult : msg
            })
          })
    
        st.on("closed", () => {
            console.log("Client recv closed")
        })
    
        st.on("failed", (msg)=>{
            console.log("Client recv failed:", msg)
            this.setData({
                stResult : msg
            })
        })

        this.data.st = st
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        console.log("st onUnload")
        this.data.stStart = false
        wx.getRecorderManager().stop()
        if (this.data.st) {
            this.data.st.shutdown()
        } else {
            console.log("st is null")
        }
    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {

    },
    onStStart: async function() {
        if (!this.data.st) {
            console.log("st is null")
            return
        }

        if (this.data.stStart) {
            console.log("st is started!")
            return
        }
        let st = this.data.st
        try {
            await st.start(st.defaultStartParams())
            this.data.stStart = true
        } catch (e) {
            console.log("start failed:" + e)
            return
        }

        wx.getRecorderManager().start({
            duration: 600000,
            numberOfChannels: 1,
            sampleRate : 16000,
            format: "PCM",
            frameSize: 4
        })
    },

    onStStop: async function() {
        wx.getRecorderManager().stop()
        await sleep(500)
        if (this.data.stStart && this.data.st) {
            try {
                console.log("prepare close st")
                await this.data.st.close()
                this.data.stStart = false
            } catch(e) {
                console.log("close st failed:" + e)
            }
        }
    }
})