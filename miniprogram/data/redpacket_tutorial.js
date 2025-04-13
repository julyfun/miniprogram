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
        "defaultDelay": 2000
    },
    "events": [
        // 欢迎事件
        {
            "id": "welcome",
            "type": "message",
            "role": "assistant",
            "content": "👋 您好，我将指导您如何发送微信红包",
            "audioUri": "assets/voice/redpacket_tutorial/iwill.mp3",
            "transitions": [
                {
                    "targetId": "step1_instruction",
                    "delay": 4000
                }
            ]
        },

        // 第一步: 点击加号
        {
            "id": "step1_instruction",
            "type": "message",
            "role": "assistant",
            "content": "首先，请点击右下角的加号键",
            "audioUri": "assets/voice/redpacket_tutorial/plusbutton.mp3",
            "transitions": [
                {
                    "targetId": "step1_highlight",
                    "delay": 3500
                }
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
            "content": "太棒啦！现在请点击红包按钮",
            "audioUri": "assets/voice/redpacket_tutorial/redpacketbutton.mp3",
            "transitions": [
                {
                    "targetId": "step2_highlight",
                    "delay": 3000
                }
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
                    "targetId": "step3_instruction"
                }
            ]
        },

        // 第三步: 点击金额数字
        {
            "id": "step3_instruction",
            "type": "message",
            "role": "assistant",
            "content": "接下来请点击金额数字",
            "audioUri": "assets/voice/redpacket_tutorial/number.mp3",
            "transitions": [
                {
                    "targetId": "step3_highlight",
                    "delay": 4000
                }
            ]
        },

        // 高亮金额输入区
        {
            "id": "step3_highlight",
            "type": "ui_highlight",
            "role": "system",
            "content": "高亮金额输入区",
            "highlightTarget": "amount-input",
            "transitions": [
                { "targetId": "step4_instruction" }
            ]
        },
        // 第四步: 输入金额
        {
            "id": "step4_instruction",
            "type": "message",
            "role": "assistant",
            "content": "然后用下面的数字键盘输入红包金额",
            "audioUri": "assets/voice/redpacket_tutorial/number2.mp3",
            "transitions": [
                {
                    "targetId": "waiting_for_amount_input",
                    "delay": 4000
                }
            ]
        },

        // 等待用户输入金额
        {
            "id": "waiting_for_amount_input",
            "type": "waiting_for_input",
            "role": "system",
            "content": "等待用户输入金额...",
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userChangedAmount", "value": true }
                    ],
                    "targetId": "step4_after_amount_input",
                    "delay": 2000
                }
            ]
        },

        // 第四步: 输入金额后的提示
        {
            "id": "step4_after_amount_input",
            "type": "message",
            "role": "assistant",
            "content": "很好！您已成功输入了红包金额",
            "transitions": [
                {
                    "targetId": "step5_instruction",
                    "delay": 2000
                }
            ]
        },


        // 第五步: 塞钱进红包
        {
            "id": "step5_instruction",
            "type": "message",
            "role": "assistant",
            "content": "输入金额以后，点击塞钱进红包",
            "audioUri": "assets/voice/redpacket_tutorial/into.mp3",
            "transitions": [
                {
                    "targetId": "step6_instruction",
                    "delay": 4000
                }
            ]
        },

        // 第六步: 最后确认支付
        {
            "id": "step6_instruction",
            "type": "message",
            "role": "assistant",
            "content": "最后确认支付就可以发送啦。这里的红包教学不会扣除您的金额，请放心发送",
            "audioUri": "assets/voice/redpacket_tutorial/confirm.mp3",
            "transitions": [
                {
                    "targetId": "step7_transfer_confirm",
                    "delay": 4000
                }
            ]
        },

        // 添加转账确认界面提示
        {
            "id": "step7_transfer_confirm",
            "type": "message",
            "role": "assistant",
            "content": "当您点击确认支付后，会出现转账确认界面。请确认收款方信息和金额无误后再点击【支付】",
            "transitions": [
                {
                    "targetId": "step7_highlight_pay",
                    "delay": 3000
                }
            ]
        },

        // 高亮支付按钮
        {
            "id": "step7_highlight_pay",
            "type": "ui_highlight",
            "role": "system",
            "content": "高亮支付按钮",
            "highlightTarget": "pay-button",
            "transitions": [
                {
                    "targetId": "completion",
                    "delay": 4000
                }
            ]
        },

        // 完成教学
        {
            "id": "completion",
            "type": "message",
            "role": "assistant",
            "content": "恭喜您已经学会了如何发红包，您可以到微信聊天尝试一下啦~",
            "audioUri": "assets/voice/redpacket_tutorial/cong.mp3",
            "transitions": [
                {
                    "targetId": "tutorial_end",
                    "delay": 4000
                }
            ]
        },

        // 教学结束
        {
            "id": "tutorial_end",
            "type": "message",
            "role": "assistant",
            "content": "感谢您完成微信红包发送教学！如果您有其他问题，随时可以向我提问。",
            "transitions": []
        }
    ]
} 