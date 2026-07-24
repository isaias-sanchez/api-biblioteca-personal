const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { registrarFactura, obtenerFacturas, obtenerFacturaPorId, guardarImagenFactura } = require('./service');
const { encontrarOCrearObra } = require('../obras/service');
const { registrarTransaccion } = require('../transacciones/service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/construccion/facturas?obraId=
router.get('/', (req, res) => {
  res.json(obtenerFacturas(req.query.obraId || null));
});

// GET /api/construccion/facturas/:id
router.get('/:id', (req, res) => {
  const f = obtenerFacturaPorId(req.params.id);
  if (!f) return res.status(404).json({ error: 'Factura no encontrada' });
  if (f.items) { try { f.items = JSON.parse(f.items); } catch (_) {} }
  res.json(f);
});

// POST /api/construccion/facturas/upload — upload invoice image with metadata
router.post('/upload', upload.single('factura'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo (campo: factura)' });

  const { obraId, obraNombre, proveedor, numeroFactura, fecha, total, iva, descripcion } = req.body;

  let finalObraId = obraId ? Number(obraId) : null;
  if (!finalObraId && obraNombre) finalObraId = encontrarOCrearObra(obraNombre).id;

  const totalNum = parseFloat(total) || 0;
  const ivaNum   = parseFloat(iva) || 0;

  try {
    const factura = registrarFactura({
      obraId: finalObraId, numeroFactura, proveedor,
      fecha: fecha || new Date().toISOString().split('T')[0],
      subtotal: totalNum - ivaNum, iva: ivaNum, total: totalNum,
      descripcionGeneral: descripcion,
    });

    const imgPath = guardarImagenFactura(req.file.buffer, factura.id);
    db.prepare('UPDATE facturas SET archivo_path = ? WHERE id = ?').run(imgPath, factura.id);

    // Auto-register as expense
    if (finalObraId && totalNum > 0) {
      registrarTransaccion({
        obraId: finalObraId, tipo: 'gasto', monto: totalNum,
        descripcion: descripcion || `Factura ${numeroFactura || factura.id}`,
        proveedor, facturaId: factura.id, fuente: 'api_upload',
      });
    }

    res.status(201).json({ ...obtenerFacturaPorId(factura.id), archivo_guardado: imgPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/construccion/facturas/:id/imagen — serve invoice image
router.get('/:id/imagen', (req, res) => {
  const f = obtenerFacturaPorId(req.params.id);
  if (!f || !f.archivo_path) return res.status(404).json({ error: 'Imagen no disponible' });
  if (!fs.existsSync(f.archivo_path)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });
  res.sendFile(path.resolve(f.archivo_path));
});

module.exports = router;
