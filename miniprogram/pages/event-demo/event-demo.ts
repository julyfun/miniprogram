// pages/event-demo/event-demo.ts

// 导入数据工具
const dataUtils = require('../../data/data_utils');

Page({
    /**
     * 页面的初始数据
     */
    data: {
        // 数据ID
        dataSource: 'demo_chat',
        // 播放速度
        playbackSpeed: 1,
        // 是否自动播放
        autoPlay: true,
        // 是否允许用户交互
        interactionMode: false,
        // 场景元数据
        metadata: null
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad() {
        // 可以从路由参数中获取数据ID
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        const options = currentPage.options;

        let dataId = 'demo_chat';

        if (options.id) {
            dataId = options.id;
            this.setData({
                dataSource: dataId
            });
        }

        // 加载场景元数据
        this.loadMetadata(dataId);

        if (options.speed) {
            this.setData({
                playbackSpeed: parseFloat(options.speed)
            });
        }

        if (options.autoPlay) {
            this.setData({
                autoPlay: options.autoPlay !== 'false'
            });
        }

        if (options.interaction) {
            this.setData({
                interactionMode: options.interaction === 'true'
            });
        }
    },

    /**
     * 加载场景元数据
     */
    loadMetadata(dataId: string) {
        try {
            const dataModule = dataUtils.getDataModule(dataId);
            if (dataModule && dataModule.metadata) {
                this.setData({
                    metadata: dataModule.metadata
                });
            }
        } catch (error) {
            console.error('加载元数据失败:', error);
        }
    },

    /**
     * 返回上一页
     */
    onBack() {
        wx.navigateBack();
    },

    /**
     * 事件播放开始回调
     */
    onPlayStart() {
        console.log('开始播放事件序列');
    },

    /**
     * 事件播放暂停回调
     */
    onPlayPause() {
        console.log('暂停播放事件序列');
    },

    /**
     * 事件重新开始回调
     */
    onRestart() {
        console.log('重新开始事件序列');
    },

    /**
     * 事件播放完成回调
     */
    onComplete() {
        console.log('事件序列播放完成');
        wx.showToast({
            title: '演示完成',
            icon: 'success',
            duration: 2000
        });
    },

    /**
     * 评估完成回调
     */
    onAssessmentCompleted(e: WechatMiniprogram.CustomEvent) {
        const { isCorrect, userAnswer, correctAnswer } = e.detail;
        console.log('评估完成:', isCorrect ? '正确' : '错误', userAnswer, correctAnswer);

        // 记录用户的评估结果
        // 可以在这里添加上报数据的逻辑
    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {
        return {
            title: '诈骗防范演示对话',
            path: '/pages/event-demo/event-demo'
        };
    }
});