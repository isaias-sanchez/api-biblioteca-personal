const express = require('express');
const router = express.Router();
const { registrarTransaccion, obtenerTransacciones, obtenerResumenPorMes, eliminarTransaccion } = require('./service');
const { encontrarOCrearObra } = require('../obras/service');

// GET /api/construccion/transacciones?obraId=&tipo=&desde=&hasta=
router.get('/', (req, res) => {
  const { obraId, tipo, desde, hasta } = req.query;
  if (!obraId) return res.status(400).json({ error: 'Se requiere obraId' });
  res.json(obtenerTransacciones(obraId, { tipo, desde, hasta }));
});

// POST /api/construccion/transacciones
router.post('/', (req, res) => {
  const { obraId, obraNombre, tipo, monto, descripcion, material, cantidad, unidad, proveedor, fecha } = req.body;

  let finalObraId = obraId;
  if (!finalObraId && obraNombre) {
    finalObraId = encontrarOCrearObra(obraNombre).id;
  }
  if (!finalObraId) return res.status(400).json({ error: 'Se requiere obraId o obraNombre' });
  if (!tipo || !['ingreso', 'gasto'].includes(tipo)) return res.status(400).json({ error: 'tipo debe ser "ingreso" o "gasto"' });
  if (!monto || Number(monto) <= 0) return res.status(400).json({ error: 'monto debe ser mayor a 0' });

  const trans = registrarTransaccion({ obraId: finalObraId, tipo, monto: Number(monto), descripcion, material, cantidad: cantidad ? Number(cantidad) : null, unidad, proveedor, fecha, fuente: 'api' });
  res.status(201).json(trans);
});

// DELETE /api/construccion/transacciones/:id
router.delete('/:id', (req, res) => {
  const result = eliminarTransaccion(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Transacción no encontrada' });
  res.json({ message: 'Transacción eliminada' });
});

// GET /api/construccion/transacciones/resumen-mes?obraId=
router.get('/resumen-mes', (req, res) => {
  const { obraId } = req.query;
  if (!obraId) return res.status(400).json({ error: 'Se requiere obraId' });
  res.json(obtenerResumenPorMes(obraId));
});

module.exports = router;
