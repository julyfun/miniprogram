// Define metadata structure for features
export interface FeatureMetadata {
    name: string;
    description: string;
    image?: string;
}

// Feature metadata dictionary
export const FEATURE_METADATA: Record<string, FeatureMetadata> = {
    hongbao: {
        name: '红包',
        description: '教我发微信红包',
        image: '/assets/icons/message-redpacket.png'
    },
    food_guide: {
        name: '美食指南',
        description: '美食推荐和制作方法',
        image: '/assets/icons/food.svg'
    },
    emergency: {
        name: '紧急求助',
        description: '紧急情况下的帮助',
        image: '/assets/icons/deepseek.png'
    },
    daily: {
        name: '日常助手',
        description: '日常生活问题',
        image: '/assets/icons/default-avatar.svg'
    },
    scam_call: {
        name: '诈骗来电',
        description: '识别和应对诈骗电话',
        image: '/assets/icons/police.svg'
    },
    scam_call2: {
        name: '亲友求助诈骗',
        description: '识别亲友求助诈骗电话',
        image: '/assets/icons/unknown-caller.svg'
    }
}; 