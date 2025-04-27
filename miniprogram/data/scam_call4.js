/**
 * 诈骗来电模拟教学（冒充社保局诈骗）
 * 演示如何识别和应对假冒社保局的诈骗电话
 */

module.exports = {
    metadata: {
        title: "冒充社保局诈骗防范教学",
        description: "学习如何识别和应对冒充社保局的诈骗电话",
        opponent: {
            nickname: "北京市社保局",
            avatarUrl: "/assets/icons/government.svg"
        },
        createdAt: "2024-04-20",
        updatedAt: "2024-04-20",
        tags: ["安全防护", "诈骗防范", "来电", "冒充社保局"],
        startId: "start"
    },
    events: [
        // 开始事件
        {
            id: "start",
            type: "message",
            content: "欢迎参加冒充社保局诈骗防范教学。在这个教学中，您将接到一个冒充社保局的诈骗电话，请注意对方的言辞，学习如何识别和应对此类诈骗。",
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
            callerName: "北京市社保局",
            callerAvatar: "/assets/icons/government.svg",
            callerId: "social_security_scam",
            callRingtone: "/assets/audio/ringtone.mp3",
            callAudio: "/assets/audio/scam_call/scam_call4.mp3",
            callDuration: 30,
            audioContent: "您好，这里是北京市社保局稽查科。您的社保卡（编号尾号***）于2024年3月在上海异常报销医疗费用18.7万元，涉嫌骗保行为！现已被列入人社部黑名单，案件编号【2024】社稽字第号。请立即登录'国家社保认证中心'（发送链接）提交申诉材料，否则2小时内将永久冻结您的社保账户并追究刑事责任！注意：此案已立案侦查，切勿向他人透露验证码！",
            setFlags: {
                callType: "social_security_scam"
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
            content: "您选择了拒绝接听。对于自称政府部门的陌生来电保持警惕是非常好的做法！真正的社保局不会通过电话告知涉案情况，也不会要求您登录所谓的'国家社保认证中心'。",
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
            content: "⚠️ 警告：您刚刚听到的是典型的冒充社保局诈骗话术。诈骗分子通过以下方式诱导受害者：\n1. 谎称您涉嫌违规（\"涉嫌骗保行为\"）\n2. 提及具体金额制造震慑（\"异常报销医疗费用18.7万元\"）\n3. 使用专业术语营造权威感（\"人社部黑名单\"，\"案件编号\"）\n4. 制造紧迫感（\"2小时内将永久冻结您的社保账户\"）\n5. 要求登录虚假网站（\"国家社保认证中心\"）\n6. 恐吓禁止向他人透露（\"切勿向他人透露验证码\"）",
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
            content: "遇到自称是社保局的电话，声称您的社保卡涉嫌骗保，您认为应该怎么做？",
            options: [
                "按照对方要求登录'国家社保认证中心'，提交申诉材料",
                "向对方提供个人信息和验证码，配合调查以避免被冻结社保账户",
                "挂断电话，通过12333（人力资源和社会保障电话服务）或当地社保局官方电话核实",
                "保持通话，按指示操作，不向任何人透露验证码，以免被追究刑事责任"
            ],
            correctAnswer: "挂断电话，通过12333（人力资源和社会保障电话服务）或当地社保局官方电话核实",
            explanation: "最安全的做法是挂断电话，通过官方渠道（如12333或当地社保局官方电话）进行核实。真正的社保部门不会通过电话要求您登录任何'国家社保认证中心'，不会威胁'2小时内冻结账户'，也不会专门提醒您'不要透露验证码'。社保调查通常会通过正规的书面通知或要求您到社保局窗口办理。",
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
            content: "冒充社保局诈骗识别要点：" +
                "\n1. 通过电话通知涉案情况（真实社保部门不会这样做）" +
                "\n2. 要求登录特定网站或APP（如'国家社保认证中心'）" +
                "\n3. 具体提及巨额涉案金额（例如'18.7万元'）" +
                "\n4. 使用专业术语营造权威感（'人社部黑名单'、'案件编号'）" +
                "\n5. 设置短时间期限（'2小时内将永久冻结您的社保账户'）" +
                "\n6. 特别提醒不要透露验证码（真实部门不会这样做）" +
                "\n\n遇到此类电话时：" +
                "\n1. 保持冷静，不要被所谓的'黑名单'和'刑事责任'吓到" +
                "\n2. 不提供任何个人信息或验证码" +
                "\n3. 不点击任何链接或扫描二维码" +
                "\n4. 挂断后拨打12333或当地社保局官方电话核实" +
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
            content: "恭喜您完成了冒充社保局诈骗防范教学！" +
                "\n\n切记，真正的社保局：" +
                "\n· 不会通过电话告知您涉嫌骗保" +
                "\n· 不会要求您登录所谓的'国家社保认证中心'" +
                "\n· 不会设置短时限威胁冻结您的社保账户" +
                "\n· 不会特别提醒您不要向他人透露验证码" +
                "\n\n如接到此类电话，请保持警惕，挂断后拨打12333或当地社保局官方电话核实真伪。",
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
            content: "冒充社保局诈骗防范教学已完成"
        }
    ]
}; 