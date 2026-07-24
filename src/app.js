const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { httpLogger } = require('./logger');
const librosRouter = require('./routes/libros');
const statsRouter = require('./routes/stats');

// Construccion module
const whatsappWebhook   = require('./construccion/whatsapp/webhook');
const obrasRouter       = require('./construccion/obras/routes');
const transaccionesRouter = require('./construccion/transacciones/routes');
const facturasRouter    = require('./construccion/facturas/routes');

const app = express();

// Seguridad y performance
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Logging HTTP requests
httpLogger(app);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // required for Twilio webhook

// Ruta raíz — info de la API (sin cambios de contenido)
app.get('/', (req, res) => {
  res.json({
    nombre: 'API Biblioteca Personal + Asistente Contable Obras',
    version: '2.0.0',
    modulos: {
      biblioteca: {
        'GET    /libros':              'Listar todos los libros',
        'GET    /libros/buscar?q=':    'Buscar por título o autor',
        'GET    /libros/:id':          'Obtener un libro por ID',
        'POST   /libros':              'Crear un libro',
        'PUT    /libros/:id':          'Actualizar un libro completo',
        'PATCH  /libros/:id/estado':   'Cambiar estado de lectura',
        'DELETE /libros/:id':          'Eliminar un libro',
        'GET    /stats':               'Estadísticas del catálogo',
      },
      construccion_obras: {
        'GET  /api/construccion/obras':              'Listar obras con balance',
        'POST /api/construccion/obras':              'Crear nueva obra',
        'GET  /api/construccion/obras/:id':          'Detalle de obra',
        'PUT  /api/construccion/obras/:id':          'Actualizar obra',
        'GET  /api/construccion/obras/:id/transacciones': 'Transacciones de una obra',
        'GET  /api/construccion/obras/:id/facturas': 'Facturas de una obra',
        'GET  /api/construccion/obras/:id/reporte':  'Descargar reporte Excel',
      },
      construccion_transacciones: {
        'GET    /api/construccion/transacciones?obraId=': 'Listar transacciones',
        'POST   /api/construccion/transacciones':         'Registrar ingreso o gasto',
        'DELETE /api/construccion/transacciones/:id':     'Eliminar transacción',
        'GET    /api/construccion/transacciones/resumen-mes?obraId=': 'Resumen mensual',
      },
      construccion_facturas: {
        'GET  /api/construccion/facturas':          'Listar facturas',
        'GET  /api/construccion/facturas/:id':      'Detalle de factura',
        'POST /api/construccion/facturas/upload':   'Subir imagen de factura (multipart)',
        'GET  /api/construccion/facturas/:id/imagen': 'Ver imagen de factura',
      },
      whatsapp_webhook: {
        'POST /webhook/whatsapp/twilio': 'Webhook para Twilio WhatsApp',
        'GET  /webhook/whatsapp/':       'Verificación Meta WhatsApp API',
        'POST /webhook/whatsapp/meta':   'Webhook para Meta WhatsApp Business API',
      },
    },
  });
});

app.use('/libros', librosRouter);
app.use('/stats', statsRouter);

// Construccion — WhatsApp webhook
app.use('/webhook/whatsapp', whatsappWebhook);

// Construccion — REST API
app.use('/api/construccion/obras', obrasRouter);
app.use('/api/construccion/transacciones', transaccionesRouter);
app.use('/api/construccion/facturas', facturasRouter);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.path} no encontrada` });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
