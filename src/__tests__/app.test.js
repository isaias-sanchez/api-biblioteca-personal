const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Usar una base de datos de prueba temporal
process.env.DB_PATH = '/tmp/biblioteca-test.db';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Limpiar archivo de prueba antes de comenzar
try { fs.unlinkSync('/tmp/biblioteca-test.db'); } catch (e) {}
try { fs.unlinkSync('/tmp/biblioteca-test.db-wal'); } catch (e) {}
try { fs.unlinkSync('/tmp/biblioteca-test.db-shm'); } catch (e) {}

const app = require('../app');
const db = require('../database');

// Seed inicial para tests
const seedLibros = [
  { titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', genero: 'Realismo mágico', anio: 1967, paginas: 471, estado: 'leido', calificacion: 5, notas: 'Obra maestra' },
  { titulo: '1984', autor: 'George Orwell', genero: 'Distopía', anio: 1949, paginas: 328, estado: 'leyendo', calificacion: null, notas: null },
  { titulo: 'Dune', autor: 'Frank Herbert', genero: 'Ciencia ficción', anio: 1965, paginas: 688, estado: 'pendiente', calificacion: null, notas: null },
];

beforeAll(() => {
  const insert = db.prepare(`INSERT INTO libros (titulo, autor, genero, anio, paginas, estado, calificacion, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  seedLibros.forEach(l => insert.run(l.titulo, l.autor, l.genero, l.anio, l.paginas, l.estado, l.calificacion, l.notas));
});

afterAll(() => {
  db.close();
  try { fs.unlinkSync('/tmp/biblioteca-test.db'); } catch (e) {}
  try { fs.unlinkSync('/tmp/biblioteca-test.db-wal'); } catch (e) {}
  try { fs.unlinkSync('/tmp/biblioteca-test.db-shm'); } catch (e) {}
});

describe('GET /libros', () => {
  test('devuelve todos los libros', async () => {
    const res = await request(app).get('/libros');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('libros');
    expect(res.body.libros.length).toBe(3);
    expect(res.body).toHaveProperty('paginacion');
    expect(res.body.paginacion.total).toBe(3);
  });

  test('filtra por estado=leido', async () => {
    const res = await request(app).get('/libros?estado=leido');
    expect(res.statusCode).toBe(200);
    expect(res.body.libros.length).toBe(1);
    expect(res.body.libros[0].estado).toBe('leido');
  });

  test('filtra por genero con LIKE', async () => {
    const res = await request(app).get('/libros?genero=distopia');
    expect(res.statusCode).toBe(200);
    expect(res.body.libros.length).toBe(1);
    expect(res.body.libros[0].genero).toBe('Distopía');
  });
});

describe('GET /libros/buscar', () => {
  test('busca por título', async () => {
    const res = await request(app).get('/libros/buscar?q=soledad');
    expect(res.statusCode).toBe(200);
    expect(res.body.libros.length).toBe(1);
    expect(res.body.libros[0].titulo).toContain('soledad');
  });

  test('busca por autor (tolerante a acentos)', async () => {
    const res = await request(app).get('/libros/buscar?q=garcia');
    expect(res.statusCode).toBe(200);
    expect(res.body.libros.length).toBe(1);
    expect(res.body.libros[0].autor).toContain('García');
  });

  test('busca sin resultados', async () => {
    const res = await request(app).get('/libros/buscar?q=xxxxzzzz');
    expect(res.statusCode).toBe(200);
    expect(res.body.libros.length).toBe(0);
  });

  test('requiere parámetro q', async () => {
    const res = await request(app).get('/libros/buscar');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /libros/:id', () => {
  test('obtiene libro por ID', async () => {
    const res = await request(app).get('/libros/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.titulo).toBe('Cien años de soledad');
  });

  test('devuelve 404 si no existe', async () => {
    const res = await request(app).get('/libros/999');
    expect(res.statusCode).toBe(404);
  });

  test('valida ID numérico', async () => {
    const res = await request(app).get('/libros/abc');
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /libros', () => {
  test('crea un libro válido', async () => {
    const res = await request(app)
      .post('/libros')
      .send({ titulo: 'El principito', autor: 'Saint-Exupéry', genero: 'Fábula', anio: 1943, paginas: 96, estado: 'leido', calificacion: 5 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('rechaza libro sin titulo', async () => {
    const res = await request(app)
      .post('/libros')
      .send({ autor: 'Test', genero: 'Test', estado: 'pendiente' });
    expect(res.statusCode).toBe(400);
  });

  test('rechaza estado inválido', async () => {
    const res = await request(app)
      .post('/libros')
      .send({ titulo: 'Test', autor: 'Test', genero: 'Test', estado: 'invalido' });
    expect(res.statusCode).toBe(400);
  });

  test('rechaza calificación fuera de rango', async () => {
    const res = await request(app)
      .post('/libros')
      .send({ titulo: 'Test', autor: 'Test', genero: 'Test', estado: 'leido', calificacion: 10 });
    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /libros/:id', () => {
  test('actualiza libro existente', async () => {
    const res = await request(app)
      .put('/libros/1')
      .send({ titulo: 'Cien años de soledad (ed. conmemorativa)', autor: 'Gabriel García Márquez', genero: 'Realismo mágico', anio: 1967, paginas: 500, estado: 'leido', calificacion: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.body.titulo).toContain('conmemorativa');
    expect(res.body.paginas).toBe(500);
  });

  test('devuelve 404 si no existe', async () => {
    const res = await request(app)
      .put('/libros/999')
      .send({ titulo: 'Test', autor: 'Test', genero: 'Test', estado: 'pendiente' });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /libros/:id/estado', () => {
  test('cambia estado de leido a leyendo', async () => {
    const res = await request(app)
      .patch('/libros/1/estado')
      .send({ estado: 'leyendo' });
    expect(res.statusCode).toBe(200);
    expect(res.body.estado).toBe('leyendo');
  });

  test('rechaza estado inválido', async () => {
    const res = await request(app)
      .patch('/libros/1/estado')
      .send({ estado: 'invalido' });
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /libros/:id', () => {
  test('elimina libro existente', async () => {
    const res = await request(app).delete('/libros/2'); // 1984
    expect(res.statusCode).toBe(200);
    expect(res.body.mensaje).toContain('1984');

    // Verificar que se eliminó
    const getRes = await request(app).get('/libros/2');
    expect(getRes.statusCode).toBe(404);
  });

  test('devuelve 404 si no existe', async () => {
    const res = await request(app).delete('/libros/999');
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /stats', () => {
  test('devuelve estadísticas del catálogo', async () => {
    const res = await request(app).get('/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total_libros');
    expect(res.body).toHaveProperty('por_estado');
    expect(res.body).toHaveProperty('por_genero');
    expect(res.body).toHaveProperty('mejores_calificados');
    expect(res.body.total_libros).toBeGreaterThan(0);
  });
});

describe('Manejo de errores', () => {
  test('404 para rutas desconocidas', async () => {
    const res = await request(app).get('/ruta-inexistente');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});