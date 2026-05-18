const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /stats — estadísticas del catálogo
router.get('/', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM libros').get().count;
  const porEstado = db.prepare(
    'SELECT estado, COUNT(*) as cantidad FROM libros GROUP BY estado'
  ).all();
  const porGenero = db.prepare(
    'SELECT genero, COUNT(*) as cantidad FROM libros GROUP BY genero ORDER BY cantidad DESC'
  ).all();
  const promCalificacion = db.prepare(
    'SELECT ROUND(AVG(calificacion), 1) as promedio FROM libros WHERE calificacion IS NOT NULL'
  ).get().promedio;
  const mejorCalificados = db.prepare(
    'SELECT titulo, autor, calificacion FROM libros WHERE calificacion IS NOT NULL ORDER BY calificacion DESC LIMIT 5'
  ).all();

  res.json({
    total_libros: total,
    por_estado: porEstado,
    por_genero: porGenero,
    calificacion_promedio: promCalificacion,
    mejores_calificados: mejorCalificados,
  });
});

module.exports = router;
