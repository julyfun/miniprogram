// 数据工具函数 - 所有对话数据的统一加载入口

// 导入所有对话数据模块
const demo_chat = require('./demo_chat');
const phishing_chat = require('./phishing_chat');

// 所有可用的对话数据映射表
const dataMap = {
    'demo_chat': demo_chat,
    'phishing_chat': phishing_chat
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
        }
        // 添加更多数据模块时，在此处添加相应的描述
    ];
}

module.exports = {
    getDialogueData,
    getDataModule,
    getAvailableDataList
}; 