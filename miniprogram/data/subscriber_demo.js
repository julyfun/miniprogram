// 订阅模式演示数据 - 展示事件订阅及反应
module.exports = {
    "metadata": {
        "title": "事件订阅模式示例",
        "description": "演示基于事件订阅的交互式对话流程",
        "author": "AI助手",
        "version": "1.0.0",
        "opponent": {
            "nickname": "智能助手",
            "avatarUrl": "/assets/icons/deepseek.png"
        },
        "createdAt": "2023-04-15T10:00:00.000Z",
        "updatedAt": "2023-04-15T10:00:00.000Z",
        "tags": ["事件系统", "订阅模式", "交互式", "演示"],
        "startId": "welcome",
        "defaultDelay": 1000
    },
    "events": [
        // 欢迎事件
        {
            "id": "welcome",
            "type": "message",
            "role": "assistant",
            "content": "👋 欢迎体验基于**事件订阅模式**的对话演示！",
            "delay": 1000,
            "transitions": [
                { "targetId": "introduction" }
            ]
        },

        // 介绍事件
        {
            "id": "introduction",
            "type": "message",
            "role": "assistant",
            "content": "在传统的对话系统中，消息通常按照预设的顺序线性展示。\n\n而在事件订阅模式中，我们可以根据用户行为和选择动态调整对话流程，创建更为自然的交互体验。",
            "delay": 2000,
            "transitions": [
                { "targetId": "option_selector" }
            ]
        },

        // 选项选择器
        {
            "id": "option_selector",
            "type": "message",
            "role": "assistant",
            "content": "请选择您感兴趣的话题：\n\n1️⃣ 网络安全小知识\n2️⃣ 健康生活建议\n3️⃣ 个人财务管理",
            "delay": 1500,
            "transitions": [
                { "targetId": "waiting_for_topic_choice" }
            ]
        },

        // 等待用户选择话题
        {
            "id": "waiting_for_topic_choice",
            "type": "message",
            "role": "system",
            "content": "等待用户输入...",
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userSelectedTopic", "value": "cyber" }
                    ],
                    "targetId": "topic_cyber"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "userSelectedTopic", "value": "health" }
                    ],
                    "targetId": "topic_health"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "userSelectedTopic", "value": "finance" }
                    ],
                    "targetId": "topic_finance"
                },
                {
                    "conditions": [
                        { "type": "messageCount", "value": 1 }
                    ],
                    "targetId": "process_topic_selection"
                }
            ]
        },

        // 处理主题选择（系统事件）
        {
            "id": "process_topic_selection",
            "type": "system",
            "content": "处理用户选择",
            "setFlags": {
                "processingUserInput": true
            },
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userSelectedTopic", "value": "cyber" }
                    ],
                    "targetId": "topic_cyber"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "userSelectedTopic", "value": "health" }
                    ],
                    "targetId": "topic_health"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "userSelectedTopic", "value": "finance" }
                    ],
                    "targetId": "topic_finance"
                },
                // 默认转换，如果没有清晰的选择
                { "targetId": "topic_not_clear" }
            ]
        },

        // 主题不清晰
        {
            "id": "topic_not_clear",
            "type": "message",
            "role": "assistant",
            "content": "抱歉，我不太确定您的选择。请尝试输入数字（1、2或3）或直接输入话题名称（网络安全、健康建议或财务管理）。",
            "delay": 1000,
            "transitions": [
                { "targetId": "option_selector" }
            ]
        },

        // 网络安全话题
        {
            "id": "topic_cyber",
            "type": "message",
            "role": "assistant",
            "content": "🔒 **网络安全小知识**\n\n在当今数字化时代，保护个人信息安全至关重要。以下是一些基本的网络安全建议：\n\n- 使用强密码并定期更换\n- 开启两步验证\n- 不要在不安全的网络上访问敏感信息\n- 定期更新软件和系统\n- 警惕钓鱼邮件和可疑链接",
            "delay": 2500,
            "transitions": [
                { "targetId": "cyber_question" }
            ]
        },

        // 网络安全问题
        {
            "id": "cyber_question",
            "type": "assessment",
            "role": "assistant",
            "content": "小测验：以下哪项**不是**强密码的特征？",
            "options": [
                "包含特殊字符",
                "使用个人信息如生日",
                "混合使用大小写字母",
                "长度超过12个字符"
            ],
            "correctAnswer": "使用个人信息如生日",
            "delay": 1000,
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "lastAnswerCorrect", "value": true }
                    ],
                    "targetId": "cyber_correct"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "lastAnswerCorrect", "value": false }
                    ],
                    "targetId": "cyber_wrong"
                }
            ]
        },

        // 网络安全正确答案反馈
        {
            "id": "cyber_correct",
            "type": "message",
            "role": "assistant",
            "content": "✅ 正确！使用个人信息（如生日、名字、宠物名等）作为密码是不安全的，因为这些信息可能被他人轻易获取或猜测。",
            "delay": 2000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },

        // 网络安全错误答案反馈
        {
            "id": "cyber_wrong",
            "type": "message",
            "role": "assistant",
            "content": "❌ 不完全正确。强密码应该包含特殊字符、大小写混合字母、数字，并且长度足够。使用个人信息（如生日）是不安全的，因为这些信息可能被他人轻易获取或猜测。",
            "delay": 2000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },

        // 健康话题
        {
            "id": "topic_health",
            "type": "message",
            "role": "assistant",
            "content": "❤️ **健康生活建议**\n\n保持健康的生活方式有助于提高生活质量和预防慢性疾病：\n\n- 均衡饮食，多摄入蔬果\n- 保持充足的水分摄入\n- 规律锻炼，每周至少150分钟\n- 保证充足的睡眠\n- 管理压力，培养放松技巧",
            "delay": 2500,
            "transitions": [
                { "targetId": "health_question" }
            ]
        },

        // 健康问题
        {
            "id": "health_question",
            "type": "assessment",
            "role": "assistant",
            "content": "小测验：成年人每天应该喝多少水？",
            "options": [
                "约1升（4杯）",
                "约2升（8杯）",
                "约3升（12杯）",
                "视个人情况而定"
            ],
            "correctAnswer": "视个人情况而定",
            "delay": 1000,
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "lastAnswerCorrect", "value": true }
                    ],
                    "targetId": "health_correct"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "lastAnswerCorrect", "value": false }
                    ],
                    "targetId": "health_wrong"
                }
            ]
        },

        // 健康正确答案反馈
        {
            "id": "health_correct",
            "type": "message",
            "role": "assistant",
            "content": "✅ 正确！虽然常见建议是每天喝约2升水，但实际水分需求因个人体重、活动水平、气候和整体健康状况而异。美国国家医学院建议，男性每天总水分摄入约3.7升，女性约2.7升（包括食物中的水分）。",
            "delay": 2000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },

        // 健康错误答案反馈
        {
            "id": "health_wrong",
            "type": "message",
            "role": "assistant",
            "content": "❌ 不完全正确。虽然「八杯水」（约2升）是常见建议，但实际水分需求因个人体重、活动水平、气候和整体健康状况而异。没有适用于所有人的固定数量。",
            "delay": 2000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },

        // 财务话题
        {
            "id": "topic_finance",
            "type": "message",
            "role": "assistant",
            "content": "💰 **个人财务管理**\n\n良好的财务习惯可以帮助您实现财务自由：\n\n- 制定预算并坚持执行\n- 建立应急基金，覆盖3-6个月开支\n- 优先偿还高利率债务\n- 定期储蓄和投资\n- 了解税收规划策略",
            "delay": 2500,
            "transitions": [
                { "targetId": "finance_question" }
            ]
        },

        // 财务问题
        {
            "id": "finance_question",
            "type": "assessment",
            "role": "assistant",
            "content": "小测验：以下哪项是建立应急基金的主要目的？",
            "options": [
                "为退休储蓄",
                "应对意外支出和收入中断",
                "获得投资高回报",
                "降低税负"
            ],
            "correctAnswer": "应对意外支出和收入中断",
            "delay": 1000,
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "lastAnswerCorrect", "value": true }
                    ],
                    "targetId": "finance_correct"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "lastAnswerCorrect", "value": false }
                    ],
                    "targetId": "finance_wrong"
                }
            ]
        },

        // 财务正确答案反馈
        {
            "id": "finance_correct",
            "type": "message",
            "role": "assistant",
            "content": "✅ 正确！应急基金的主要目的是为意外情况（如医疗紧急情况、突发维修或失业）提供财务缓冲，通常建议覆盖3-6个月的基本生活开支。",
            "delay": 2000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },

        // 财务错误答案反馈
        {
            "id": "finance_wrong",
            "type": "message",
            "role": "assistant",
            "content": "❌ 不完全正确。应急基金主要用于应对意外情况（如医疗紧急情况、突发维修或失业），而不是为退休储蓄、追求高回报或税务规划。它应该存放在容易获取的流动性高的账户中。",
            "delay": 2000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },

        // 完成
        {
            "id": "completion",
            "type": "message",
            "role": "assistant",
            "content": "感谢您参与这个主题！您希望：\n\n1️⃣ 继续探索其他主题\n2️⃣ 结束演示",
            "delay": 2000,
            "transitions": [
                { "targetId": "waiting_for_final_choice" }
            ]
        },

        // 等待最终选择
        {
            "id": "waiting_for_final_choice",
            "type": "message",
            "role": "system",
            "content": "等待用户最终选择...",
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userFinalChoice", "value": "continue" }
                    ],
                    "targetId": "reset_system"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "userFinalChoice", "value": "end" }
                    ],
                    "targetId": "end_demo"
                },
                {
                    "conditions": [
                        { "type": "messageCount", "value": 1 }
                    ],
                    "targetId": "process_final_choice"
                }
            ]
        },

        // 处理最终选择（系统事件）
        {
            "id": "process_final_choice",
            "type": "system",
            "content": "处理用户最终选择",
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userFinalChoice", "value": "continue" }
                    ],
                    "targetId": "reset_system"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "userFinalChoice", "value": "end" }
                    ],
                    "targetId": "end_demo"
                },
                // 默认转换
                { "targetId": "end_demo" }
            ]
        },

        // 重置系统（系统事件）
        {
            "id": "reset_system",
            "type": "system",
            "content": "重置系统状态",
            "setFlags": {
                "userSelectedTopic": null,
                "lastAnswerCorrect": null
            },
            "delay": 500,
            "transitions": [
                { "targetId": "option_selector" }
            ]
        },

        // 结束演示
        {
            "id": "end_demo",
            "type": "message",
            "role": "assistant",
            "content": "🎬 演示结束！\n\n谢谢您体验这个基于事件订阅模式的交互式对话系统。通过这种模式，我们可以创建更自然、更个性化的对话体验，根据用户的选择和行为动态调整对话流程。\n\n您可以返回首页尝试其他演示。",
            "delay": 3000,
            "transitions": []
        }
    ]
} 