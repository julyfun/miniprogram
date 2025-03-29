// 红包教学示例数据
module.exports = {
    "metadata": {
        "title": "微信红包教学",
        "description": "教你如何在微信中发送红包",
        "author": "ChatGPT",
        "version": "1.0.0",
        "opponent": {
            "nickname": "微信助手",
            "avatarUrl": "/assets/icons/deepseek.png"
        },
        "createdAt": "2023-04-15T10:00:00.000Z",
        "updatedAt": "2023-04-15T10:00:00.000Z",
        "tags": ["教学", "红包", "微信功能", "新手指引"],
        "startId": "welcome",
        "defaultDelay": 1000
    },
    "events": [
        // 欢迎事件
        {
            "id": "welcome",
            "type": "message",
            "role": "assistant",
            "content": "👋 欢迎使用微信红包教学！我将指导您如何发送微信红包。",
            "delay": 1500,
            "transitions": [
                { "targetId": "step1_instruction" }
            ]
        },

        // 第一步: 点击加号
        {
            "id": "step1_instruction",
            "type": "message",
            "role": "assistant",
            "content": "第一步：请点击右下角的 + 号按钮",
            "delay": 1000,
            "transitions": [
                { "targetId": "step1_highlight" }
            ]
        },

        // 高亮右下角加号
        {
            "id": "step1_highlight",
            "type": "ui_highlight",
            "role": "system",
            "content": "高亮右下角加号按钮",
            "highlightTarget": "more-button",
            "transitions": [
                { "targetId": "waiting_for_plus_click" }
            ]
        },

        // 等待用户点击加号
        {
            "id": "waiting_for_plus_click",
            "type": "waiting_for_input",
            "role": "system",
            "content": "等待用户点击加号按钮...",
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userClickedPlus", "value": true }
                    ],
                    "targetId": "step2_instruction"
                }
            ]
        },

        // 第二步: 点击红包按钮
        {
            "id": "step2_instruction",
            "type": "message",
            "role": "assistant",
            "content": "太好了！现在请在弹出的菜单中点击“红包”按钮",
            "delay": 1000,
            "transitions": [
                { "targetId": "step2_highlight" }
            ]
        },

        // 高亮红包按钮
        {
            "id": "step2_highlight",
            "type": "ui_highlight",
            "role": "system",
            "content": "高亮红包按钮",
            "highlightTarget": "redpacket",
            "transitions": [
                { "targetId": "waiting_for_redpacket_click" }
            ]
        },

        // 等待用户点击红包
        {
            "id": "waiting_for_redpacket_click",
            "type": "waiting_for_input",
            "role": "system",
            "content": "等待用户点击红包按钮...",
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userClickedRedPacket", "value": true }
                    ],
                    "targetId": "completion"
                }
            ]
        },

        // 完成教学
        {
            "id": "completion",
            "type": "message",
            "role": "assistant",
            "content": "🎉 恭喜！您已经学会了如何发送微信红包。\n\n在实际操作中，下一步您会进入红包金额设置页面，输入金额并添加祝福语后，点击确认即可完成发送。",
            "delay": 2000,
            "transitions": [
                { "targetId": "tutorial_end" }
            ]
        },

        // 教学结束
        {
            "id": "tutorial_end",
            "type": "message",
            "role": "assistant",
            "content": "感谢您完成微信红包发送教学！如果您有其他问题，随时可以向我提问。",
            "delay": 1500
        }
    ]
} 