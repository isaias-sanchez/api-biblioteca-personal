const pino = require('pino');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  // En entorno de test no usamos transporte para evitar hilos y que Jest quede colgado
  transport: (!isDev && process.env.NODE_ENV === 'test') ? undefined : (isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname'
    }
  } : undefined),
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      ip: req.ip,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
});

// Middleware para peticiones HTTP
function httpLogger(app) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        req: { method: req.method, url: req.originalUrl, ip: req.ip },
        res: { statusCode: res.statusCode },
        duration: `${duration}ms`,
      });
    });
    next();
  });
}

module.exports = logger;
module.exports.httpLogger = httpLogger;