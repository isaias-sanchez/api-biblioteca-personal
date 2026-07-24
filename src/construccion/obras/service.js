const db = require('../database');

function normalizarNombre(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function encontrarOCrearObra(nombreObra) {
  const clave = normalizarNombre(nombreObra);
  let obra = db.prepare('SELECT * FROM obras WHERE nombre_clave = ?').get(clave);
  if (!obra) {
    const result = db.prepare('INSERT INTO obras (nombre, nombre_clave) VALUES (?, ?)').run(nombreObra, clave);
    obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(result.lastInsertRowid);
  }
  return obra;
}

function obtenerObras() {
  return db.prepare('SELECT * FROM obras ORDER BY activa DESC, nombre ASC').all();
}

function obtenerObraPorId(id) {
  return db.prepare('SELECT * FROM obras WHERE id = ?').get(id);
}

function obtenerBalance(obraId) {
  const result = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS total_ingresos,
      COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0)   AS total_gastos,
      COUNT(*) AS total_transacciones
    FROM transacciones WHERE obra_id = ?
  `).get(obraId);
  return { ...result, saldo: result.total_ingresos - result.total_gastos };
}

function actualizarObra(id, datos) {
  db.prepare(`
    UPDATE obras SET nombre = ?, descripcion = ?, presupuesto = ?, activa = ?,
    updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(datos.nombre, datos.descripcion || null, datos.presupuesto || 0, datos.activa ?? 1, id);
  return obtenerObraPorId(id);
}

module.exports = { normalizarNombre, encontrarOCrearObra, obtenerObras, obtenerObraPorId, obtenerBalance, actualizarObra };
