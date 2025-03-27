// 诈骗防范示例对话数据
module.exports = {
    "metadata": {
        "title": "诈骗防范示例对话",
        "description": "演示常见诈骗场景的对话流程",
        "opponent": {
            "nickname": "客服小李",
            "avatarUrl": "/assets/icons/deepseek.png"
        },
        "createdAt": "2023-03-27T10:00:00.000Z",
        "updatedAt": "2023-03-27T10:00:00.000Z",
        "tags": ["诈骗防范", "安全意识", "演示"]
    },
    "events": [
        {
            "type": "message",
            "role": "opponent",
            "content": "您好，我是某某快递客服小李，您的包裹出现了一些问题需要处理。",
            "timestamp": 1000
        },
        {
            "type": "message",
            "role": "opponent",
            "content": "我们发现您的包裹地址信息不完整，需要您重新提供一下完整的收件信息。",
            "timestamp": 3000
        },
        {
            "type": "message",
            "role": "self",
            "content": "我最近确实有在网上购物，请问是哪个包裹呢？",
            "timestamp": 6000
        },
        {
            "type": "message",
            "role": "opponent",
            "content": "是您在XX平台购买的商品，订单号为SHDJ3729382。为了确认您的身份，请提供一下您的身份证号码和银行卡信息。",
            "timestamp": 9000
        },
        {
            "type": "message",
            "role": "self",
            "content": "等等，正规快递公司不会要求提供身份证和银行卡信息。您是哪家快递公司的？",
            "timestamp": 12000
        },
        {
            "type": "message",
            "role": "opponent",
            "content": "我们是XX快递的合作伙伴，负责处理特殊包裹。如果不方便提供，也可以点击这个链接进行身份验证：http://verify-express.fake.com",
            "timestamp": 15000
        },
        {
            "type": "message",
            "role": "self",
            "content": "我不会点击不明链接，也不会提供敏感个人信息。我怀疑这是诈骗，我将向官方客服核实。",
            "timestamp": 18000
        },
        {
            "type": "message",
            "role": "opponent",
            "content": "别着急，我们是正规公司。如果不处理的话，您的包裹可能会被退回，您已经付款的商品将无法收到。",
            "timestamp": 21000
        },
        {
            "type": "message",
            "role": "self",
            "content": "我将通过官方APP查询我的包裹状态，或者拨打官方客服电话。请不要再联系我了。",
            "timestamp": 24000
        }
    ]
} 