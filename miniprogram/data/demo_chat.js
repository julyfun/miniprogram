// 智能助手示例对话数据
module.exports = {
    "metadata": {
        "title": "智能助手示例对话",
        "description": "展示与AI智能助手的基础对话流程",
        "opponent": {
            "nickname": "智能助手",
            "avatarUrl": "/assets/icons/deepseek.png"
        },
        "createdAt": "2023-03-27T10:00:00.000Z",
        "updatedAt": "2023-03-27T10:00:00.000Z",
        "tags": ["智能助手", "对话流程", "演示"],
        "startId": "welcome",
        "defaultDelay": 2000
    },
    "events": [
        {
            "id": "welcome",
            "type": "message",
            "role": "opponent",
            "content": "您好，我是智能助手。我可以回答您的问题、提供信息或帮助您完成任务。请问有什么我可以帮您的吗？",
            "delay": 1000,
            "transitions": [
                { "targetId": "waiting_for_first_query" }
            ]
        },
        {
            "id": "waiting_for_first_query",
            "type": "message",
            "role": "system",
            "content": "您可以询问任何问题...",
            "transitions": [
                {
                    "conditions": [
                        { "type": "messageCount", "value": 1 }
                    ],
                    "targetId": "process_first_query"
                }
            ]
        },
        {
            "id": "process_first_query",
            "type": "system",
            "content": "处理用户的第一个问题",
            "setFlags": {
                "userAskedQuestion": true
            },
            "transitions": [
                { "targetId": "assistant_response1" }
            ]
        },
        {
            "id": "assistant_response1",
            "type": "message",
            "role": "opponent",
            "content": "我很乐意回答这个问题。智能助手可以帮助您查询信息、解答问题、提供建议和完成各种任务。您还可以询问我关于天气、新闻、知识百科或者日常生活中的实用问题。",
            "delay": 2000,
            "transitions": [
                { "targetId": "assistant_followup1" }
            ]
        },
        {
            "id": "assistant_followup1",
            "type": "message",
            "role": "opponent",
            "content": "不过，我需要提醒您，在日常使用中要注意个人信息安全，不要轻易向任何人（包括AI助手）提供敏感信息，如银行账号、密码或个人证件号码等。",
            "delay": 2500,
            "transitions": [
                { "targetId": "waiting_for_second_query" }
            ]
        },
        {
            "id": "waiting_for_second_query",
            "type": "message",
            "role": "system",
            "content": "您可以继续提问...",
            "transitions": [
                {
                    "conditions": [
                        { "type": "messageCount", "value": 1 }
                    ],
                    "targetId": "process_second_query"
                }
            ]
        },
        {
            "id": "process_second_query",
            "type": "system",
            "content": "处理用户的第二个问题",
            "transitions": [
                { "targetId": "assistant_response2" }
            ]
        },
        {
            "id": "assistant_response2",
            "type": "message",
            "role": "opponent",
            "content": "这是个很好的问题。要安全地使用智能助手，您可以：\n\n1. 避免分享个人敏感信息\n2. 检查信息的准确性，特别是关键事实\n3. 对要求您点击链接或下载文件的指示保持警惕\n4. 理解AI有时会产生错误，需要您做出判断\n5. 如果是重要决策，请寻求专业建议",
            "delay": 3000,
            "transitions": [
                { "targetId": "assistant_question" }
            ]
        },
        {
            "id": "assistant_question",
            "type": "message",
            "role": "opponent",
            "content": "您平时会经常使用智能助手吗？您通常用它来做什么？",
            "delay": 2000,
            "transitions": [
                { "targetId": "waiting_for_user_response" }
            ]
        },
        {
            "id": "waiting_for_user_response",
            "type": "message",
            "role": "system",
            "content": "请分享您的使用体验...",
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
            "content": "处理用户的回应",
            "transitions": [
                { "targetId": "assistant_final" }
            ]
        },
        {
            "id": "assistant_final",
            "type": "message",
            "role": "opponent",
            "content": "感谢您的分享！无论您是经常使用还是刚开始尝试，智能助手都能在许多方面帮助您提高效率。我们的技术还在不断进步，未来会提供更加精准和个性化的服务。\n\n如果您有任何其他问题，随时可以向我提问。希望您使用愉快！",
            "delay": 3000,
            "transitions": [
                { "targetId": "demo_assessment" }
            ]
        },
        {
            "id": "demo_assessment",
            "type": "assessment",
            "role": "system",
            "content": "您认为智能助手最有价值的功能是什么？",
            "options": [
                "提供信息和知识查询",
                "协助完成任务和提高效率",
                "解决问题和提供建议",
                "提供娱乐和陪伴"
            ],
            "correctAnswer": null,
            "delay": 1000,
            "transitions": [
                { "targetId": "completion" }
            ]
        },
        {
            "id": "completion",
            "type": "message",
            "role": "system",
            "content": "演示结束！这是一个基础的智能助手对话流程示例。在实际应用中，智能助手可以根据您的问题提供更加个性化和深入的回答。感谢您的参与！",
            "delay": 2000,
            "transitions": []
        }
    ]
} 