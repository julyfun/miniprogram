## base

提示：
- 样式描述文件后缀名为 .scss 页面逻辑通常写在 .ts 中，页面布局写在 .wxml 中.
- /miniprogram/components 中有微信聊天的组件
- 编写完后，我会使用微信小程序模拟器运行结果，不用 npm run。要用二进制文件时（音频图片等）不要创建新文件，复用现有文件.

---

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

## 步骤修改为 [ok]

1. 您好，我将指导您如何发送微信红包 (iwill.mp3)

2. 首先，请点击右下角的 + 号键 (plusbutton.mp3)

3. 太棒啦！现在请点击红包按钮 (redpacketbutton.mp3)

4. 接下来请点击金额数字 (number.mp3)

5. 然后用下面的数字键盘输入红包金额 (number2.mp3)

6. 输入金额以后，点击塞钱进红包 (into.mp3)

7. 最后确认支付就可以发送啦。这里的红包教学不会扣除您的金额，请放心发送 (confirm.mp3)

8. 恭喜您已经学会了如何发红包，您可以到微信聊天尝试一下啦~ (cong.mp3)

---

## [ok] 如果首页跳转到任何其他页面，立即停止首页正在播放的语音

## [ok]

redpacket_tutorial.js event-demo.ts
红包教学 redpacket_tutorial 需要进行如下优化
1. 根据说话文字多少调整 delay，现在大部分 delay 都偏少
2. 红包输入金额界面允许高亮，并等待用户修改金额后 2s 再执行下一事件
3. 添加转账确认界面（如 Image 图片所示）

## [ok] 添加转账确认界面如 Image 所示

## [ok]

@chat-container.wxml @event-player.wxml 目前 chat-content 所占空间不对，他应该和 input-bar 并列，而现在它在 input-bar 底层（Z 轴下面）。修复此问题

## [failed] .js 中音频时长处理

使 transitions 中的 delay 允许多种形式，要么是一个直接的数字，和现在一样。要么是可以指定音频结束后多少时间播放。这种情况下 delay 的格式不同(指定 delay type)。将 redpacket_tutorial 中的语音播放大部分改为说完后延迟 0.8s 执行下一个事件（需要在 .ts 中获取音频长度）

## [ok]

@redpacket-page.ts 
@event-player.ts 
@redpacket_tutorial.js 
阅读以上代码
1. 发红包的界面不显示顶栏（“微信助手”和返回键）
2. 在 redpacket_tutorial.js 与用户交互时，检测用户按下“塞钱进红包”和“支付”才触发下一个事件。因此你需要改写部分 conditions
3. 发红包支付确认界面的用户名不是“茹茹宝宝”而是对方的用户名.

## [ok]

去除 class="weui-navigation-bar navigation-bar--weui-navigation-bar" 右边的 slot="right" 元素（不需要那个 more）
@navigation-bar.scss
@navigation-bar.wxml

## [ok]

class="page--amount-section" 并没有在 components/navigation-bar 下方，两者有些重合了。请修复此问题
@redpacket-page.wxml

- 样式描述文件后缀名为 .scss 页面逻辑通常写在 .ts 中，页面布局写在 .wxml 中.
- /miniprogram/components 中有微信聊天的组件
- 编写完后，我会使用微信小程序模拟器运行结果，不用 npm run

## [ok]

@redpacket_tutorial.js @photo_tutorial.js @event-player.ts

type 不是 message 的事件不需要 content 和 role

## 

@config.ts 红包

## message 允许显示红包

## 发送照片功能 [ok]

- 点击 input-bar @input-bar.ts 中的第一个照片按钮，则跳出一个照片选择界面，每行 4 个图片，布局如 001.jpg 所示，可以勾选图片，点击右下角“发送”来发送到聊天框中. 图片现在都使用 miniprogram\assets\images\photo-alnum-example\farm.png 这个图片

## 发送照片教程 [ok]

- 模仿现有的红包教程 @redpacket_tutorial.js 中的教学数据格式，写一个 photo_tutorial ，通过 UI 、消息和语音提示教导用户使用发送图片功能。所有 audioUri 暂时留空. 文案模仿红包教程 

## [ok] 仿照 @scam_call.js 创建 scam_call2.js，播放音频 scam_call2.mp3（已有）。
提示：录音内容为：
"舅舅！是我啊！（带着哭腔）我...我出事了！昨晚和朋友在外面玩，不小心被警察抓了，说我嫖娼...现在派出所要交一万块罚款才能放人！他们说不交钱就要拘留、通知家属...舅舅，千万别告诉我妈，她非打死我不可！你先帮我转钱，我回去马上还你！求求你了，警察就在旁边盯着，说半小时内不处理就要上报单位..."
请修改选择题.


## [ok] 仿照 @scam_call.js 创建 scam_call3.js，播放音频 scam_call3.mp3（已有，无需创建）。
提示：录音内容为：
"您好，这里是北京市公安局经济犯罪侦查科。我们查到您名下的一张银行卡（尾号**）涉及一起重大洗钱案件，涉案金额高达268万元！目前最高检已发布通缉令，案件编号【2024】刑字第*号。为配合调查，请您立即登录‘最高检安全账户核查系统’（发送链接），如实申报名下所有资产。若两小时内未完成认证，我们将依法冻结您的全部账户并实施抓捕！请保持通话，不要向任何人透露案情，否则将按泄密罪处理！"
请修改选择题.

## FUNCTION_ROUTES [ok]

 @config.ts @index.ts @event-player.ts 当跳转标签为 scam_call 时，并不是需要跳转到固定路由，而是检测当前学习进度中首个没有完成的任务并进入其中。


## 进度界面新增“微信功能教学进度” [ok]

为“学习进度”栏目中的一部分，目前一共 2 个学习，包括发红包 @redpacket_tutorial.js 和发图片 @photo_tutorial.js 教学。这两个完成后自动更新进度 @event-player.ts 。模仿现有的诈骗防范课程进度，添加功能。

## 增加选择题界面的宽度和勾选圆 所占宽度。目前 勾选圆 有时会被挤压成椭圆

@event-player.scss @event-player.wxml @redpacket_tutorial.js

## 添加一键分享学习进度功能

@config.ts 添加 [goto:share] 功能标签，在 @index.ts 中解析。改功能为立刻生成诈骗和微信功能学习进度报告并可微信分享给好友。

## 进度界面从关闭到显示时，自动从数据库请求刷新

@index.ts 

## 数据迁移 [2] [ok]

assets/ 中的文件已经全部迁移到云存储中。请将原来直接使用 png 本地 URI 的方式替换为请求云存储资源 URI

file_id 形如：cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/assets/audio/ringtone.mp3

注：组件支持
小程序组件支持传入云文件 ID，支持列表如下：

组件	属性
image	src
video	src、poster
cover-image	src
接口	参数
getBackgroundAudioManager	src
createInnerAudioContext	src
previewImage	urls、current

@photo-selector.ts 先修改这个文件中的图片的 URI，其他我们以后再说

## 数据迁移 2 [ok]

assets/ 中的文件已经全部迁移到云存储中。请将原来直接使用 mp3 本地 URI 的方式替换为请求云存储资源 URI，获取文件后播放. 可能需要再 utils 下创建函数

```
// 可以根据文件 ID 下载文件，用户仅可下载其有访问权限的文件：
wx.cloud.downloadFile({
  fileID: '', // 文件 ID
  success: res => {
    // 返回临时文件路径
    console.log(res.tempFilePath)
  },
  fail: console.error
})
```

file_id 形如：cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/assets/audio/ringtone.mp3

@scam_call.js @event-player-ts @ongoing-call.ts @incoming-call.ts 先在这些文件里修改必要代码

## 微信聊天界面发送语音功能

- @index.ts @index.wxml 左下角目前有一个发送语音按钮。点击后，原本的文字输入框替换为“按住说话”。长按进入录音模式，界面如图所示。松开可以发送录音。拖到左边“取消”圆圈内则取消发送。拖到右边“转文字 发送”暂时不用实现，我们之后再实现.

## [optional] 单独 tts

@cosyvoice.md不再使用现有的 tts.ts, ttsProvider 等，其逻辑已经太过复杂，需要彻底抛弃。 @index.ts  保留现在类似的接口，仿照 @cosyvoice.md 的写法重写一个接口.秘钥在 @secrets.ts 中使用 
