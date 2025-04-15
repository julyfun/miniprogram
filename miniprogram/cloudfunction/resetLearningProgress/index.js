// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
    try {
        const wxContext = cloud.getWXContext()
        const openid = event.openid || wxContext.OPENID
        console.log('【RESET】开始重置学习进度, openid:', openid)
        const moduleId = event.moduleId

        // 如果提供了特定模块ID，只重置该模块
        if (moduleId) {
            const userRecord = await db.collection('learning_progress').where({
                openid: openid
            }).get()

            // 如果用户记录存在
            if (userRecord.data.length > 0) {
                const existingRecord = userRecord.data[0]
                const existingModules = existingRecord.modules || {}

                // 检查模块是否已完成，如果是，更新总完成数
                let totalCompleted = existingRecord.totalCompleted || 0
                if (existingModules[moduleId] && existingModules[moduleId].completed) {
                    totalCompleted -= 1
                }

                // 重置特定模块
                return await db.collection('learning_progress').doc(existingRecord._id).update({
                    data: {
                        [`modules.${moduleId}`]: {
                            completed: false,
                            score: 0,
                            lastUpdated: new Date()
                        },
                        totalCompleted: totalCompleted,
                        lastUpdated: new Date()
                    }
                })
            }

            return {
                success: false,
                message: '未找到用户记录'
            }
        }
        // 重置所有学习进度
        else {
            console.log('【RESET】执行全部重置')
            const userRecord = await db.collection('learning_progress').where({
                openid: openid
            }).get()

            // 如果用户记录存在，则完全重置
            if (userRecord.data.length > 0) {
                // 直接创建包含所有模块但状态为未完成的新对象
                // 先获取当前模块列表
                const existingRecord = userRecord.data[0]
                console.log('【RESET】重置前的记录:', JSON.stringify(existingRecord))
                const modulesList = Object.keys(existingRecord.modules || {})
                console.log('【RESET】发现的模块列表:', modulesList)

                // 创建重置后的模块对象
                const resetModules = {}
                modulesList.forEach(module => {
                    resetModules[module] = {
                        completed: false,
                        score: 0,
                        lastUpdated: new Date()
                    }
                })

                console.log('【RESET】重置后的模块对象:', JSON.stringify(resetModules))

                // 使用全新对象替换数据库中的模块对象
                try {
                    console.log('【RESET】尝试更新数据库...')
                    const result = await db.collection('learning_progress').doc(existingRecord._id).update({
                        data: {
                            // 完全替换modules对象
                            modules: resetModules,
                            totalCompleted: 0,
                            lastUpdated: new Date()
                        }
                    })

                    console.log('【RESET】数据库更新结果:', result)

                    // 验证更新是否成功
                    const verifyRecord = await db.collection('learning_progress').doc(existingRecord._id).get()
                    console.log('【RESET】验证重置后的记录:', JSON.stringify(verifyRecord.data))

                    // 返回重置后的完整数据以便客户端验证
                    return {
                        success: true,
                        resetModules: resetModules,
                        verifiedData: verifyRecord.data,
                        message: '重置成功'
                    }
                } catch (err) {
                    console.error('【RESET】Reset update error:', err)
                    return {
                        success: false,
                        error: err,
                        message: '数据库更新失败'
                    }
                }
            }

            return {
                success: false,
                message: '未找到用户记录'
            }
        }
    } catch (e) {
        console.error('【RESET】执行出错:', e)
        return {
            success: false,
            error: e,
            message: '云函数执行出错'
        }
    }
} 