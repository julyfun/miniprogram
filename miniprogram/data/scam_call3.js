/**
 * 诈骗来电模拟教学（冒充公检法诈骗）
 * 演示如何识别和应对假冒公检法的诈骗电话
 */

module.exports = {
    metadata: {
        title: "冒充公检法诈骗防范教学",
        description: "学习如何识别和应对冒充公检法机关的诈骗电话",
        opponent: {
            nickname: "北京市公安局",
            avatarUrl: "/assets/icons/police.svg"
        },
        createdAt: "2024-04-15",
        updatedAt: "2024-04-15",
        tags: ["安全防护", "诈骗防范", "来电", "冒充公检法"],
        startId: "start"
    },
    events: [
        // 开始事件
        {
            id: "start",
            type: "message",
            content: "欢迎参加冒充公检法诈骗防范教学。在这个教学中，您将接到一个冒充公安局的诈骗电话，请注意对方的言辞，学习如何识别和应对此类诈骗。",
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
            callerName: "北京市公安局",
            callerAvatar: "/assets/icons/police.svg",
            callerId: "police_scam",
            callRingtone: "/assets/audio/ringtone.mp3",
            callAudio: "/assets/audio/scam_call/scam_call3.mp3",
            callDuration: 30,
            audioContent: "您好，这里是北京市公安局经济犯罪侦查科。我们查到您名下的一张银行卡（尾号**）涉及一起重大洗钱案件，涉案金额高达268万元！目前最高检已发布通缉令，案件编号【2024】刑字第*号。为配合调查，请您立即登录'最高检安全账户核查系统'（发送链接），如实申报名下所有资产。若两小时内未完成认证，我们将依法冻结您的全部账户并实施抓捕！请保持通话，不要向任何人透露案情，否则将按泄密罪处理！",
            setFlags: {
                callType: "police_scam"
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
            content: "您选择了拒绝接听。对于自称执法机构的陌生来电保持警惕是非常好的做法！真正的公安机关不会通过电话告知涉案情况，也不会要求您登录所谓的'安全账户核查系统'。",
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
            content: "⚠️ 警告：您刚刚听到的是典型的冒充公检法诈骗话术。诈骗分子通过以下方式诱导受害者：\n1. 谎称您涉嫌犯罪（\"涉及重大洗钱案件\"）\n2. 提及具体金额制造震慑（\"涉案金额高达268万元\"）\n3. 使用专业术语营造权威感（\"最高检已发布通缉令\"，\"案件编号\"）\n4. 制造紧迫感（\"两小时内未完成认证将冻结账户\"）\n5. 要求登录虚假网站（\"最高检安全账户核查系统\"）\n6. 恐吓禁止向他人透露（\"按泄密罪处理\"）",
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
            content: "遇到自称是公安、检察院或法院的电话，声称您涉嫌违法犯罪，您认为应该怎么做？",
            options: [
                "按照对方要求登录'最高检安全账户核查系统'，以证明自己的清白",
                "向对方提供个人信息和银行账户信息，配合调查以避免被抓捕",
                "挂断电话，通过12339（全国反诈中心）或114查询当地公安机关电话自行核实",
                "保持通话，按指示操作，不向任何人透露案情，以免被按泄密罪处理"
            ],
            correctAnswer: "挂断电话，通过12339（全国反诈中心）或114查询当地公安机关电话自行核实",
            explanation: "最安全的做法是挂断电话，通过官方渠道（如12339全国反诈中心或114查询）获取真实的公安机关电话号码进行核实。真正的公安机关不会通过电话要求您登录任何'安全账户核查系统'，不会威胁'两小时内冻结账户'，也不会以'泄密罪'恐吓您。涉案调查通常会通过正规的书面通知或当面调查。",
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
            content: "冒充公检法诈骗识别要点：" +
                "\n1. 通过电话通知涉案情况（真实公安不会这样做）" +
                "\n2. 要求登录特定网站或APP（如'最高检安全账户核查系统'）" +
                "\n3. 具体提及巨额涉案金额（例如'268万元'）" +
                "\n4. 使用专业术语营造权威感（'通缉令'、'案件编号'）" +
                "\n5. 设置短时间期限（'两小时内未完成认证将冻结账户'）" +
                "\n6. 要求保密，禁止向他人透露（'按泄密罪处理'）" +
                "\n\n遇到此类电话时：" +
                "\n1. 保持冷静，不要被所谓的'案件'和'抓捕'吓到" +
                "\n2. 不提供任何个人信息或银行账户信息" +
                "\n3. 不点击任何链接或扫描二维码" +
                "\n4. 挂断后拨打12339（全国反诈中心）核实" +
                "\n5. 如已遭诈骗请立即向当地公安机关报案",
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
            content: "恭喜您完成了冒充公检法诈骗防范教学！" +
                "\n\n切记，真正的公安机关、检察院和法院：" +
                "\n· 不会通过电话告知您涉嫌违法犯罪" +
                "\n· 不会要求您登录所谓的'安全账户核查系统'" +
                "\n· 不会设置短时限威胁冻结您的账户或抓捕" +
                "\n· 不会要求您保持通话并禁止告知亲友" +
                "\n\n如接到此类电话，请保持警惕，挂断后拨打12339（全国反诈中心）核实真伪。",
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
            content: "冒充公检法诈骗防范教学已完成"
        }
    ]
}; 