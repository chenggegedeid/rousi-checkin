// ======================================
// 青龙面板 Env 兼容
// ======================================
const https = require('https');
const http = require('http');

// 简单的 Env 模拟实现
class Env {
  constructor(name) {
    this.name = name;
  }

  getdata(key) {
    return process.env[key];
  }

  setdata(key, value) {
    process.env[key] = value;
  }

  get(key) {
    return process.env[key];
  }

  done() {
    return process.exit(0);
  }
}

// ======================================
// Rousi.pro 签到脚本
// 适配青龙面板 (Qinglong)
// ======================================
//
// 环境变量配置：
//   ROUSI_TOKEN   - Authorization Token（推荐）
//   ROUSI_COOKIE  - Cookie（旧方式）
//   PUSHPLUS_TOKEN - PushPlus 通知令牌（可选）
//
// Token 获取方法：
//   1. 在浏览器登录 https://rousi.pro/
//   2. 按 F12 打开开发者工具 -> 网络(Network)
//   3. 刷新页面或点击任意请求
//   4. 在请求头(Request Headers)中找到 Authorization:
//   5. 复制 Bearer 后面的值（不带 "Bearer " 前缀）
//
// 多账号支持：
//   方式一: 在同一个 ROUSI_TOKEN 变量中用 & 分隔多个 Token
//   方式二: 创建多个环境变量，名称分别为 ROUSI_TOKEN_1, ROUSI_TOKEN_2 ...
// ======================================

const $ = new Env('Rousi 签到');
const BASE_URL = 'https://rousi.pro';

// ======================================
// 环境变量获取
// ======================================

// 获取所有认证信息（支持 Token 和 Cookie）
function getAuths() {
  const auths = [];

  // 优先获取 Token（Authorization）
  const mainToken = process.env.ROUSI_TOKEN || process.env.rousi_token;
  if (mainToken) {
    if (mainToken.includes('&')) {
      auths.push(...mainToken.split('&').map(c => ({ type: 'token', value: c.trim() })).filter(a => a.value));
    } else {
      auths.push({ type: 'token', value: mainToken.trim() });
    }
  }

  // 查找编号 Token 变量
  for (let i = 1; i <= 20; i++) {
    const token = process.env[`ROUSI_TOKEN_${i}`] || process.env[`rousi_token_${i}`];
    if (token && token.trim()) {
      auths.push({ type: 'token', value: token.trim() });
    }
  }

  // 获取 Cookie（旧方式，兼容）
  const mainCookie = process.env.ROUSI_COOKIE || process.env.rousi_cookie;
  if (mainCookie) {
    if (mainCookie.includes('&')) {
      auths.push(...mainCookie.split('&').map(c => ({ type: 'cookie', value: c.trim() })).filter(a => a.value));
    } else {
      auths.push({ type: 'cookie', value: mainCookie.trim() });
    }
  }

  // 查找编号 Cookie 变量
  for (let i = 1; i <= 20; i++) {
    const ck = process.env[`ROUSI_COOKIE_${i}`] || process.env[`rousi_cookie_${i}`];
    if (ck && ck.trim()) {
      auths.push({ type: 'cookie', value: ck.trim() });
    }
  }

  return auths;
}

// PushPlus Token 获取
function getPushPlusToken() {
  return process.env.PUSHPLUS_TOKEN || process.env.pushplus_token || '';
}

// ======================================
// HTTP 请求 - 使用原生模块
// ======================================
function httpRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(BASE_URL + path);
    const httpModule = urlObj.protocol === 'https:' ? https : http;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Content-Type': 'application/json',
      'Origin': BASE_URL,
      'Referer': BASE_URL + '/',
      ...options.headers
    };

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers
    };

    const req = httpModule.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    if (options.body) {
      const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(body);
    }

    req.end();
  });
}

// ======================================
// API 接口调用
// ======================================

// 根据认证类型构建请求头
function buildAuthHeader(auth) {
  if (auth.type === 'token') {
    return { 'Authorization': `Bearer ${auth.value}` };
  } else {
    return { 'Cookie': auth.value };
  }
}

// 执行签到
async function doCheckin(auth, mode = 'normal') {
  const authHeader = buildAuthHeader(auth);
  const result = await httpRequest('/api/points/attendance', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ mode })
  });

  if (result && result.code === 0) {
    return {
      success: true,
      message: result.message || '签到成功',
      bonus: result.data?.bonus,
      streakBonus: result.data?.streak_bonus,
      currentStreak: result.data?.current_streak,
      raw: result.data
    };
  }

  return {
    success: false,
    message: result?.message || '签到失败',
    code: result?.code,
    raw: result?.data
  };
}

// 获取积分初始化信息
async function getPointsInit(auth) {
  try {
    const authHeader = buildAuthHeader(auth);
    const data = await httpRequest('/api/points/init', {
      headers: authHeader
    });

    if (data && data.code === 0) {
      return {
        balance: data.data?.balance,
        attendance: data.data?.attendance,
        config: data.data?.config
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 获取账户统计信息（包含分享率）
async function getAccountStats(auth) {
  try {
    const authHeader = buildAuthHeader(auth);
    const data = await httpRequest('/api/account/stats', {
      headers: authHeader
    });

    if (data) {
      return {
        ratio: data.ratio,
        upload: data.upload,
        download: data.download,
        bonus: data.bonus,
        uploaded: data.uploaded,
        downloaded: data.downloaded,
        seeding: data.seeding,
        leeching: data.leeching,
        invites: data.invites,
        ...data
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 获取签到统计
async function getAttendanceStats(auth) {
  try {
    const authHeader = buildAuthHeader(auth);
    const data = await httpRequest('/api/points/attendance/stats', {
      headers: authHeader
    });

    if (data && data.code === 0) {
      return data.data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ======================================
// PushPlus 通知
// ======================================
function pushplusRequest(title, content) {
  return new Promise((resolve) => {
    const token = getPushPlusToken();
    if (!token) {
      resolve(false);
      return;
    }

    const pushType = process.env.PUSHPLUS_TYPE || 'wechat';
    const url = 'http://www.pushplus.plus/send';

    const postData = {
      token: token,
      title: title,
      content: content,
      timestamp: Date.now()
    };

    if (['pushplusvip', 'wxgo', 'qywxgo', 'email', 'feishu', 'dingtalk', 'bark'].includes(pushType)) {
      postData.type = pushType;
    } else {
      postData.type = 'send';
    }

    const urlObj = new URL(url);
    const httpModule = urlObj.protocol === 'https:' ? https : http;

    const body = JSON.stringify(postData);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = httpModule.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0 || result.code === 200) {
            console.log('✅ PushPlus 通知发送成功');
            resolve(true);
          } else {
            console.log(`❌ PushPlus 通知发送失败: ${result.msg || result.message || '未知错误'}`);
            resolve(false);
          }
        } catch (e) {
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ PushPlus 通知发送异常: ${e.message}`);
      resolve(false);
    });

    req.write(body);
    req.end();
  });
}

// 格式化分享率显示
function formatRatio(ratio) {
  if (ratio === undefined || ratio === null) return 'N/A';
  return ratio.toFixed(3);
}

// 格式化流量大小
function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

// ======================================
// 主流程
// ======================================
async function main() {
  const auths = getAuths();
  const pushToken = getPushPlusToken();

  if (auths.length === 0) {
    console.log('❌ 未找到认证信息，请配置环境变量：');
    console.log('');
    console.log('方式一（推荐）- Authorization Token：');
    console.log('  名称: ROUSI_TOKEN');
    console.log('  值: 从浏览器复制的 Authorization Token');
    console.log('');
    console.log('方式二 - Cookie（旧方式）：');
    console.log('  名称: ROUSI_COOKIE');
    console.log('  值: 从浏览器复制的 Cookie');
    $.done();
    return;
  }

  console.log('============ Rousi.pro 签到 ============');
  console.log(`共找到 ${auths.length} 个账号`);
  console.log(`认证方式: ${auths[0].type === 'token' ? 'Authorization Token' : 'Cookie'}`);
  console.log(`PushPlus 通知: ${pushToken ? '已配置' : '未配置'}\n`);

  const notifyTitle = '🏆 Rousi 签到通知';

  for (let i = 0; i < auths.length; i++) {
    const auth = auths[i];
    const authType = auth.type === 'token' ? 'Token' : 'Cookie';
    console.log(`--- 账号 ${i + 1} (${authType}) ---`);

    try {
      // 获取账户信息
      const accountInfo = await getPointsInit(auth);
      if (!accountInfo || !accountInfo.balance) {
        console.log('❌ 认证信息无效或已过期，请重新获取');
        console.log('');
        continue;
      }

      const karmaName = accountInfo.config?.karma_name || '魔力值';
      const creditsName = accountInfo.config?.credits_name || 'PT币';

      // 获取账户统计（包含分享率）
      const stats = await getAccountStats(auth);
      const ratio = stats?.ratio;
      const currentBonus = stats?.bonus || accountInfo.balance.karma || 0;

      console.log(`📊 分享率: ${formatRatio(ratio)}`);
      console.log(`💰 ${karmaName}: ${typeof currentBonus === 'number' ? currentBonus.toFixed(2) : currentBonus}`);
      console.log(`💰 ${creditsName}: ${accountInfo.balance.credits?.toFixed?.(2) ?? accountInfo.balance.credits ?? 0}`);

      // 检查今日签到状态
      let hasAttended = false;
      let today = new Date().toISOString().split('T')[0];

      if (accountInfo.attendance) {
        today = accountInfo.attendance.server_today || today;
        hasAttended = accountInfo.attendance.attended_dates?.includes?.(today) ?? false;
        const currentStreak = accountInfo.attendance.current_streak || 0;
        const totalDays = accountInfo.attendance.attended_dates?.length || 0;

        console.log(`📅 今日日期: ${today}`);
        console.log(`📊 连续签到: ${currentStreak} 天`);
        console.log(`📊 累计签到: ${totalDays} 天`);
      }

      if (hasAttended) {
        console.log('✅ 今日已签到，跳过');

        if (pushToken) {
          const notifyContent = `
🎉 <b>账号 ${i + 1}</b>

✅ 今日已签到
📊 分享率: <b>${formatRatio(ratio)}</b>
💰 ${karmaName}: <b>${typeof currentBonus === 'number' ? currentBonus.toFixed(2) : currentBonus}</b>
💰 ${creditsName}: <b>${accountInfo.balance.credits?.toFixed?.(2) ?? accountInfo.balance.credits ?? 0}</b>
${stats ? `📤 累计上传: ${formatSize(stats.uploaded)}` : ''}
${stats ? `📥 累计下载: ${formatSize(stats.downloaded)}` : ''}
          `.trim();

          await pushplusRequest(notifyTitle + ' - 已签到', notifyContent);
        }

        console.log('');
        continue;
      }

      // 执行签到
      console.log('⏳ 正在签到...');
      const result = await doCheckin(auth, 'normal');

      if (result.success) {
        console.log(`✅ ${result.message}`);

        if (result.bonus !== undefined && result.bonus !== null) {
          console.log(`🎁 获得奖励: +${result.bonus} ${karmaName}`);
        }

        if (result.streakBonus !== undefined && result.streakBonus > 0) {
          console.log(`🔥 连续签到奖励: +${result.streakBonus} ${karmaName}`);
        }

        if (result.currentStreak !== undefined) {
          console.log(`📊 当前连续: ${result.currentStreak} 天`);
        }

        if (pushToken) {
          const notifyContent = `
🏆 <b>账号 ${i + 1} 签到成功</b>

✅ ${result.message}
📊 分享率: <b>${formatRatio(ratio)}</b>
💰 ${karmaName}: <b>${typeof currentBonus === 'number' ? currentBonus.toFixed(2) : currentBonus}</b>
💰 ${creditsName}: <b>${accountInfo.balance.credits?.toFixed?.(2) ?? accountInfo.balance.credits ?? 0}</b>
${result.bonus !== undefined ? `🎁 本次获得: <b>+${result.bonus}</b> ${karmaName}` : ''}
${result.currentStreak !== undefined ? `📊 连续签到: <b>${result.currentStreak} 天</b>` : ''}
${stats ? `📤 累计上传: ${formatSize(stats.uploaded)}` : ''}
${stats ? `📥 累计下载: ${formatSize(stats.downloaded)}` : ''}
⏰ 签到时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          `.trim();

          await pushplusRequest(notifyTitle, notifyContent);
        }
      } else {
        console.log(`❌ 签到失败: ${result.message}`);

        if (result.code !== undefined) {
          console.log(`  错误码: ${result.code}`);
        }

        if (pushToken) {
          const notifyContent = `
❌ <b>账号 ${i + 1} 签到失败</b>

❌ ${result.message}
📊 分享率: ${formatRatio(ratio)}
💰 ${karmaName}: ${typeof currentBonus === 'number' ? currentBonus.toFixed(2) : currentBonus}
${result.code !== undefined ? `错误码: ${result.code}` : ''}
⏰ 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          `.trim();

          await pushplusRequest(notifyTitle + ' - 签到失败', notifyContent);
        }
      }

      console.log('');

    } catch (e) {
      console.log(`❌ 账号 ${i + 1} 执行异常: ${e.message}`);
      console.log('');

      if (pushToken) {
        const notifyContent = `
❌ <b>账号 ${i + 1} 签到异常</b>

❌ ${e.message}
⏰ 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
        `.trim();

        await pushplusRequest(notifyTitle + ' - 异常', notifyContent);
      }
    }

    if (i < auths.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('============ 签到完成 ============');
  $.done();
}

main().catch(err => {
  console.log('❌ 脚本执行异常: ' + err.message);
  $.done();
});
