const db = require('./database');
const logger = require('./logger');

const normalize = (str) =>
  String(str).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// ---- Libros ----

function listar(filtros = {}) {
  const { estado, genero, page = 1, limit = 20 } = filtros;
  let query = 'SELECT * FROM libros WHERE 1=1';
  const params = [];

  if (estado) { query += ' AND estado = ?'; params.push(estado); }
  query += ' ORDER BY creado_en DESC';

  let libros = db.prepare(query).all(...params);

  // SQLite LIKE no normaliza acentos → filtro de género en JS
  if (genero) {
    const generoNorm = normalize(genero);
    libros = libros.filter(l => normalize(l.genero).includes(generoNorm));
  }

  const total = libros.length;
  const offset = (Number(page) - 1) * Number(limit);
  const paginados = libros.slice(offset, offset + Number(limit));

  return {
    libros: paginados,
    paginacion: {
      total,
      page: Number(page),
      limit: Number(limit),
      total_paginas: Math.ceil(total / Number(limit)),
    },
  };
}

function buscar(term) {
  if (!term || term.trim() === '') return { libros: [], total: 0 };

  const termNorm = normalize(term);
  const todos = db.prepare('SELECT * FROM libros ORDER BY titulo').all();
  const libros = todos.filter((l) =>
    normalize(l.titulo).includes(termNorm) || normalize(l.autor).includes(termNorm)
  );

  return { libros, total: libros.length };
}

function obtenerPorId(id) {
  return db.prepare('SELECT * FROM libros WHERE id = ?').get(id);
}

function crear(datos) {
  const { titulo, autor, genero, anio, paginas, estado, calificacion, notas } = datos;
  const result = db.prepare(`
    INSERT INTO libros (titulo, autor, genero, anio, paginas, estado, calificacion, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(titulo, autor, genero, anio || null, paginas || null,
         estado || 'pendiente', calificacion || null, notas || null);

  const libro = db.prepare('SELECT * FROM libros WHERE id = ?').get(result.lastInsertRowid);
  logger.info(`Libro creado: "${libro.titulo}" (id=${libro.id})`);
  return libro;
}

function actualizar(id, datos) {
  const existente = db.prepare('SELECT * FROM libros WHERE id = ?').get(id);
  if (!existente) return null;

  const { titulo, autor, genero, anio, paginas, estado, calificacion, notas } = datos;

  db.prepare(`
    UPDATE libros SET
      titulo = ?, autor = ?, genero = ?, anio = ?, paginas = ?,
      estado = ?, calificacion = ?, notas = ?,
      actualizado_en = datetime('now')
    WHERE id = ?
  `).run(titulo, autor, genero, anio || null, paginas || null,
         estado || existente.estado, calificacion || null, notas || null, id);

  const actualizado = db.prepare('SELECT * FROM libros WHERE id = ?').get(id);
  logger.info(`Libro actualizado: "${actualizado.titulo}" (id=${id})`);
  return actualizado;
}

function cambiarEstado(id, estado) {
  const existente = db.prepare('SELECT * FROM libros WHERE id = ?').get(id);
  if (!existente) return null;

  db.prepare(`UPDATE libros SET estado = ?, actualizado_en = datetime('now') WHERE id = ?`)
    .run(estado, id);

  const actualizado = db.prepare('SELECT * FROM libros WHERE id = ?').get(id);
  logger.info(`Estado cambiado: "${actualizado.titulo}" → ${estado}`);
  return actualizado;
}

function eliminar(id) {
  const libro = db.prepare('SELECT * FROM libros WHERE id = ?').get(id);
  if (!libro) return null;

  db.prepare('DELETE FROM libros WHERE id = ?').run(id);
  logger.info(`Libro eliminado: "${libro.titulo}" (id=${id})`);
  return { mensaje: `Libro "${libro.titulo}" eliminado correctamente`, libro };
}

// ---- Estadísticas ----

function estadisticas() {
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

  return {
    total_libros: total,
    por_estado: porEstado,
    por_genero: porGenero,
    calificacion_promedio: promCalificacion,
    mejores_calificados: mejorCalificados,
  };
}

module.exports = {
  listar,
  buscar,
  obtenerPorId,
  crear,
  actualizar,
  cambiarEstado,
  eliminar,
  estadisticas,
};
