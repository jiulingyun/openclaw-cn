---
summary: "Deepgram 语音转写（处理收到的语音消息）"
read_when:
  - 您想用 Deepgram 对音频附件进行语音转文字
  - 您需要 Deepgram 快速配置示例
---
# Deepgram（音频转写）

Deepgram 是一个语音转文字 API。在 Clawdbot 中，它通过 `tools.media.audio`
用于**接收的音频/语音消息转写**。

启用后，Clawdbot 将音频文件上传到 Deepgram 并将转写结果注入回复管道
（`{{Transcript}}` + `[Audio]` 块）。这**不是流式转写**，使用的是预录音转写端点。

官网：https://deepgram.com
文档：https://developers.deepgram.com

## 快速开始

1) 设置 API 密钥：
```
DEEPGRAM_API_KEY=dg_...
```

2) 启用供应商：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }]
      }
    }
  }
}
```

## 选项

- `model`：Deepgram 模型 ID（默认：`nova-3`）
- `language`：语言提示（可选）
- `tools.media.audio.providerOptions.deepgram.detect_language`：启用语言检测（可选）
- `tools.media.audio.providerOptions.deepgram.punctuate`：启用标点符号（可选）
- `tools.media.audio.providerOptions.deepgram.smart_format`：启用智能格式化（可选）

指定语言示例：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [
          { provider: "deepgram", model: "nova-3", language: "zh" }
        ]
      }
    }
  }
}
```

带 Deepgram 选项示例：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        providerOptions: {
          deepgram: {
            detect_language: true,
            punctuate: true,
            smart_format: true
          }
        },
        models: [{ provider: "deepgram", model: "nova-3" }]
      }
    }
  }
}
```

## 说明

- 认证遵循标准供应商认证顺序；`DEEPGRAM_API_KEY` 是最简单的方式。
- 使用代理时，可通过 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆盖端点或 headers。
- 输出遵循与其他供应商相同的音频规则（大小限制、超时、转写注入）。
