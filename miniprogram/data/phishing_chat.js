// 网络钓鱼防范示例对话数据
module.exports = {
    "metadata": {
        "title": "网络钓鱼防范示例",
        "description": "演示常见网络钓鱼诈骗场景的对话流程",
        "opponent": {
            "nickname": "客服小张",
            "avatarUrl": "/assets/icons/customer-service1.png"
        },
        "createdAt": "2023-03-28T10:00:00.000Z",
        "updatedAt": "2023-03-28T10:00:00.000Z",
        "tags": ["网络钓鱼", "安全意识", "演示"],
        "startId": "start_message",
        "defaultDelay": 2000
    },
    "events": [
        {
            "id": "start_message",
            "type": "message",
            "role": "opponent",
            "content": "【紧急通知】您的银行账户存在异常交易风险，请立即点击链接验证身份信息：https://bank-verify.fake.com",
            "delay": 1000,
            "transitions": [
                { "targetId": "user_response_options" }
            ]
        },
        {
            "id": "user_response_options",
            "type": "message",
            "role": "system",
            "content": "您会如何回应这条消息？",
            "delay": 1000,
            "transitions": [
                {
                    "conditions": [
                        { "type": "messageCount", "value": 1 }
                    ],
                    "targetId": "process_user_response"
                }
            ]
        },
        {
            "id": "process_user_response",
            "type": "system",
            "content": "处理用户回应",
            "transitions": [
                { "targetId": "scammer_pressure" }
            ]
        },
        {
            "id": "scammer_pressure",
            "type": "message",
            "role": "opponent",
            "content": "这是系统自动检测到的风险提醒，为保障您的账户安全，请尽快完成验证，否则账户将被冻结。",
            "delay": 2000,
            "transitions": [
                { "targetId": "user_verification_options" }
            ]
        },
        {
            "id": "user_verification_options",
            "type": "message",
            "role": "system",
            "content": "您会怎么验证这条信息的真实性？",
            "delay": 1000,
            "transitions": [
                {
                    "conditions": [
                        { "type": "messageCount", "value": 1 }
                    ],
                    "targetId": "process_verification_response"
                }
            ]
        },
        {
            "id": "process_verification_response",
            "type": "system",
            "content": "处理用户验证方式",
            "transitions": [
                { "targetId": "scammer_request_info" }
            ]
        },
        {
            "id": "scammer_request_info",
            "type": "message",
            "role": "opponent",
            "content": "为方便您快速处理，我们的客服可以直接帮您解决，请提供您的银行卡号和密码。",
            "delay": 2000,
            "transitions": [
                { "targetId": "user_info_options" }
            ]
        },
        {
            "id": "user_info_options",
            "type": "message",
            "role": "system",
            "content": "您会提供您的银行卡信息吗？",
            "delay": 1000,
            "transitions": [
                {
                    "conditions": [
                        { "type": "messageCount", "value": 1 }
                    ],
                    "targetId": "process_info_response"
                }
            ]
        },
        {
            "id": "process_info_response",
            "type": "system",
            "content": "处理用户对信息请求的回应",
            "transitions": [
                { "targetId": "scammer_insistence" }
            ]
        },
        {
            "id": "scammer_insistence",
            "type": "message",
            "role": "opponent",
            "content": "请不要误会，我们是正规银行工作人员。如不处理，您的账户资金将面临风险。",
            "delay": 2000,
            "transitions": [
                { "targetId": "user_final_action" }
            ]
        },
        {
            "id": "user_final_action",
            "type": "message",
            "role": "system",
            "content": "您会采取什么最终行动？",
            "delay": 1000,
            "transitions": [
                {
                    "conditions": [
                        { "type": "messageCount", "value": 1 }
                    ],
                    "targetId": "process_final_action"
                }
            ]
        },
        {
            "id": "process_final_action",
            "type": "system",
            "content": "处理用户最终行动",
            "transitions": [
                { "targetId": "phishing_assessment" }
            ]
        },
        {
            "id": "phishing_assessment",
            "type": "assessment",
            "role": "system",
            "content": "以上对话是否属于钓鱼诈骗？",
            "options": ["是", "否"],
            "correctAnswer": "是",
            "explanation": "这是典型的钓鱼诈骗手法。真正的银行不会通过短信要求点击链接验证信息，也不会要求您提供完整的银行卡号和密码。遇到此类情况，应直接联系银行官方客服确认。",
            "delay": 1000,
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "lastAnswerCorrect", "value": true }
                    ],
                    "targetId": "correct_assessment"
                },
                {
                    "conditions": [
                        { "type": "flag", "key": "lastAnswerCorrect", "value": false }
                    ],
                    "targetId": "incorrect_assessment"
                }
            ]
        },
        {
            "id": "correct_assessment",
            "type": "message",
            "role": "system",
            "content": "✅ 正确！这确实是一个典型的钓鱼诈骗案例。记住以下防范要点：\n\n1. 银行不会通过短信要求点击链接验证信息\n2. 不要向陌生人提供银行卡号和密码\n3. 收到可疑信息时，直接联系银行官方客服确认\n4. 对要求提供敏感信息的请求保持警惕",
            "delay": 3000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },
        {
            "id": "incorrect_assessment",
            "type": "message",
            "role": "system",
            "content": "❌ 这其实是一个典型的钓鱼诈骗案例。需要注意以下防范要点：\n\n1. 银行不会通过短信要求点击链接验证信息\n2. 不要向陌生人提供银行卡号和密码\n3. 收到可疑信息时，直接联系银行官方客服确认\n4. 对要求提供敏感信息的请求保持警惕",
            "delay": 3000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },
        {
            "id": "completion",
            "type": "message",
            "role": "system",
            "content": "演示结束！感谢您参与网络钓鱼防范示例演示。保持警惕，保护您的个人信息安全。",
            "delay": 2000,
            "transitions": []
        }
    ]
} 