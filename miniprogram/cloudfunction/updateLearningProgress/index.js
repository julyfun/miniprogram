// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
    try {
        const { openid, moduleId, completed, score } = event;

        // 检查用户记录是否存在
        const userRecord = await db.collection('learning_progress').where({
            openid: openid
        }).get();

        // 如果用户记录不存在，创建新记录
        if (userRecord.data.length === 0) {
            // 创建新的用户学习记录
            return await db.collection('learning_progress').add({
                data: {
                    openid: openid,
                    modules: {
                        [moduleId]: {
                            completed: completed || false,
                            score: score || 0,
                            lastUpdated: new Date()
                        }
                    },
                    totalCompleted: completed ? 1 : 0,
                    createdAt: new Date(),
                    lastUpdated: new Date()
                }
            });
        } else {
            // 更新现有记录
            const existingRecord = userRecord.data[0];
            const existingModules = existingRecord.modules || {};
            const isNewCompletion = completed &&
                (!existingModules[moduleId] || !existingModules[moduleId].completed);

            // 计算新的完成总数
            let totalCompleted = existingRecord.totalCompleted || 0;
            if (isNewCompletion) {
                totalCompleted += 1;
            }

            // 更新用户学习记录
            return await db.collection('learning_progress').doc(existingRecord._id).update({
                data: {
                    [`modules.${moduleId}`]: {
                        completed: completed || false,
                        score: score || 0,
                        lastUpdated: new Date()
                    },
                    totalCompleted: totalCompleted,
                    lastUpdated: new Date()
                }
            });
        }
    } catch (e) {
        console.error(e);
        return {
            success: false,
            error: e
        };
    }
} 