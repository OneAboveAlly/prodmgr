const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
      // ⬇️ TO DODAJEMY SPECJALNIE
      onProxyReq(proxyReq, req, res) {
        proxyReq.setHeader('allowedHosts', 'all');
      },
    })
  );
};
