/**
 * 诈骗来电模拟教学（亲属求助诈骗）
 * 演示如何识别和应对潜在诈骗电话
 */

module.exports = {
    metadata: {
        title: "亲属求助诈骗防范教学",
        description: "学习如何识别和应对亲属求助类诈骗电话",
        opponent: {
            nickname: "陌生来电",
            avatarUrl: "/assets/icons/unknown-caller.svg"
        },
        createdAt: "2023-04-15",
        updatedAt: "2023-04-15",
        tags: ["安全防护", "诈骗防范", "来电", "亲情诈骗"],
        startId: "start"
    },
    events: [
        // 开始事件
        {
            id: "start",
            type: "message",
            role: "assistant",
            content: "欢迎参加亲属求助诈骗防范教学。在这个教学中，您将学习如何识别和应对冒充亲友的诈骗电话。",
            transitions: [
                {
                    targetId: "intro",
                    delay: 1500
                }
            ]
        },
        // 介绍
        {
            id: "intro",
            type: "message",
            role: "assistant",
            content: "接下来您将接到一个可疑的诈骗电话，请根据您的判断选择接听或拒绝。如果接听，请注意对方的言辞和要求，学习如何安全应对。",
            transitions: [
                {
                    targetId: "incoming_call_1",
                    delay: 2000
                }
            ]
        },
        // 诈骗来电
        {
            id: "incoming_call_1",
            type: "incoming_call",
            callerName: "侄子小明",
            callerAvatar: "/assets/icons/unknown-caller.svg",
            callerId: "relative_scam",
            callRingtone: "/assets/audio/ringtone.mp3",
            callAudio: "/assets/audio/scam_call/scam_call2.mp3",
            setFlags: {
                callType: "relative_scam"
            },
            transitions: [
                {
                    targetId: "call_declined_tips",
                    conditions: [
                        {
                            type: "flag",
                            key: "callStatus",
                            value: "declined"
                        }
                    ]
                },
                {
                    targetId: "warning_tips",
                    conditions: [
                        {
                            type: "flag",
                            key: "callStatus",
                            value: "accepted"
                        },
                        {
                            type: "flag",
                            key: "callEnded",
                            value: true
                        }
                    ],
                    delay: 500
                }
            ]
        },
        // 拒接电话的提示
        {
            id: "call_declined_tips",
            type: "message",
            role: "assistant",
            content: "您选择了拒绝接听。对于陌生号码来电保持警惕是非常好的做法！即使显示是亲友姓名，也可能是诈骗分子利用网络信息设置的。",
            transitions: [
                {
                    targetId: "safety_tips_1",
                    delay: 2000
                }
            ]
        },
        // 警示提示
        {
            id: "warning_tips",
            type: "message",
            role: "assistant",
            content: "⚠️ 警告：您刚刚听到的是典型的亲属求助诈骗话术。诈骗分子通过以下方式诱导受害者：\n1. 利用亲情，制造紧急情况（\"我出事了\"）\n2. 声称遇到涉及面子的尴尬处境（\"嫖娼被抓\"）\n3. 要求保密，尤其是对其他家人（\"千万别告诉我妈\"）\n4. 设置时间压力（\"半小时内处理\"）\n5. 承诺尽快返还（\"回去马上还你\"）",
            transitions: [
                {
                    targetId: "user_response_options",
                    delay: 1000
                }
            ]
        },
        // 用户回应选项
        {
            id: "user_response_options",
            type: "assessment",
            role: "assistant",
            content: "遇到这种疑似亲友求助的电话，您认为应该怎么做？",
            options: [
                "立即转账救急，家人遇到困难应该帮忙",
                "先联系其他家人确认情况，再决定是否转账",
                "挂断电话，通过已知的联系方式直接联系这位亲友核实",
                "告诉对方您需要时间筹钱，稍后给他回电"
            ],
            correctAnswer: "挂断电话，通过已知的联系方式直接联系这位亲友核实",
            explanation: "最安全的做法是挂断电话，通过您已知的联系方式（如平时存的手机号）直接联系这位亲友核实情况。无论多么紧急的情况，都应该先验证对方身份。诈骗分子往往利用紧急情况和情感因素使您失去判断力。",
            transitions: [
                {
                    targetId: "safety_tips_1",
                    delay: 2000
                }
            ]
        },
        // 安全提示1
        {
            id: "safety_tips_1",
            type: "message",
            role: "assistant",
            content: "亲属求助诈骗识别要点：\n1. 陌生号码突然来电自称亲友\n2. 声称遇到紧急情况或尴尬处境\n3. 要求立即转账并保密\n4. 情绪激动或哭泣，制造紧张气氛\n5. 不愿多谈细节或有明显矛盾之处",
            transitions: [
                {
                    targetId: "safety_tips_2",
                    delay: 3000
                }
            ]
        },
        // 安全提示2
        {
            id: "safety_tips_2",
            type: "message",
            role: "assistant",
            content: "遇到疑似亲友求助电话时：\n1. 保持冷静，不要被紧急情况所左右\n2. 询问只有真正亲友知道的私人信息\n3. 告诉对方您需要核实，通过已知联系方式联系该亲友\n4. 与其他家人商量确认情况\n5. 如果确认是诈骗，及时向警方报案",
            transitions: [
                {
                    targetId: "conclusion",
                    delay: 3000
                }
            ]
        },
        // 结论
        {
            id: "conclusion",
            type: "message",
            role: "assistant",
            content: "恭喜您完成了亲属求助诈骗防范教学！切记，遇到亲友突然求助转账，无论情况多么紧急，都应该先通过可靠渠道核实对方身份。诈骗分子擅长利用亲情和紧急情况让人失去警惕性。保持冷静思考是防范诈骗的关键。",
            transitions: [
                {
                    targetId: "task_complete",
                    delay: 2000
                }
            ]
        },
        // 任务完成
        {
            id: "task_complete",
            type: "task_complete",
            content: "亲属求助诈骗防范教学已完成",
            role: "assistant"
        }
    ]
}; 