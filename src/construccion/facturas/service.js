const db = require('../database');
const fs = require('fs');
const path = require('path');

const FACTURAS_DIR = process.env.FACTURAS_DIR ||
  path.join(__dirname, '../../../../uploads/facturas');

if (!fs.existsSync(FACTURAS_DIR)) {
  fs.mkdirSync(FACTURAS_DIR, { recursive: true });
}

function registrarFactura({ obraId, numeroFactura, proveedor, fecha, items, subtotal, iva, total, archivoPath, descripcionGeneral }) {
  const result = db.prepare(`
    INSERT INTO facturas (obra_id, numero_factura, proveedor, fecha, items, subtotal, iva, total, archivo_path, descripcion_general)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    obraId || null,
    numeroFactura || null,
    proveedor || null,
    fecha || new Date().toISOString().split('T')[0],
    items ? JSON.stringify(items) : null,
    subtotal || 0, iva || 0, total || 0,
    archivoPath || null,
    descripcionGeneral || null
  );
  return db.prepare('SELECT * FROM facturas WHERE id = ?').get(result.lastInsertRowid);
}

function obtenerFacturas(obraId = null) {
  if (obraId) return db.prepare('SELECT * FROM facturas WHERE obra_id = ? ORDER BY fecha DESC').all(obraId);
  return db.prepare('SELECT * FROM facturas ORDER BY fecha DESC').all();
}

function obtenerFacturaPorId(id) {
  return db.prepare('SELECT * FROM facturas WHERE id = ?').get(id);
}

function guardarImagenFactura(imageBuffer, facturaId) {
  const dir = path.join(FACTURAS_DIR, `factura_${facturaId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `factura_${facturaId}_${Date.now()}.jpg`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, imageBuffer);
  return filepath;
}

module.exports = { registrarFactura, obtenerFacturas, obtenerFacturaPorId, guardarImagenFactura, FACTURAS_DIR };
