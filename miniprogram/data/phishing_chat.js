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
        "tags": ["网络钓鱼", "安全意识", "演示"]
    },
    "events": [
        {
            "type": "message",
            "role": "opponent",
            "content": "【紧急通知】您的银行账户存在异常交易风险，请立即点击链接验证身份信息：https://bank-verify.fake.com",
            "timestamp": 1000
        },
        {
            "type": "message",
            "role": "self",
            "content": "这是什么消息？我没有收到银行的电话通知。",
            "timestamp": 3000
        },
        {
            "type": "message",
            "role": "opponent",
            "content": "这是系统自动检测到的风险提醒，为保障您的账户安全，请尽快完成验证，否则账户将被冻结。",
            "timestamp": 5000
        },
        {
            "type": "message",
            "role": "self",
            "content": "正规银行不会通过短信要求点击链接验证信息。我将直接联系银行客服确认。",
            "timestamp": 7000
        },
        {
            "type": "message",
            "role": "opponent",
            "content": "为方便您快速处理，我们的客服可以直接帮您解决，请提供您的银行卡号和密码。",
            "timestamp": 9000
        },
        {
            "type": "message",
            "role": "self",
            "content": "我不会提供这些敏感信息。这明显是网络钓鱼诈骗，我将举报这个号码。",
            "timestamp": 11000
        },
        {
            "type": "message",
            "role": "opponent",
            "content": "请不要误会，我们是正规银行工作人员。如不处理，您的账户资金将面临风险。",
            "timestamp": 13000
        },
        {
            "type": "message",
            "role": "self",
            "content": "我已拨打银行官方客服电话核实，他们确认这是诈骗信息。请不要再联系我。",
            "timestamp": 15000
        },
        {
            "type": "assessment",
            "role": "system",
            "content": "以上对话是否属于钓鱼诈骗？",
            "options": ["是", "否"],
            "correctAnswer": "是",
            "explanation": "这是典型的钓鱼诈骗手法。真正的银行不会通过短信要求点击链接验证信息，也不会要求您提供完整的银行卡号和密码。遇到此类情况，应直接联系银行官方客服确认。",
            "timestamp": 17000
        }
    ]
} 