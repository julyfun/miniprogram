## 前端设想

- 首页直接就是 deepseek 语音聊天助手。不要模拟 UI，以防老年人懒得看.
    - 聊天区有些文字按键，看起来用来替代语音输入的
        - 【怎么发微信红包？】
        - 【发聊天语音？】
        - 【其他微信功能...】
        - 【识别骗术训练】

## 开发文档

- 微信小程序官方： https://developers.weixin.qq.com/ebook?action=get_post_info&docid=0004eec99acc808b00861a5bd5280a

## Prompts

- 首页添加语音识别功能：（找找相关好用流行的 API）
    - 添加一个"说"按钮，长按开始录音，松开后识别文字并加入聊天框。

- 添加数据文件夹，其中数据文件为 json
    - json 有一些元数据包括对方的昵称和头像 URL
    - 按顺序存储事件，事件可能是对话等
        - 每个对话可以目前是文字形式，未来可能是文件 URL 或其他复杂形式
        - 每个对话可能是自己或者对方
        - 事件可能是"跳出一个额外的选择框"，包含"是否"。这个你先别写，但未来可能要写。
        - 事件可能是"在+号处显示一个高亮框，等待用户点击"，未来再写。
- 创建一个好用的综合组件，会载入一个事件 json 并打开一个微信聊天界面（界面类似现在的"防"），随后按顺序每秒显示一个事件

创建一个新的 event 数据（可能需要配套修改 event-demo 允许的事件）：教你发红包。
事件为：
- 在屏幕上方显示消息框：点击右下角的 + 号；
- 在右下角加号显示红色框，指引用户
- 等待用户按下 + 号
- 用户按下后，在屏幕上方显示消息框：点击红包界面
- 在"红包"按钮上显示红色框
- 完成教学

## UI 高亮系统

UI 高亮系统用于在教学过程中引导用户点击特定按钮或元素。最近的更新改进了高亮实现方式，从基于绝对定位的覆盖层改为基于元素类属性的直接高亮。

### 新的高亮实现方式

新的高亮系统通过以下方式工作：

1. **元素类属性高亮**：
   - 直接在目标元素上添加 `highlight-active` 类
   - 使用 CSS 动画和 box-shadow 效果创建高亮脉动效果
   - 无需使用绝对定位的覆盖层，提高了适配性和稳定性

2. **组件通信**：
   - `event-player` 组件设置 `highlightTarget` 和 `showHighlight` 状态
   - 这些状态作为属性传递给 `input-bar` 组件
   - `input-bar` 组件根据这些属性条件性地添加高亮类

3. **高亮效果**：
   - 目标元素周围会显示红色脉动效果
   - 高亮不会干扰用户交互，因为它直接作用于目标元素

### 优势

- **更好的响应式布局支持**：不再依赖绝对定位和固定坐标
- **更简单的实现**：不需要复杂的覆盖层和位置计算
- **更易于维护**：与 UI 结构直接关联，当 UI 变化时自动适应

### 使用方法

要高亮一个元素，只需在事件数据中设置 `highlightTarget` 为目标元素的标识符：

```javascript
{
    "id": "step1_highlight",
    "type": "ui_highlight",
    "role": "system",
    "content": "高亮加号按钮",
    "highlightTarget": "more-button",
    "transitions": [
        { "targetId": "waiting_for_plus_click" }
    ]
}
```

系统支持的高亮目标包括：
- `more-button`：聊天输入栏右侧的加号按钮
- `redpacket`：功能面板中的红包按钮

## 复现本项目

- 记得去 [must, tested] 这是 aliyun 旧版 API 相关:
    - 登录阿里云控制台。进入 RAM (访问控制) 服务。(https://ram.console.aliyun.com/overview?activeTab=overview)
    - 找到你的 Access Key (LTAI5tJsnMbCQ2QRHyyyrMiP) 所属的 RAM 用户或 RAM 角色。
    - 编辑该用户/角色的权限策略。
    - 添加与 NLS (智能语音服务) 相关的权限策略。最简单的是直接添加系统策略 AliyunNlsFullAccess（拥有完全权限，适合测试），或者创建一个自定义策略，至少包含 nls:CreateToken 这个权限，以及你可能用到的具体语音服务的权限（例如实时语音识别可能需要 nls-realtime 相关的权限）。
    - 保存策略。
- aliyun 新一套 api 只需要 api token. (如 paraformer cosyvoice)，且不需要配置 api 权限.
- 加入第三方 npm: https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html
    - 但是很可能第三方 js 不合法。例如 openai npm

## AI 功能

- 与 AI 服务器进行 https 通信

- 语音识别: paraformer 大模型
    - 输入音频流
    - 输出文字流
- 其实还用了阿里云语音识别 Restful API
- 对话功能：Deepseek 模型和 Qwen 模型
    - 输入文字片段
    - 输出文字流
- 文字转语音 TTS: CosyVoice 大模型或 aliyun Restful API
