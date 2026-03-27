summary: "使用 ePhone AI 模型"
read_when:
  - 您想使用 ePhone AI 模型
  - 您想通过统一 API 接入多个 AI 厂商
---

# ePhone AI

ePhone AI 是全球首个全模态推理平台，通过一个统一的 API 在所有模态（聊天、推理、图像、音频和视频）上运行 AI。兼容 OpenAI / Anthropic 协议，提供智能故障转移、实时可用性监控和精细计费功能。

[立即注册](https://platform.ephone.ai/) | [访问官网](https://platform.ephone.ai/)

## 快速开始

### 方式一：引导安装（推荐）

运行 onboard 命令，选择「ePhone AI API key」：

```bash
openclaw-cn onboard
```

按提示输入 API Key，系统会自动配置并验证模型访问权限。

### 方式二：手动配置

1. 设置环境变量或在配置中添加 API Key：

```bash
export EPHONE_API_KEY="your-api-key"
```

2. 配置供应商：

```json5
{
  "models": {
    "providers": {
      "ephone": {
        "baseUrl": "https://api.ephone.ai/v1",
        "apiKey": "${EPHONE_API_KEY}",
        "api": "openai-completions",
        "models": [
          { "id": "gpt-4o", "name": "GPT-4o" },
          { "id": "gpt-4o-mini", "name": "GPT-4o Mini" },
          { "id": "claude-3-5-sonnet", "name": "Claude 3.5 Sonnet" },
          { "id": "deepseek-chat", "name": "DeepSeek Chat" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "ephone/gpt-4o" }
    }
  }
}
```

## 获取 API Key

1. 访问 [ePhone AI 平台](https://platform.ephone.ai/)
2. 注册账号并登录
3. 在控制台创建 API Key
4. 根据需要配置计费和配额

## 模型 ID

ePhone AI 支持多个厂商的模型，通过统一的 API 调用。常用模型包括：

| 模型 ID | 说明 |
|---------|------|
| `gpt-4o` | OpenAI GPT-4o |
| `gpt-4o-mini` | OpenAI GPT-4o Mini |
| `gpt-4-turbo` | OpenAI GPT-4 Turbo |
| `gpt-3.5-turbo` | OpenAI GPT-3.5 Turbo |
| `claude-3-5-sonnet` | Anthropic Claude 3.5 Sonnet |
| `claude-3-opus` | Anthropic Claude 3 Opus |
| `claude-3-haiku` | Anthropic Claude 3 Haiku |
| `deepseek-chat` | DeepSeek Chat |
| `deepseek-coder` | DeepSeek Coder |
| `gemini-pro` | Google Gemini Pro |
| `qwen-turbo` | 阿里通义千问 Turbo |
| `moonshot-v1-8k` | Moonshot Kimi 8K |

> 注意：完整的模型列表请参考 [ePhone AI 官网](https://platform.ephone.ai/) 或控制台。

## 核心优势

### 智能故障转移

多渠道自动切换与优先级重试，单个渠道异常时毫秒级切换，请求成功率大幅提升。

### 实时可用性监控

每个模型的延迟、吞吐、可用性 24 小时实时追踪，异常渠道自动下线，保障服务稳定。

### 精细计费与配额

按 Token / 次数 / 模型倍率灵活计费，支持用户、令牌、渠道多级配额管控，账单透明可查。

### 统一接入

兼容 OpenAI / Anthropic 协议，现有代码无需修改，修改 base_url 即可切换，集成时间 < 5 分钟。

#### 示例代码

使用 OpenAI SDK 接入 ePhone AI：

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.ephone.ai/v1",
    api_key="YOUR_API_KEY"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

## 切换模型

```bash
# 设置默认模型
openclaw-cn models set ephone/gpt-4o

# 在聊天中切换
/model ephone/gpt-4o
```

## 故障排除

### "Invalid API key" 错误

检查 API Key 是否正确，确保已在 ePhone AI 控制台创建并激活。

### "Model not found" 错误

确认模型 ID 是否正确，检查该模型是否在您的账户中可用。

### "Rate limit exceeded" 错误

检查您的配额使用情况，如需更高配额请在控制台升级套餐。

## 相关文档

- [自定义供应商配置](/guides/custom-ai-providers)
- [模型选择](/concepts/models)
- [ePhone AI 官网](https://platform.ephone.ai/)
