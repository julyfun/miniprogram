// 照片选择教学示例数据
module.exports = {
    "metadata": {
        "title": "微信照片发送教学",
        "description": "教你如何在微信中发送照片",
        "author": "ChatGPT",
        "version": "1.0.0",
        "opponent": {
            "nickname": "微信助手",
            "avatarUrl": "/assets/icons/deepseek.png"
        },
        "createdAt": "2023-04-15T10:00:00.000Z",
        "updatedAt": "2023-04-15T10:00:00.000Z",
        "tags": ["教学", "照片", "微信功能", "新手指引"],
        "startId": "welcome",
        "defaultDelay": 2000
    },
    "events": [
        // 欢迎事件
        {
            "id": "welcome",
            "type": "message",
            "role": "assistant",
            "content": "👋 您好，我将指导您如何发送微信照片",
            "transitions": [
                {
                    "targetId": "step1_instruction",
                    "delay": 2000
                }
            ]
        },

        // 第一步: 点击加号
        {
            "id": "step1_instruction",
            "type": "message",
            "role": "assistant",
            "content": "首先，请点击右下角的加号键",
            "transitions": [
                {
                    "targetId": "step1_highlight",
                    "delay": 2000
                }
            ]
        },

        // 高亮右下角加号
        {
            "id": "step1_highlight",
            "type": "ui_highlight",
            "highlightTarget": "more-button",
            "transitions": [
                { "targetId": "waiting_for_plus_click" }
            ]
        },

        // 等待用户点击加号
        {
            "id": "waiting_for_plus_click",
            "type": "waiting_for_input",
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userClickedPlus", "value": true }
                    ],
                    "targetId": "step2_instruction"
                }
            ]
        },

        // 第二步: 点击相册按钮
        {
            "id": "step2_instruction",
            "type": "message",
            "role": "assistant",
            "content": "太棒啦！现在请点击相册按钮",
            "transitions": [
                {
                    "targetId": "step2_highlight",
                    "delay": 2000
                }
            ]
        },

        // 高亮相册按钮
        {
            "id": "step2_highlight",
            "type": "ui_highlight",
            "highlightTarget": "album",
            "transitions": [
                { "targetId": "waiting_for_album_click" }
            ]
        },

        // 等待用户点击相册
        {
            "id": "waiting_for_album_click",
            "type": "waiting_for_input",
            "setFlags": { "userClickedAlbum": false },
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userClickedAlbum", "value": true }
                    ],
                    "targetId": "step3_instruction"
                }
            ]
        },

        // 第三步: 选择照片
        {
            "id": "step3_instruction",
            "type": "message",
            "role": "assistant",
            "content": "在相册中，点击照片即可选择。您可以选择多张照片",
            "transitions": [
                {
                    "targetId": "step4_instruction",
                    "delay": 3000
                }
            ]
        },

        // 第四步: 点击发送
        {
            "id": "step4_instruction",
            "type": "message",
            "role": "assistant",
            "content": "选择完照片后，点击右下角的发送按钮",
            "transitions": [
                {
                    "targetId": "waiting_for_photo_send",
                    "delay": 2000
                }
            ]
        },

        // 等待用户点击发送
        {
            "id": "waiting_for_photo_send",
            "type": "waiting_for_input",
            "setFlags": { "userSentPhotos": false },
            "transitions": [
                {
                    "conditions": [
                        { "type": "flag", "key": "userSentPhotos", "value": true }
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
            "content": "恭喜您已经学会了如何发送照片，您可以到微信聊天尝试一下啦~",
            "transitions": [
                {
                    "targetId": "tutorial_end",
                    "delay": 3000
                }
            ]
        },

        // 教学结束
        {
            "id": "tutorial_end",
            "type": "message",
            "role": "assistant",
            "content": "感谢您完成微信照片发送教学！如果您有其他问题，随时可以向我提问。",
            "transitions": []
        }
    ]
} 