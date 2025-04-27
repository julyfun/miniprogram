// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
    try {
        // 检查collections是否存在，如果不存在则创建
        const collections = ['learning_progress']

        let results = {}

        for (const collectionName of collections) {
            try {
                // 尝试创建集合
                await db.createCollection(collectionName)
                results[collectionName] = '集合创建成功'
            } catch (err) {
                // 如果集合已存在，会抛出错误，但这不是我们关心的错误
                if (err.errCode === -501001) { // 集合已存在的错误码
                    results[collectionName] = '集合已存在'
                } else {
                    results[collectionName] = `创建失败: ${err.errMsg || err.message || err}`
                }
            }
        }

        // 确保默认模块配置存在于数据库中
        try {
            // 检查是否已有模块配置
            const moduleConfig = await db.collection('system_config').where({
                configType: 'moduleSetup'
            }).get();

            if (moduleConfig.data.length === 0) {
                // 添加默认模块配置
                await db.collection('system_config').add({
                    data: {
                        configType: 'moduleSetup',
                        modules: ['scam_call', 'scam_call2', 'scam_call3', 'scam_call4'],
                        updatedAt: new Date()
                    }
                });
                results.moduleConfig = '默认模块配置创建成功';
            } else {
                // 更新现有配置，确保包含scam_call3和scam_call4
                const existingConfig = moduleConfig.data[0];
                const modules = existingConfig.modules || [];

                if (!modules.includes('scam_call3')) {
                    modules.push('scam_call3');
                    await db.collection('system_config').doc(existingConfig._id).update({
                        data: {
                            modules: modules,
                            updatedAt: new Date()
                        }
                    });
                    results.moduleConfig = '模块配置已更新，新增scam_call3';
                } else if (!modules.includes('scam_call4')) {
                    modules.push('scam_call4');
                    await db.collection('system_config').doc(existingConfig._id).update({
                        data: {
                            modules: modules,
                            updatedAt: new Date()
                        }
                    });
                    results.moduleConfig = '模块配置已更新，新增scam_call4';
                } else {
                    results.moduleConfig = '模块配置已存在且包含scam_call3和scam_call4';
                }
            }
        } catch (err) {
            results.moduleConfig = `模块配置更新失败: ${err.errMsg || err.message || err}`;

            // 如果是因为system_config集合不存在，尝试创建它
            if (err.errCode === -502005) { // 集合不存在的错误码
                try {
                    await db.createCollection('system_config');
                    await db.collection('system_config').add({
                        data: {
                            configType: 'moduleSetup',
                            modules: ['scam_call', 'scam_call2', 'scam_call3', 'scam_call4'],
                            updatedAt: new Date()
                        }
                    });
                    results.moduleConfig = '创建system_config集合并添加默认模块配置成功';
                } catch (createErr) {
                    results.moduleConfig += `; 创建system_config集合失败: ${createErr.errMsg || createErr.message || createErr}`;
                }
            }
        }

        return {
            success: true,
            results: results
        }
    } catch (e) {
        console.error('数据库初始化失败:', e)
        return {
            success: false,
            error: e
        }
    }
} 