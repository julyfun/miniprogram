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