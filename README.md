# Rousi.pro 自动签到脚本

一个为 [Rousi.pro](https://rousi.pro) 站点打造的青龙面板自动签到脚本，支持多账号、分享率查询、魔力值统计、PushPlus 通知推送。

## ✨ 功能特性

- 🎯 **自动签到** - 每日自动执行签到，获取魔力值奖励
- 👥 **多账号支持** - 支持多个账号同时管理，自动轮询
- 📊 **分享率查询** - 实时显示账号分享率状态
- 💰 **魔力值统计** - 显示当前魔力值、PT币、累计签到
- 🔔 **推送通知** - 支持 PushPlus 推送签到结果到微信
- 🔐 **双认证方式** - 支持 Authorization Token 和 Cookie 两种方式
- 🚀 **零依赖** - 仅使用 Node.js 原生模块，无需安装任何包
- 🛡️ **智能去重** - 自动检测今日是否已签到，避免重复

## 🚀 快速开始

### 前置条件

- **青龙面板** 2.12+（或其他支持 Node.js 脚本的面板）
- **Node.js** 14.0+
- Rousi.pro 已注册账号

### 步骤 1：获取认证信息

#### 方式一：Authorization Token（推荐）

1. 浏览器访问 [https://rousi.pro](https://rousi.pro) 并登录
2. 按 `F12` 打开开发者工具，切换到 **Network（网络）** 标签
3. 刷新页面（`F5`），点击任意一个请求
4. 在 **Request Headers** 中找到：
   ```
   authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9......
   ```
5. 复制 **`Bearer` 后面的所有字符**（不要复制 `Bearer ` 前缀）

#### 方式二：Cookie

1. 浏览器登录后，按 `F12`
2. 切换到 **Network（网络）** 标签
3. 刷新页面，点击任意请求
4. 复制 `Cookie:` 后面的所有内容

### 步骤 2：在青龙面板配置

1. 进入青龙面板 → **环境变量** → 新增

   | 变量名 | 值 | 必填 |
   |--------|-----|:----:|
   | `ROUSI_TOKEN` | 刚才复制的 Token | ✅ |
   | `PUSHPLUS_TOKEN` | PushPlus 令牌（选填） | ❌ |

   > 如果使用 Cookie 方式，变量名改为 `ROUSI_COOKIE`

2. 多账号配置：

   **方式 A：单变量用 `&` 分隔**
   ```
   ROUSI_TOKEN = Token1&Token2&Token3
   ```

   **方式 B：编号变量**
   ```
   ROUSI_TOKEN_1 = Token1
   ROUSI_TOKEN_2 = Token2
   ROUSI_TOKEN_3 = Token3
   ```

### 步骤 3：上传脚本并创建任务

1. 将 `rousi_checkin.js` 上传到青龙脚本目录
2. 新建定时任务：
   - **命令**：`task rousi_checkin.js`
   - **定时规则**：`0 8 * * *`（每天早上 8 点执行）

## 📖 环境变量详解

### 必填变量

| 变量名 | 说明 |
|--------|------|
| `ROUSI_TOKEN` | Authorization Token（推荐方式） |
| `ROUSI_COOKIE` | 浏览器 Cookie（备用方式） |

> 只需配置其中一个，优先使用 `ROUSI_TOKEN`

### 推送通知变量

| 变量名 | 说明 | 默认 |
|--------|------|:----:|
| `PUSHPLUS_TOKEN` | PushPlus 通知令牌 | - |
| `PUSHPLUS_TYPE` | 通知类型 | `wechat` |

PushPlus 支持的通知类型：
- `wechat` - 微信公众号（默认）
- `pushplusvip` - 微信服务号（会员）
- `wxgo` - 企业微信应用
- `qywxgo` - 企业微信机器人
- `email` - 邮件
- `feishu` - 飞书
- `dingtalk` - 钉钉
- `bark` - Bark App

## 📬 通知推送配置

### PushPlus 账号设置

1. 访问 [PushPlus 官网](http://www.pushplus.plus)
2. 使用微信扫码登录
3. 获取您的 Token
4. 在青龙环境变量中添加：`PUSHPLUS_TOKEN = 你的Token`

### 通知内容

签到成功通知内容：
```
🏆 账号 1 签到成功

✅ 签到成功！
📊 分享率: 1.234
💰 魔力值: 12345.67
💰 PT币: 666.66
🎁 本次获得: +5 魔力值
📊 连续签到: 3 天
📤 累计上传: 50.25 GB
📥 累计下载: 40.01 GB
⏰ 签到时间: 2026/6/20 08:00:00
```

## 🔧 API 接口说明

脚本调用的 Rousi.pro API 接口：

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/points/init` | 获取积分余额、签到配置 |
| `POST` | `/api/points/attendance` | 执行签到 |
| `GET` | `/api/account/stats` | 获取账户统计（分享率） |
| `GET` | `/api/points/attendance/stats` | 获取签到统计 |

## 📂 项目结构

```
rousi-checkin/
├── rousi_checkin.js     # 主脚本（青龙使用）
├── README.md             # 项目说明文档
├── .gitignore           # Git 忽略文件
├── LICENSE              # MIT 开源协议
└── package.json         # 项目元数据（可选）
```

## 🔧 本地测试

如果想在本地验证脚本功能：

```bash
# 1. 设置环境变量（Windows PowerShell）
$env:ROUSI_TOKEN = "你的Token值"

# 2. 运行脚本
node rousi_checkin.js

# 或在 Linux/macOS
export ROUSI_TOKEN="你的Token值"
node rousi_checkin.js
```

### 预期输出

```
============ Rousi.pro 签到 ============
共找到 1 个账号
认证方式: Authorization Token
PushPlus 通知: 已配置

--- 账号 1 (Token) ---
📊 分享率: 1.234
💰 魔力值: 12345.67
💰 PT币: 666.66
📅 今日日期: 2026-06-20
📊 连续签到: 3 天
📊 累计签到: 15 天
⏳ 正在签到...
✅ 签到成功！
🎁 获得奖励: +5 魔力值
📊 当前连续: 4 天
✅ PushPlus 通知发送成功

============ 签到完成 ============
```

## 🛠️ 常见问题

### ❓ 提示「认证信息无效或已过期」

Token 或 Cookie 已过期，请重新登录并复制新的认证信息。

### ❓ 脚本可以正常运行但 PushPlus 收不到通知

1. 检查 `PUSHPLUS_TOKEN` 是否正确配置
2. 确认 PushPlus 账号已在微信公众号激活
3. 查看 PushPlus 后台日志是否有失败记录

### ❓ 多账号如何配置

青龙面板环境变量中，使用编号变量方式最稳定：
```
ROUSI_TOKEN_1 = 账号1的Token
ROUSI_TOKEN_2 = 账号2的Token
```

### ❓ Token 有效期多久

通常为 7-30 天，建议定期检查是否需要更新。

### ❓ 是否支持其他通知方式

当前版本仅支持 PushPlus。如需其他通知方式，可提交 Issue 或自行修改 `pushplusRequest` 函数。

## ⚠️ 免责声明

1. 本脚本仅供学习研究使用，请在下载后 **24 小时内删除**
2. 使用本脚本导致的任何账号封禁、扣分等后果由使用者自行承担
3. 请勿将本脚本用于商业用途
4. 请尊重网站规则，合理使用，不要恶意频繁调用

## 📝 更新日志

### v1.0.0 (2026-06-20)
- 🎉 首个发布版本
- ✅ 支持 Authorization Token 和 Cookie 认证
- ✅ 多账号管理
- ✅ 分享率和魔力值查询
- ✅ PushPlus 通知推送
- ✅ 青龙面板兼容

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

**如果这个脚本对你有帮助，欢迎点个 ⭐ Star 支持一下！**
