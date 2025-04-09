import fetch from 'node-fetch';

const apiKey = process.env.DASHSCOPE_API_KEY;

const data = {
    model: "qwen-plus", // 此处以qwen-plus为例，可按需更换模型名称。模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
    input: {
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant."
            },
            {
                role: "user",
                content: "你是谁？"
            }
        ]
    },
    parameters: {
        result_format: "message"
    }
};

fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(response => response.json())
.then(data => {
    console.log(JSON.stringify(data));
})
.catch(error => {
    console.error('Error:', error);
});