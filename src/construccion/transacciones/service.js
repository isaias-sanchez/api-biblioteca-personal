const db = require('../database');

function registrarTransaccion({ obraId, tipo, monto, descripcion, material, cantidad, unidad, proveedor, fecha, facturaId, fuente, remitente, mensajeOriginal }) {
  const result = db.prepare(`
    INSERT INTO transacciones
      (obra_id, tipo, monto, descripcion, material, cantidad, unidad, proveedor, fecha, factura_id, fuente, remitente, mensaje_original)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    obraId, tipo, monto,
    descripcion || null, material || null,
    cantidad || null, unidad || null, proveedor || null,
    fecha || new Date().toISOString().split('T')[0],
    facturaId || null,
    fuente || 'whatsapp', remitente || null, mensajeOriginal || null
  );
  return db.prepare('SELECT * FROM transacciones WHERE id = ?').get(result.lastInsertRowid);
}

function obtenerTransacciones(obraId, filtros = {}) {
  let query = 'SELECT * FROM transacciones WHERE obra_id = ?';
  const params = [obraId];
  if (filtros.tipo) { query += ' AND tipo = ?'; params.push(filtros.tipo); }
  if (filtros.desde) { query += ' AND fecha >= ?'; params.push(filtros.desde); }
  if (filtros.hasta) { query += ' AND fecha <= ?'; params.push(filtros.hasta); }
  query += ' ORDER BY fecha DESC, created_at DESC';
  return db.prepare(query).all(...params);
}

function obtenerResumenPorMes(obraId) {
  return db.prepare(`
    SELECT
      strftime('%Y-%m', fecha) AS mes,
      SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS ingresos,
      SUM(CASE WHEN tipo = 'gasto'   THEN monto ELSE 0 END) AS gastos,
      COUNT(*) AS transacciones
    FROM transacciones WHERE obra_id = ?
    GROUP BY strftime('%Y-%m', fecha)
    ORDER BY mes DESC
  `).all(obraId);
}

function eliminarTransaccion(id) {
  return db.prepare('DELETE FROM transacciones WHERE id = ?').run(id);
}

module.exports = { registrarTransaccion, obtenerTransacciones, obtenerResumenPorMes, eliminarTransaccion };
