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
    cheat: {
        name: '防诈骗',
        description: '如何防范诈骗',
        image: '/assets/icons/customer-service1.png'
    },
    health: {
        name: '健康咨询',
        description: '健康和医疗相关问题',
        image: '/assets/icons/dog.jpg'
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
    }
}; 