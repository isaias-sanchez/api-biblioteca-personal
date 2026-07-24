const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.CONSTRUCCION_DB_PATH ||
  (process.env.VERCEL ? '/tmp/construccion.db' : path.join(__dirname, '../../../construccion.db'));

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS obras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    nombre_clave TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    presupuesto REAL DEFAULT 0,
    activa INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    obra_id INTEGER,
    numero_factura TEXT,
    proveedor TEXT,
    fecha DATE,
    items TEXT,
    subtotal REAL DEFAULT 0,
    iva REAL DEFAULT 0,
    total REAL DEFAULT 0,
    archivo_path TEXT,
    descripcion_general TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (obra_id) REFERENCES obras(id)
  );

  CREATE TABLE IF NOT EXISTS transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    obra_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'gasto')),
    monto REAL NOT NULL,
    descripcion TEXT,
    material TEXT,
    cantidad REAL,
    unidad TEXT,
    proveedor TEXT,
    fecha DATE NOT NULL DEFAULT (date('now')),
    factura_id INTEGER,
    fuente TEXT DEFAULT 'whatsapp',
    remitente TEXT,
    mensaje_original TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (obra_id) REFERENCES obras(id),
    FOREIGN KEY (factura_id) REFERENCES facturas(id)
  );

  CREATE TABLE IF NOT EXISTS mensajes_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remitente TEXT,
    tipo_mensaje TEXT,
    contenido TEXT,
    media_url TEXT,
    ai_resultado TEXT,
    procesado INTEGER DEFAULT 0,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
