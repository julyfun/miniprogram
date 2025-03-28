// 图形化事件流演示数据
module.exports = {
    "metadata": {
        "title": "条件图形化示例",
        "description": "演示基于条件分支的对话流程",
        "opponent": {
            "nickname": "安全教练",
            "avatarUrl": "/assets/icons/deepseek.png"
        },
        "createdAt": "2023-03-30T10:00:00.000Z",
        "updatedAt": "2023-03-30T10:00:00.000Z",
        "tags": ["诈骗防范", "安全意识", "演示", "图形结构"],
        "startId": "intro-1"
    },
    "events": [
        // 开场介绍
        {
            "id": "intro-1",
            "type": "message",
            "role": "opponent",
            "content": "您好，我是您的网络安全教练。今天我将帮助您识别和防范常见的网络诈骗。",
            "timestamp": 1000,
            "nextId": "intro-2"
        },
        {
            "id": "intro-2",
            "type": "message",
            "role": "opponent",
            "content": "请记住，识别诈骗的关键是保持警惕，不轻信陌生人的信息，尤其是涉及个人信息和金钱的请求。",
            "timestamp": 3000,
            "nextId": "scenario-start"
        },

        // 场景开始
        {
            "id": "scenario-start",
            "type": "message",
            "role": "opponent",
            "content": "让我们开始一个场景演练。请想象：您收到了一条短信，声称是您的银行发来的。",
            "timestamp": 6000,
            "nextId": "bank-message"
        },

        // 银行信息场景
        {
            "id": "bank-message",
            "type": "message",
            "role": "opponent",
            "content": "【紧急通知】尊敬的用户，您的银行账户存在安全风险。请立即点击以下链接验证身份，否则账户将被冻结：http://bank-verify.fake.com",
            "timestamp": 9000,
            "nextId": "question-1"
        },

        // 第一个问题
        {
            "id": "question-1",
            "type": "assessment",
            "role": "system",
            "content": "这条信息是否可能是诈骗？",
            "options": ["是的，这是诈骗信息", "不是，这是真实的银行通知"],
            "correctAnswer": "是的，这是诈骗信息",
            "explanation": "这是典型的网络钓鱼诈骗。真正的银行不会通过短信发送链接要求您验证身份。",
            "timestamp": 12000,
            "transitions": [
                {
                    "targetId": "correct-path-1",
                    "conditions": [
                        {
                            "type": "correctAnswer",
                            "param": "question-1",
                            "value": true,
                            "operator": "=="
                        }
                    ]
                },
                {
                    "targetId": "wrong-path-1",
                    "conditions": [
                        {
                            "type": "correctAnswer",
                            "param": "question-1",
                            "value": false,
                            "operator": "=="
                        }
                    ]
                }
            ]
        },

        // 正确路径
        {
            "id": "correct-path-1",
            "type": "message",
            "role": "opponent",
            "content": "正确！您很警觉。这确实是一个诈骗信息。真正的银行不会通过短信发送链接让您验证身份。",
            "timestamp": 15000,
            "nextId": "correct-path-2"
        },
        {
            "id": "correct-path-2",
            "type": "message",
            "role": "opponent",
            "content": "在这种情况下，最好的做法是不要点击链接，并直接联系银行的官方客服电话确认情况。",
            "timestamp": 18000,
            "nextId": "followup-question"
        },

        // 错误路径
        {
            "id": "wrong-path-1",
            "type": "message",
            "role": "opponent",
            "content": "注意！这其实是一个诈骗信息。银行不会通过短信发送链接让您验证身份。点击这样的链接可能会导致您的个人信息被盗。",
            "timestamp": 15000,
            "nextId": "wrong-path-2"
        },
        {
            "id": "wrong-path-2",
            "type": "message",
            "role": "opponent",
            "content": "遇到此类情况，应该直接拨打银行官方客服电话确认，不要点击任何链接或提供个人信息。",
            "timestamp": 18000,
            "nextId": "followup-question"
        },

        // 后续问题
        {
            "id": "followup-question",
            "type": "message",
            "role": "opponent",
            "content": "如果您收到类似的短信，您会怎么做？请简单回复一下您的处理方法。",
            "timestamp": 21000,
            "transitions": [
                {
                    "targetId": "response-evaluation",
                    "conditions": [
                        {
                            "type": "messageCount",
                            "value": 0,
                            "operator": ">"
                        }
                    ]
                }
            ]
        },

        // 回复评估
        {
            "id": "response-evaluation",
            "type": "message",
            "role": "opponent",
            "content": "谢谢您的回复。保持警惕和谨慎是防范网络诈骗的关键。",
            "timestamp": 24000,
            "nextId": "final-question"
        },

        // 最终问题
        {
            "id": "final-question",
            "type": "assessment",
            "role": "system",
            "content": "以下哪项是发现可疑信息后的正确做法？",
            "options": [
                "点击链接但不输入个人信息",
                "回复短信询问详情",
                "拨打官方客服电话确认",
                "忽略短信但不采取任何行动"
            ],
            "correctAnswer": "拨打官方客服电话确认",
            "explanation": "最安全的做法是通过官方渠道（如银行官网查询的客服电话）确认情况，不要点击可疑链接或回复可疑短信。",
            "timestamp": 27000,
            "transitions": [
                {
                    "targetId": "task-complete-success",
                    "conditions": [
                        {
                            "type": "correctAnswer",
                            "param": "final-question",
                            "value": true,
                            "operator": "=="
                        },
                        {
                            "type": "messageCount",
                            "value": 0,
                            "operator": ">"
                        }
                    ]
                },
                {
                    "targetId": "task-complete-partial",
                    "conditions": [
                        {
                            "type": "correctAnswer",
                            "param": "final-question",
                            "value": true,
                            "operator": "=="
                        }
                    ]
                },
                {
                    "targetId": "try-again",
                    "conditions": []
                }
            ]
        },

        // 完全成功路径（回答正确且发送过消息）
        {
            "id": "task-complete-success",
            "type": "task_complete",
            "role": "system",
            "content": "恭喜！您已成功完成了网络安全训练。您不仅正确回答了问题，还积极参与了互动，这对防范网络诈骗非常重要！",
            "timestamp": 30000,
            "nextId": "conclusion"
        },

        // 部分成功路径（回答正确但没有发送消息）
        {
            "id": "task-complete-partial",
            "type": "task_complete",
            "role": "system",
            "content": "恭喜！您已完成了网络安全训练。您正确回答了问题，但记得在真实情况中，主动询问和确认也很重要。",
            "timestamp": 30000,
            "nextId": "conclusion"
        },

        // 尝试再次回答
        {
            "id": "try-again",
            "type": "message",
            "role": "opponent",
            "content": "这个答案不太准确。在遇到可疑信息时，最安全的做法是通过官方渠道确认情况，而不是与可疑发送者互动。",
            "timestamp": 30000,
            "nextId": "final-question"
        },

        // 结论
        {
            "id": "conclusion",
            "type": "message",
            "role": "opponent",
            "content": "记住这些防范诈骗的技巧：1) 不点击可疑链接；2) 不向陌生人提供个人敏感信息；3) 遇到可疑情况，通过官方渠道确认；4) 定期更新密码和检查账户活动。",
            "timestamp": 33000
        }
    ]
} 