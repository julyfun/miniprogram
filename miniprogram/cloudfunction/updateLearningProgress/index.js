// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
    try {
        const { openid, moduleId, completed, score, progressType = 'scamPrevention' } = event;

        // 检查用户记录是否存在
        const userRecord = await db.collection('learning_progress').where({
            openid: openid
        }).get();

        // 确定是哪种类型的进度
        const isFeatureTutorial = progressType === 'featureTutorials';
        const progressField = isFeatureTutorial ? 'featureTutorials' : 'modules';
        const totalField = isFeatureTutorial ? 'featureTutorialsCompleted' : 'totalCompleted';

        // 如果用户记录不存在，创建新记录
        if (userRecord.data.length === 0) {
            // 创建初始数据对象
            const initialData = {
                openid: openid,
                modules: {},
                totalCompleted: 0,
                featureTutorials: {},
                featureTutorialsCompleted: 0,
                createdAt: new Date(),
                lastUpdated: new Date()
            };

            // 设置相应的模块数据
            if (isFeatureTutorial) {
                initialData.featureTutorials[moduleId] = {
                    completed: completed || false,
                    score: score || 0,
                    lastUpdated: new Date()
                };
                initialData.featureTutorialsCompleted = completed ? 1 : 0;
            } else {
                initialData.modules[moduleId] = {
                    completed: completed || false,
                    score: score || 0,
                    lastUpdated: new Date()
                };
                initialData.totalCompleted = completed ? 1 : 0;
            }

            // 创建新的用户学习记录
            return await db.collection('learning_progress').add({
                data: initialData
            });
        } else {
            // 更新现有记录
            const existingRecord = userRecord.data[0];

            // 确保相应的对象字段存在
            const existingProgressModules = (isFeatureTutorial ?
                existingRecord.featureTutorials : existingRecord.modules) || {};

            // 计算总完成数字段的值
            const totalCompletedField = isFeatureTutorial ?
                'featureTutorialsCompleted' : 'totalCompleted';

            // 确定是否是新完成
            const isNewCompletion = completed &&
                (!existingProgressModules[moduleId] || !existingProgressModules[moduleId].completed);

            // 计算新的完成总数
            let newTotalCompleted = existingRecord[totalCompletedField] || 0;
            if (isNewCompletion) {
                newTotalCompleted += 1;
            }

            // 构建更新数据对象
            const updateData = {
                [`${progressField}.${moduleId}`]: {
                    completed: completed || false,
                    score: score || 0,
                    lastUpdated: new Date()
                },
                [totalCompletedField]: newTotalCompleted,
                lastUpdated: new Date()
            };

            // 更新用户学习记录
            return await db.collection('learning_progress').doc(existingRecord._id).update({
                data: updateData
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