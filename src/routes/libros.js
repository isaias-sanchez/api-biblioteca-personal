const express = require('express');
const router = express.Router();
const { validate, idSchema, idParamsSchema, libroCreateSchema, libroUpdateSchema, libroEstadoSchema, searchSchema, paginationSchema } = require('../schemas');
const { listar, buscar, obtenerPorId, crear, actualizar, cambiarEstado, eliminar } = require('../services');

// GET /libros — listar con filtros y paginación
router.get('/', validate(paginationSchema, 'query'), (req, res) => {
  const { estado, genero, page = 1, limit = 20 } = req.query;
  const result = listar({ estado: estado || undefined, genero: genero || undefined, page, limit });
  res.json(result);
});

// GET /libros/buscar?q= — búsqueda
router.get('/buscar', validate(searchSchema, 'query'), (req, res) => {
  const { q } = req.query;
  const result = buscar(q);
  res.json(result);
});

// GET /libros/:id — obtener por ID
router.get('/:id', validate(idParamsSchema, 'params'), (req, res) => {
  const libro = obtenerPorId(req.params.id);
  if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });
  res.json(libro);
});

// POST /libros — crear
router.post('/', validate(libroCreateSchema), (req, res) => {
  const libro = crear(req.body);
  res.status(201).json(libro);
});

// PUT /libros/:id — actualizar completo
router.put('/:id', validate(idParamsSchema, 'params'), validate(libroUpdateSchema), (req, res) => {
  const libro = actualizar(req.params.id, req.body);
  if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });
  res.json(libro);
});

// PATCH /libros/:id/estado — cambiar estado
router.patch('/:id/estado', validate(idParamsSchema, 'params'), validate(libroEstadoSchema), (req, res) => {
  const libro = cambiarEstado(req.params.id, req.body.estado);
  if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });
  res.json(libro);
});

// DELETE /libros/:id — eliminar
router.delete('/:id', validate(idParamsSchema, 'params'), (req, res) => {
  const result = eliminar(req.params.id);
  if (!result) return res.status(404).json({ error: 'Libro no encontrado' });
  res.json(result);
});

module.exports = router;