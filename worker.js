// 通过 wrangler secret 或 cloudflare_cli 来注入以下两个密钥：
//   - API_KEY (对应百度的 AppKey / client_id)
//   - SECRET_KEY (对应百度的 SecretKey / client_secret)

// Baidu OAuth 接口地址
const TOKEN_URL = 'https://openapi.baidu.com/oauth/2.0/token';

// 前端页面 HTML，去掉了 AppKey/SecretKey 的输入，仅保留授权码相关逻辑
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Baidu OAuth 授权码获取</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 50px auto; }
    input, button { width: 100%; margin: 8px 0; padding: 8px; font-size: 1em; }
    #result { white-space: pre-wrap; background: #f0f0f0; padding: 10px; margin-top: 10px; }
  </style>
</head>
<body>
  <h2>百度授权码获取</h2>

  <!-- 点击后跳转到 /auth，由后台读取 API_KEY 并跳转到百度授权页 -->
  <button type="button" onclick="getAuthCode()">跳转获取授权码</button>

  <label>输入授权码：</label>
  <input type="text" id="authCode" placeholder="粘贴从百度获取的授权码">

  <button type="button" onclick="getRefreshToken()">获取 refresh_token</button>

  <div id="result"></div>

  <script>
    function getAuthCode() {
      // 只需跳转到本域 /auth 即可，后台会追加 client_id
      window.open('/auth', '_blank');
    }

    async function getRefreshToken() {
      const code = document.getElementById('authCode').value.trim();
      if (!code) {
        return alert('请先填写 授权码！');
      }
      try {
        const resp = await fetch(\`/get_token?code=\${encodeURIComponent(code)}\`);
        const data = await resp.json();
        if (data.refresh_token) {
          document.getElementById('result').textContent =
            '🎉 获取成功！\\n\\nRefresh Token:\\n' + data.refresh_token;
        } else {
          document.getElementById('result').textContent =
            '❌ 获取失败:\\n' + JSON.stringify(data, null, 2);
        }
      } catch (e) {
        document.getElementById('result').textContent =
          '发生错误:\\n' + e;
      }
    }
  </script>
</body>
</html>
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 根路径：返回 HTML 页面
    if (path === '/') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    // /auth：读取 env.API_KEY，重定向到百度授权页
    if (path === '/auth') {
      const authUrl = new URL('https://openapi.baidu.com/oauth/2.0/authorize');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', env.API_KEY);
      authUrl.searchParams.set('redirect_uri', 'oob');
      authUrl.searchParams.set('scope', 'basic,netdisk');
      return Response.redirect(authUrl.toString(), 302);
    }

    // /get_token：前端通过 code 请求，用于第一次交换 refresh_token
    if (path === '/get_token') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing code', { status: 400 });
      }

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.API_KEY,
        client_secret: env.SECRET_KEY,
        redirect_uri: 'oob'
      });

      try {
        const resp = await fetch(`${TOKEN_URL}?${params.toString()}`);
        const json = await resp.json();
        if (json.refresh_token) {
          return new Response(JSON.stringify({ refresh_token: json.refresh_token }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify(json), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (err) {
        return new Response('Internal Error', { status: 500 });
      }
    }

    // /get_access：后台接口，通过 refresh_token 换取最新 access_token，仅返回 access_token
    if (path === '/get_access') {
      const refreshToken = url.searchParams.get('refresh_token');
      if (!refreshToken) {
        return new Response('Missing refresh_token', { status: 400 });
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.API_KEY,
        client_secret: env.SECRET_KEY
      });

      try {
        const resp = await fetch(`${TOKEN_URL}?${params.toString()}`, {
          headers: { 'User-Agent': 'pan.baidu.com' }
        });
        const json = await resp.json();
        if (json.access_token) {
          // 只返回 access_token，不暴露其他字段
          return new Response(JSON.stringify({ access_token: json.access_token }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify(json), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (err) {
        return new Response('Internal Error', { status: 500 });
      }
    }

    // 其它路径
    return new Response('Not Found', { status: 404 });
  }
};
