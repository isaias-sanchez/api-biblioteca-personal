const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { httpLogger } = require('./logger');
const librosRouter = require('./routes/libros');
const statsRouter = require('./routes/stats');

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

// Ruta raíz — info de la API (sin cambios de contenido)
app.get('/', (req, res) => {
  res.json({
    nombre: 'API Biblioteca Personal',
    version: '1.0.0',
    descripcion: 'API REST para gestionar tu colección personal de libros',
    endpoints: {
      libros: {
        'GET    /libros':              'Listar todos los libros (filtros: ?estado=&genero=&page=&limit=)',
        'GET    /libros/buscar?q=':    'Buscar por título o autor',
        'GET    /libros/:id':          'Obtener un libro por ID',
        'POST   /libros':              'Crear un libro',
        'PUT    /libros/:id':          'Actualizar un libro completo',
        'PATCH  /libros/:id/estado':   'Cambiar estado de lectura',
        'DELETE /libros/:id':          'Eliminar un libro',
      },
      stats: {
        'GET /stats': 'Estadísticas del catálogo',
      },
    },
    estados_validos: ['pendiente', 'leyendo', 'leido'],
  });
});

app.use('/libros', librosRouter);
app.use('/stats', statsRouter);

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
