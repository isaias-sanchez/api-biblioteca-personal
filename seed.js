const db = require('./src/database');

const libros = [
  { titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', genero: 'Realismo mágico', anio: 1967, paginas: 471, estado: 'leido', calificacion: 5, notas: 'Obra maestra de la literatura latinoamericana' },
  { titulo: 'El Señor de los Anillos', autor: 'J.R.R. Tolkien', genero: 'Fantasía', anio: 1954, paginas: 1200, estado: 'leido', calificacion: 5 },
  { titulo: 'Sapiens', autor: 'Yuval Noah Harari', genero: 'Historia', anio: 2011, paginas: 443, estado: 'leido', calificacion: 4 },
  { titulo: '1984', autor: 'George Orwell', genero: 'Distopía', anio: 1949, paginas: 328, estado: 'leyendo', calificacion: null },
  { titulo: 'El Alquimista', autor: 'Paulo Coelho', genero: 'Novela filosófica', anio: 1988, paginas: 208, estado: 'leyendo', calificacion: 4 },
  { titulo: 'Dune', autor: 'Frank Herbert', genero: 'Ciencia ficción', anio: 1965, paginas: 688, estado: 'pendiente', calificacion: null },
  { titulo: 'Harry Potter y la Piedra Filosofal', autor: 'J.K. Rowling', genero: 'Fantasía', anio: 1997, paginas: 309, estado: 'leido', calificacion: 5 },
  { titulo: 'El nombre del viento', autor: 'Patrick Rothfuss', genero: 'Fantasía épica', anio: 2007, paginas: 662, estado: 'leyendo', calificacion: 5 },
  { titulo: 'Orgullo y Prejuicio', autor: 'Jane Austen', genero: 'Romance clásico', anio: 1813, paginas: 432, estado: 'pendiente', calificacion: 4 },
];

const existing = db.prepare('SELECT COUNT(*) as n FROM libros').get().n;
if (existing === 0) {
  const insert = db.prepare(`
    INSERT INTO libros (titulo, autor, genero, anio, paginas, estado, calificacion, notas)
    VALUES (@titulo, @autor, @genero, @anio, @paginas, @estado, @calificacion, @notas)
  `);
  const insertMany = db.transaction((rows) => rows.forEach(r => insert.run({ notas: null, ...r })));
  insertMany(libros);
  console.log(`Seed: ${libros.length} libros insertados.`);
} else {
  console.log(`Seed: DB ya tiene ${existing} libros, se omite.`);
}
