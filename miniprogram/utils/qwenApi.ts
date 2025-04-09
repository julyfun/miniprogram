import { QWEN_SECRETS } from './secrets';

interface QwenResponse {
    output: {
        text: string;
        choices?: Array<{
            message: {
                content: string;
            };
        }>;
    };
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
    request_id: string;
}

export async function callQwenApi(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        wx.request({
            url: QWEN_SECRETS.API_URL,
            method: 'POST',
            header: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${QWEN_SECRETS.API_KEY}`,
                'X-DashScope-SSE': 'disable'
            },
            data: {
                model: QWEN_SECRETS.MODEL,
                input: {
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                },
                parameters: {
                    result_format: "message",
                    temperature: 0.7,
                    max_tokens: 1000
                }
            },
            success: (res: any) => {
                console.log('Qwen API raw response:', JSON.stringify(res, null, 2));

                if (res.statusCode === 200 && res.data) {
                    const response = res.data as QwenResponse;

                    // Try different response formats
                    let responseText = '';

                    if (response.output && response.output.text) {
                        responseText = response.output.text;
                    } else if (response.output && response.output.choices &&
                        response.output.choices[0] &&
                        response.output.choices[0].message &&
                        response.output.choices[0].message.content) {
                        responseText = response.output.choices[0].message.content;
                    }

                    if (responseText) {
                        console.log('Extracted response text:', responseText);
                        resolve(responseText);
                    } else {
                        console.error('No valid response text found in:', response);
                        reject(new Error('No valid response text found in API response'));
                    }
                } else {
                    console.error('Qwen API error response:', res);
                    reject(new Error(`API request failed with status ${res.statusCode}: ${JSON.stringify(res.data)}`));
                }
            },
            fail: (error) => {
                console.error('Qwen API request failed:', error);
                reject(error);
            }
        });
    });
} 