const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /libros — listar todos (con filtros opcionales por query)
router.get('/', (req, res) => {
  const { estado, genero } = req.query;
  let query = 'SELECT * FROM libros WHERE 1=1';
  const params = [];

  if (estado) {
    query += ' AND estado = ?';
    params.push(estado);
  }
  if (genero) {
    query += ' AND genero LIKE ?';
    params.push(`%${genero}%`);
  }

  query += ' ORDER BY creado_en DESC';

  const libros = db.prepare(query).all(...params);
  res.json({ total: libros.length, libros });
});

// GET /libros/buscar?q= — buscar por título o autor (tolerante a acentos)
router.get('/buscar', (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'El parámetro q es requerido' });
  }
  const normalize = (str) =>
    str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const term = q.trim();
  const termNorm = normalize(term);

  const todos = db.prepare('SELECT * FROM libros ORDER BY titulo').all();
  const libros = todos.filter((l) => {
    const tituloNorm = normalize(l.titulo);
    const autorNorm = normalize(l.autor);
    return tituloNorm.includes(termNorm) || autorNorm.includes(termNorm);
  });
  res.json({ total: libros.length, libros });
});

// GET /libros/:id — obtener uno
router.get('/:id', (req, res) => {
  const libro = db.prepare('SELECT * FROM libros WHERE id = ?').get(req.params.id);
  if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });
  res.json(libro);
});

// POST /libros — crear
router.post('/', (req, res) => {
  const { titulo, autor, genero, anio, paginas, estado, calificacion, notas } = req.body;

  if (!titulo || !autor || !genero) {
    return res.status(400).json({ error: 'titulo, autor y genero son requeridos' });
  }

  const estadoFinal = estado || 'pendiente';
  const estadosValidos = ['pendiente', 'leyendo', 'leido'];
  if (!estadosValidos.includes(estadoFinal)) {
    return res.status(400).json({ error: `estado debe ser: ${estadosValidos.join(', ')}` });
  }

  const result = db.prepare(`
    INSERT INTO libros (titulo, autor, genero, anio, paginas, estado, calificacion, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(titulo, autor, genero, anio || null, paginas || null, estadoFinal, calificacion || null, notas || null);

  const libro = db.prepare('SELECT * FROM libros WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(libro);
});

// PUT /libros/:id — actualizar completo
router.put('/:id', (req, res) => {
  const libro = db.prepare('SELECT * FROM libros WHERE id = ?').get(req.params.id);
  if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });

  const { titulo, autor, genero, anio, paginas, estado, calificacion, notas } = req.body;

  if (!titulo || !autor || !genero) {
    return res.status(400).json({ error: 'titulo, autor y genero son requeridos' });
  }

  const estadosValidos = ['pendiente', 'leyendo', 'leido'];
  if (estado && !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `estado debe ser: ${estadosValidos.join(', ')}` });
  }

  db.prepare(`
    UPDATE libros SET
      titulo = ?, autor = ?, genero = ?, anio = ?, paginas = ?,
      estado = ?, calificacion = ?, notas = ?,
      actualizado_en = datetime('now')
    WHERE id = ?
  `).run(titulo, autor, genero, anio || null, paginas || null,
         estado || libro.estado, calificacion || null, notas || null, req.params.id);

  res.json(db.prepare('SELECT * FROM libros WHERE id = ?').get(req.params.id));
});

// PATCH /libros/:id/estado — cambiar solo el estado de lectura
router.patch('/:id/estado', (req, res) => {
  const libro = db.prepare('SELECT * FROM libros WHERE id = ?').get(req.params.id);
  if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });

  const { estado } = req.body;
  const estadosValidos = ['pendiente', 'leyendo', 'leido'];
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `estado debe ser: ${estadosValidos.join(', ')}` });
  }

  db.prepare(`UPDATE libros SET estado = ?, actualizado_en = datetime('now') WHERE id = ?`)
    .run(estado, req.params.id);

  res.json(db.prepare('SELECT * FROM libros WHERE id = ?').get(req.params.id));
});

// DELETE /libros/:id — eliminar
router.delete('/:id', (req, res) => {
  const libro = db.prepare('SELECT * FROM libros WHERE id = ?').get(req.params.id);
  if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });

  db.prepare('DELETE FROM libros WHERE id = ?').run(req.params.id);
  res.json({ mensaje: `Libro "${libro.titulo}" eliminado correctamente` });
});

module.exports = router;
