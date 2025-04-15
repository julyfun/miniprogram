// 数据工具函数 - 所有对话数据的统一加载入口

// 导入所有对话数据模块
const demo_chat = require('./demo_chat');
const phishing_chat = require('./phishing_chat');
const graph_demo = require('./graph_demo');
const subscriber_demo = require('./subscriber_demo');
const redpacket_tutorial = require('./redpacket_tutorial');
const photo_tutorial = require('./photo_tutorial');
const scam_call = require('./scam_call');
const scam_call2 = require('./scam_call2');
const scam_call3 = require('./scam_call3');

// 所有可用的对话数据映射表
const dataMap = {
    'demo_chat': demo_chat,
    'phishing_chat': phishing_chat,
    'graph_demo': graph_demo,
    'subscriber_demo': subscriber_demo,
    'redpacket_tutorial': redpacket_tutorial,
    'photo_tutorial': photo_tutorial,
    'scam_call': scam_call,
    'scam_call2': scam_call2,
    'scam_call3': scam_call3
    // 添加更多数据模块时，在此处注册
};

/**
 * 获取对话数据
 * @param {string} id 数据ID
 * @returns {object|null} 对话数据对象
 */
function getDialogueData(id) {
    if (dataMap[id]) {
        return dataMap[id];
    }
    return null;
}

/**
 * 获取数据模块
 * @param {string} id 数据ID
 * @returns {object|null} 数据模块
 */
function getDataModule(id) {
    return dataMap[id] || null;
}

// 获取所有可用的对话数据列表
function getAvailableDataList() {
    return [
        {
            id: 'demo_chat',
            title: '智能助手示例对话',
            description: '展示与AI智能助手的基础对话流程',
            tags: ['助手', '演示']
        },
        {
            id: 'phishing_chat',
            title: '网络钓鱼防范示例',
            description: '演示常见网络钓鱼诈骗场景的对话流程',
            tags: ['网络钓鱼', '安全意识', '演示']
        },
        {
            id: 'graph_demo',
            title: '条件图形化示例',
            description: '演示基于条件分支的对话流程',
            tags: ['诈骗防范', '安全意识', '演示', '图形结构']
        },
        {
            id: 'subscriber_demo',
            title: '事件订阅模式示例',
            description: '演示基于事件订阅的交互式对话流程',
            tags: ['事件系统', '订阅模式', '交互式', '演示']
        },
        {
            id: 'redpacket_tutorial',
            title: '微信红包发送教学',
            description: '交互式教程：如何在微信中发送红包',
            tags: ['教学', '红包', '微信功能', '新手指引']
        },
        {
            id: 'photo_tutorial',
            title: '微信照片发送教学',
            description: '交互式教程：如何在微信中发送照片',
            tags: ['教学', '照片', '微信功能', '新手指引']
        },
        {
            id: 'scam_call',
            title: '诈骗来电防范教学',
            description: '学习如何识别和应对可疑的诈骗电话',
            tags: ['安全防护', '诈骗防范', '来电']
        },
        {
            id: 'scam_call2',
            title: '亲属求助诈骗防范教学',
            description: '学习如何识别和应对亲友求助类诈骗电话',
            tags: ['安全防护', '诈骗防范', '来电', '亲情诈骗']
        },
        {
            id: 'scam_call3',
            title: '冒充公检法诈骗防范教学',
            description: '学习如何识别和应对冒充公检法机关的诈骗电话',
            tags: ['安全防护', '诈骗防范', '来电', '冒充公检法']
        }
        // 添加更多数据模块时，在此处添加相应的描述
    ];
}

module.exports = {
    getDialogueData,
    getDataModule,
    getAvailableDataList
}; 