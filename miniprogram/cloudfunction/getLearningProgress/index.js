// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
    try {
        const { openid } = event;
        console.log('【GET】开始获取学习进度, openid:', openid);

        // 获取用户学习进度
        const userRecord = await db.collection('learning_progress').where({
            openid: openid
        }).get();

        console.log(`【GET】查询返回记录数: ${userRecord.data.length}`);

        // 如果用户记录不存在，返回空记录
        if (userRecord.data.length === 0) {
            console.log('【GET】未找到用户记录，返回空数据');
            return {
                success: true,
                data: {
                    openid: openid,
                    modules: {},
                    totalCompleted: 0,
                    createdAt: null,
                    lastUpdated: null
                }
            };
        }

        // 记录数据以便调试
        console.log('【GET】找到用户记录:', JSON.stringify(userRecord.data[0]));

        if (userRecord.data[0].modules) {
            console.log('【GET】模块详情:', JSON.stringify(userRecord.data[0].modules));

            // 检查每个模块的completed状态
            const modulesList = Object.keys(userRecord.data[0].modules);
            console.log('【GET】模块列表:', modulesList);

            modulesList.forEach(moduleId => {
                const module = userRecord.data[0].modules[moduleId];
                console.log(`【GET】模块 ${moduleId} 完成状态:`, module.completed);
            });
        } else {
            console.log('【GET】用户没有模块数据');
        }

        // 返回用户学习记录
        return {
            success: true,
            data: userRecord.data[0]
        };
    } catch (e) {
        console.error('【GET】获取学习进度出错:', e);
        return {
            success: false,
            error: e
        };
    }
} 