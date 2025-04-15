/**
 * 诈骗来电模拟教学
 * 演示如何识别和应对潜在诈骗电话
 */

module.exports = {
    id: "scam_call",
    name: "诈骗来电防范",
    description: "掌握识别和应对来电诈骗的技巧，保护自己的财产安全",
    icon: "call.png",
    events: [
        {
            id: "welcome",
            transitions: [
                {
                    event: "wait",
                    nextState: "scam_call_incoming",
                    delay: 2000
                }
            ],
            message: {
                content: "欢迎来到诈骗来电防范训练。在本训练中，你将学习如何识别和应对可能的电话诈骗。请认真听取来电内容，并选择正确的应对方式。"
            }
        },
        {
            id: "scam_call_incoming",
            transitions: [
                {
                    event: "call_answered",
                    nextState: "scam_call_playing"
                }
            ],
            message: {
                content: "您收到一个来自\"金融顾问\"的电话。",
                caller: {
                    name: "金融顾问",
                    avatar: "financial_advisor.png",
                    number: "138****1234"
                }
            }
        },
        {
            id: "scam_call_playing",
            audioFile: "scam_call1.mp3",
            audioDuration: 30,
            transitions: [
                {
                    event: "audio_ended",
                    nextState: "user_response"
                }
            ],
            message: {
                content: "您好，我是某某银行的理财顾问。我们目前有一个非常好的投资机会想向您推荐，是一款高收益低风险的理财产品，年化收益率高达15%。这是一个限时优惠，只提供给我们的特选客户。如果您现在投资10万元，三个月后就能获得3750元的收益。您只需要现在转账到我们的专属账户，我们会立即为您办理。这个机会稍纵即逝，您要抓紧时间。",
                caller: {
                    name: "金融顾问",
                    avatar: "financial_advisor.png",
                    number: "138****1234"
                }
            }
        },
        {
            id: "user_response",
            transitions: [
                {
                    event: "option_selected",
                    nextState: "feedback",
                    options: ["option1", "option2", "option3", "option4"]
                }
            ],
            message: {
                content: "如何应对这个投资推销电话？",
                options: [
                    {
                        id: "option1",
                        text: "立即投资以获取高回报"
                    },
                    {
                        id: "option2",
                        text: "要求对方提供更多信息和时间考虑"
                    },
                    {
                        id: "option3",
                        text: "挂断电话并拉黑号码"
                    },
                    {
                        id: "option4",
                        text: "告诉对方你会咨询家人后回电"
                    }
                ]
            }
        },
        {
            id: "feedback",
            transitions: [
                {
                    event: "next",
                    nextState: "safety_tips"
                }
            ],
            assessments: {
                option1: {
                    score: 0,
                    feedback: "错误！这很可能是一个投资诈骗。合法的金融机构不会通过电话推销高收益产品，也不会要求您立即转账。"
                },
                option2: {
                    score: 30,
                    feedback: "不够安全！与可疑来电继续交流会增加您被诈骗的风险。对方可能会使用更多话术让您相信他们。"
                },
                option3: {
                    score: 100,
                    feedback: "正确！这是处理可疑投资推销电话的最佳方式。合法的金融机构不会通过电话推销高收益产品。挂断并拉黑这类号码可以保护您的财产安全。"
                },
                option4: {
                    score: 50,
                    feedback: "不够安全！告诉对方您会回电可能会导致他们继续联系您，增加风险。最好直接结束对话并举报。"
                }
            },
            message: {
                content: "正确答案：挂断电话并拉黑号码\n\n解释：这明显是一个投资诈骗电话。合法的金融机构不会通过主动电话推销高收益产品，也不会催促您立即转账。这些都是典型的诈骗手法。最安全的做法是立即挂断电话，并将号码拉黑。"
            }
        },
        {
            id: "safety_tips",
            transitions: [
                {
                    event: "next",
                    nextState: "conclusion"
                }
            ],
            message: {
                content: "识别投资诈骗的安全提示：\n\n1. 警惕承诺高回报低风险的投资\n2. 合法金融机构不会通过电话主动推销产品\n3. 不要在压力下做出财务决定\n4. 不要向陌生账户转账\n5. 对于任何投资，都应通过官方渠道核实\n6. 如遇可疑情况，立即报警"
            }
        },
        {
            id: "conclusion",
            transitions: [],
            message: {
                content: "恭喜您完成了诈骗来电防范训练！请记住，合法的金融机构永远不会通过电话推销高收益产品，也不会要求您立即转账。如果接到此类电话，请保持警惕并立即挂断。"
            }
        }
    ]
}; 