const express = require('express');
const router = express.Router();
const db = require('../database');
const { obtenerObras, obtenerObraPorId, obtenerBalance, encontrarOCrearObra, actualizarObra } = require('./service');
const { obtenerTransacciones } = require('../transacciones/service');
const { obtenerFacturas } = require('../facturas/service');
const { generarReporteObra } = require('../reportes/excel');

// GET /api/construccion/obras
router.get('/', (req, res) => {
  const obras = obtenerObras().map(o => ({ ...o, balance: obtenerBalance(o.id) }));
  res.json(obras);
});

// GET /api/construccion/obras/:id
router.get('/:id', (req, res) => {
  const obra = obtenerObraPorId(req.params.id);
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' });
  res.json({ ...obra, balance: obtenerBalance(obra.id) });
});

// POST /api/construccion/obras
router.post('/', (req, res) => {
  const { nombre, descripcion, presupuesto } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El campo nombre es requerido' });
  const obra = encontrarOCrearObra(nombre);
  if (descripcion !== undefined || presupuesto !== undefined) {
    db.prepare('UPDATE obras SET descripcion = ?, presupuesto = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(descripcion || null, presupuesto || 0, obra.id);
  }
  res.status(201).json(obtenerObraPorId(obra.id));
});

// PUT /api/construccion/obras/:id
router.put('/:id', (req, res) => {
  const obra = obtenerObraPorId(req.params.id);
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' });
  const updated = actualizarObra(req.params.id, { ...obra, ...req.body });
  res.json(updated);
});

// GET /api/construccion/obras/:id/transacciones
router.get('/:id/transacciones', (req, res) => {
  const obra = obtenerObraPorId(req.params.id);
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' });
  const { tipo, desde, hasta } = req.query;
  const transacciones = obtenerTransacciones(req.params.id, { tipo, desde, hasta });
  res.json({ obra, balance: obtenerBalance(req.params.id), transacciones });
});

// GET /api/construccion/obras/:id/facturas
router.get('/:id/facturas', (req, res) => {
  const obra = obtenerObraPorId(req.params.id);
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' });
  res.json(obtenerFacturas(req.params.id));
});

// GET /api/construccion/obras/:id/reporte  — downloads Excel
router.get('/:id/reporte', async (req, res) => {
  try {
    const obra = obtenerObraPorId(req.params.id);
    if (!obra) return res.status(404).json({ error: 'Obra no encontrada' });

    const workbook = await generarReporteObra(req.params.id);
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `reporte_${obra.nombre_clave}_${fecha}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
