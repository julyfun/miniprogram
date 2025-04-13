阿里巴巴的语音识别 SDK 位置：miniprogram\third_party\alibabacloud-nls-wx-sdk
可通过 require 导入
根据 miniprogram\third_party\aliba.md 中的说明，重构语音识别部分，在首页进行实时语音识别（按键时说话即可在文本框中显示实时识别出来的文字）。如果需要什么信息或者 token 可以问我.

## .

o首页改为一个语音助手对话界面，

## .

这是给 AI 的初始提示词. 放到 miniprogram/utils/config.ts 中，开始时就给 AI 发送一次。

每次 AI 回复中检测是否有 [function:...]形式，如果有，预留跳转接口。`[function:hongbao]` 跳转到 event-demo 中的红包教学界面.

```
```

## 修复问题

1. 进入首页后自动跳转到了微信聊天界面。这个不需要
2. 对话显示位置不应该与对话按钮所在位置交叉，且要能滑动.

- AI 点击对话的圆圈改为 assets/icons/dog.jpg，说话过程中会可爱地变形振动，AI 思考时会转圈

## 闯关模式

- AI 聊天界面在

- event-demo 

- 任务描述
   - 每句话和对应 MP3 文件名


### 

为 event-demo 添加语音播放功能，可输入 URI 播放音频。每个对方对话可以绑定一个音频。目前每个对话对应音频 URI 都是 assets/voice/redpacket_tutorial/iwill.mp3 。当前仅修改 redpacket_tutorial 相关教学 

## 步骤修改为

1. 您好，我将指导您如何发送微信红包 (iwill.mp3)

2. 首先，请点击右下角的 + 号键 (plusbutton.mp3)

3. 太棒啦！现在请点击红包按钮 (redpacketbutton.mp3)

4. 接下来请点击金额数字 (number.mp3)

5. 然后用下面的数字键盘输入红包金额 (number2.mp3)

6. 输入金额以后，点击塞钱进红包 (into.mp3)

7. 最后确认支付就可以发送啦。这里的红包教学不会扣除您的金额，请放心发送 (confirm.mp3)

8. 恭喜您已经学会了如何发红包，您可以到微信聊天尝试一下啦~ (cong.mp3)

## 

redpacket_tutorial.js event-demo.ts
红包教学 redpacket_tutorial 需要进行如下优化
1. 根据说话文字多少调整 delay，现在大部分 delay 都偏少
2. 红包输入金额界面允许高亮，并等待用户修改金额后 2s 再执行下一事件
3. 添加转账确认界面（如 Image 图片所示）

## 发送照片功能

- 点击 input-bar @input-bar.ts 中的第一个照片按钮，则跳出一个照片选择界面，每行 3 个图片，

## 单独 tts

@cosyvoice.md不再使用现有的 tts.ts, ttsProvider 等，其逻辑已经太过复杂， 需要彻底抛弃。 @index.ts  保留现在类似的接口，仿照 @cosyvoice.md 的写法重写一个接口.秘钥在 @secrets.ts 中使用 

## sync

[TTS Provider] Synthesizing with:
ttsProvider.ts:101 [TTS Provider] Current TTS provider: cosyvoice
ttsProvider.ts:106 [TTS Provider] Synthesizing with CosyVoice: {text: "您好呀，有什么我可以帮您的吗？", voice: "longwan", format: "mp3", sampleRate: 16000}
cosyVoiceTts.ts:34 [CosyVoice] Starting synthesis for: 您好呀，有什么我可以帮您的吗？
cosyVoiceTts.ts:74 [CosyVoice] WebSocket connection request sent successfully
cosyVoiceTts.ts:89 [CosyVoice] WebSocket connection opened
cosyVoiceTts.ts:122 [CosyVoice] Request payload: {voice: "longwan", format: "mp3", sample_rate: 16000, task_id: "ac7dbcc2-c564-4702-9441-0142200d2f5a"}
cosyVoiceTts.ts:133 [CosyVoice] Sent run-task message
cosyVoiceTts.ts:374 [CosyVoice] Received WebSocket message: undefined
cosyVoiceTts.ts:375 [CosyVoice] Full message data: {header: {…}, payload: {…}}
Sun Apr 13 2025 20:53:26 GMT+0800 (中国标准时间) 录音文件格式说明
开发者工具上的录音文件与移动端格式不同，暂时只可在工具上进行播放调试，无法直接播放或者在客户端上播放
cosyVoiceTts.ts:374 [CosyVoice] Received WebSocket message: undefined
cosyVoiceTts.ts:375 [CosyVoice] Full message data: {header: {…}, payload: {…}}
WebSocket connection to 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/' failed: Close received after close(env: Windows,mp,1.06.2412050; lib: 2.32.3)