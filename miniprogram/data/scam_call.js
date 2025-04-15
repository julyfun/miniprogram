/**
 * 诈骗来电模拟教学（投资理财诈骗）
 * 演示如何识别和应对潜在诈骗电话
 */

module.exports = {
    metadata: {
        title: "投资理财诈骗防范教学",
        description: "学习如何识别和应对投资理财类诈骗电话",
        opponent: {
            nickname: "金融顾问",
            avatarUrl: "/assets/icons/financial_advisor.svg"
        },
        createdAt: "2023-04-15",
        updatedAt: "2024-04-15",
        tags: ["安全防护", "诈骗防范", "来电", "投资诈骗"],
        startId: "start"
    },
    events: [
        // 开始事件
        {
            id: "start",
            type: "message",
            role: "assistant",
            content: "欢迎来到诈骗来电防范训练。在本训练中，你将学习如何识别和应对可能的电话诈骗。请认真听取来电内容，并选择正确的应对方式。",
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
            callerName: "金融顾问",
            callerAvatar: "/assets/icons/financial_advisor.svg",
            callerId: "financial_scam",
            callRingtone: "cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/assets/audio/ringtone.mp3",
            callAudio: "cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/assets/audio/scam_call/scam_call1.mp3",
            callDuration: 30,
            audioContent: "您好，我是某某银行的理财顾问。我们目前有一个非常好的投资机会想向您推荐，是一款高收益低风险的理财产品，年化收益率高达15%。这是一个限时优惠，只提供给我们的特选客户。如果您现在投资10万元，三个月后就能获得3750元的收益。您只需要现在转账到我们的专属账户，我们会立即为您办理。这个机会稍纵即逝，您要抓紧时间。",
            setFlags: {
                callType: "financial_scam"
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
            content: "您选择了拒绝接听。对于陌生号码来电保持警惕是非常好的做法！特别是声称提供高收益投资机会的陌生来电。",
            transitions: [
                {
                    targetId: "assessment",
                    delay: 2000
                }
            ]
        },
        // 警示提示
        {
            id: "warning_tips",
            type: "message",
            role: "assistant",
            content: "⚠️ 警告：您刚刚听到的是典型的投资理财诈骗话术。诈骗分子通过以下方式诱导受害者：\n1. 谎称高收益低风险（\"年化收益率高达15%\"）\n2. 营造限时紧迫感（\"这个机会稍纵即逝\"）\n3. 制造特权错觉（\"只提供给我们的特选客户\"）\n4. 要求立即转账到所谓的\"专属账户\"",
            transitions: [
                {
                    targetId: "assessment",
                    delay: 1000
                }
            ]
        },
        // 用户回应选项
        {
            id: "assessment",
            type: "assessment",
            role: "assistant",
            content: "如何应对这个投资推销电话？",
            options: [
                "立即投资以获取高回报",
                "要求对方提供更多信息和时间考虑",
                "挂断电话并拉黑号码",
                "告诉对方你会咨询家人后回电"
            ],
            correctAnswer: "挂断电话并拉黑号码",
            explanation: "正确！这是处理可疑投资推销电话的最佳方式。合法的金融机构不会通过电话推销高收益产品。挂断并拉黑这类号码可以保护您的财产安全。合法的金融机构不会通过主动电话推销高收益产品，也不会催促您立即转账。这些都是典型的诈骗手法。最安全的做法是立即挂断电话，并将号码拉黑。",
            transitions: [
                {
                    targetId: "safety_tips",
                    delay: 2000
                }
            ]
        },
        // 安全提示
        {
            id: "safety_tips",
            type: "message",
            role: "assistant",
            content: "识别投资诈骗的安全提示：\n\n1. 警惕承诺高回报低风险的投资\n2. 合法金融机构不会通过电话主动推销产品\n3. 不要在压力下做出财务决定\n4. 不要向陌生账户转账\n5. 对于任何投资，都应通过官方渠道核实\n6. 如遇可疑情况，立即报警",
            transitions: [
                {
                    targetId: "conclusion",
                    delay: 2000
                }
            ]
        },
        // 结论
        {
            id: "conclusion",
            type: "message",
            role: "assistant",
            content: "恭喜您完成了诈骗来电防范训练！请记住，合法的金融机构永远不会通过电话推销高收益产品，也不会要求您立即转账。如果接到此类电话，请保持警惕并立即挂断。",
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
            content: "投资理财诈骗防范教学已完成",
            role: "assistant"
        }
    ]
}; 