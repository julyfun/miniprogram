const WebSocket = require('ws');
const fs = require('fs');
const uuid = require('uuid').v4;

// 若没有将API Key配置到环境变量，可将下行替换为：apiKey = 'your_api_key'。不建议在生产环境中直接将API Key硬编码到代码中，以减少API Key泄露风险。
const apiKey = process.env.DASHSCOPE_API_KEY;
// WebSocket服务器地址
const url = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';
// 输出文件路径
const outputFilePath = 'output.mp3';

// 清空输出文件
fs.writeFileSync(outputFilePath, '');

// 创建WebSocket客户端
const ws = new WebSocket(url, {
  headers: {
    Authorization: `bearer ${apiKey}`,
    'X-DashScope-DataInspection': 'enable'
  }
});

let taskStarted = false;
let taskId = uuid();

ws.on('open', () => {
  console.log('已连接到WebSocket服务器');

  // 发送run-task指令
  const runTaskMessage = JSON.stringify({
    header: {
      action: 'run-task',
      task_id: taskId,
      streaming: 'duplex'
    },
    payload: {
      task_group: 'audio',
      task: 'tts',
      function: 'SpeechSynthesizer',
      model: 'cosyvoice-v1',
      parameters: {
        text_type: 'PlainText',
        voice: 'longxiaochun', // 音色
        format: 'mp3', // 音频格式
        sample_rate: 22050, // 采样率
        volume: 50, // 音量
        rate: 1, // 语速
        pitch: 1 // 音调
      },
      input: {}
    }
  });
  ws.send(runTaskMessage);
  console.log('已发送run-task消息');
});

const fileStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
ws.on('message', (data, isBinary) => {
  if (isBinary) {
    // 写入二进制数据到文件
    fileStream.write(data);
  } else {
    const message = JSON.parse(data);

    switch (message.header.event) {
      case 'task-started':
        taskStarted = true;
        console.log('任务已开始');
        // 发送continue-task指令
        sendContinueTasks(ws);
        break;
      case 'task-finished':
        console.log('任务已完成');
        ws.close();
        fileStream.end(() => {
          console.log('文件流已关闭');
        });
        break;
      case 'task-failed':
        console.error('任务失败：', message.header.error_message);
        ws.close();
        fileStream.end(() => {
          console.log('文件流已关闭');
        });
        break;
      default:
        // 可以在这里处理result-generated
        break;
    }
  }
});

function sendContinueTasks(ws) {
  const texts = [
    '床前明月光，',
    '疑是地上霜。',
    '举头望明月，',
    '低头思故乡。'
  ];
  
  texts.forEach((text, index) => {
    setTimeout(() => {
      if (taskStarted) {
        const continueTaskMessage = JSON.stringify({
          header: {
            action: 'continue-task',
            task_id: taskId,
            streaming: 'duplex'
          },
          payload: {
            input: {
              text: text
            }
          }
        });
        ws.send(continueTaskMessage);
        console.log(`已发送continue-task，文本：${text}`);
      }
    }, index * 1000); // 每隔1秒发送一次
  });

  // 发送finish-task指令
  setTimeout(() => {
    if (taskStarted) {
      const finishTaskMessage = JSON.stringify({
        header: {
          action: 'finish-task',
          task_id: taskId,
          streaming: 'duplex'
        },
        payload: {
          input: {}
        }
      });
      ws.send(finishTaskMessage);
      console.log('已发送finish-task');
    }
  }, texts.length * 1000 + 1000); // 在所有continue-task指令发送完毕后1秒发送
}

ws.on('close', () => {
  console.log('已断开与WebSocket服务器的连接');
});