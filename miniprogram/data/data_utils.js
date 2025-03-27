// 数据工具函数 - 所有对话数据的统一加载入口

// 导入所有对话数据模块
const demoChatData = require('./demo_chat');

// 所有可用的对话数据映射表
const dataMap = {
    'demo_chat': demoChatData
    // 添加更多数据模块时，在此处注册
};

// 获取所有可用的对话数据列表
function getAvailableDataList() {
    return [
        {
            id: 'demo_chat',
            title: '诈骗防范示例对话',
            description: '演示常见快递诈骗场景的对话流程',
            tags: ['诈骗防范', '安全意识', '演示']
        }
        // 添加更多数据模块时，在此处添加相应的描述
    ];
}

// 根据ID获取对话数据
function getDataById(id) {
    return dataMap[id] || null;
}

module.exports = {
    getAvailableDataList,
    getDataById
}; 