const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH ||
  (process.env.VERCEL ? '/tmp/biblioteca.db' : path.join(__dirname, '..', 'biblioteca.db'));

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS libros (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo      TEXT    NOT NULL,
    autor       TEXT    NOT NULL,
    genero      TEXT    NOT NULL,
    anio        INTEGER,
    paginas     INTEGER,
    estado      TEXT    NOT NULL DEFAULT 'pendiente'
                        CHECK(estado IN ('pendiente','leyendo','leido')),
    calificacion INTEGER CHECK(calificacion BETWEEN 1 AND 5),
    notas       TEXT,
    creado_en   TEXT    NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
