# API Biblioteca Personal

API REST construida con **Node.js + Express + SQLite** para gestionar una colección personal de libros.

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Base de datos | SQLite (better-sqlite3) |
| Deploy | Railway |

## Instalación local

```bash
git clone https://github.com/TU_USUARIO/api-biblioteca-personal.git
cd api-biblioteca-personal
npm install
cp .env.example .env
npm run dev
```

La API quedará disponible en `http://localhost:3000`.

## Endpoints

### Libros

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/libros` | Listar todos los libros |
| `GET` | `/libros?estado=leyendo` | Filtrar por estado |
| `GET` | `/libros?genero=ficcion` | Filtrar por género |
| `GET` | `/libros/buscar?q=garcia` | Buscar por título o autor |
| `GET` | `/libros/:id` | Obtener un libro por ID |
| `POST` | `/libros` | Crear un nuevo libro |
| `PUT` | `/libros/:id` | Actualizar un libro completo |
| `PATCH` | `/libros/:id/estado` | Cambiar estado de lectura |
| `DELETE` | `/libros/:id` | Eliminar un libro |

### Estadísticas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/stats` | Estadísticas del catálogo |

## Campos de un libro

```json
{
  "titulo": "Cien años de soledad",
  "autor": "Gabriel García Márquez",
  "genero": "Realismo mágico",
  "anio": 1967,
  "paginas": 471,
  "estado": "leido",
  "calificacion": 5,
  "notas": "Obra maestra de la literatura latinoamericana"
}
```

**Estados válidos:** `pendiente` | `leyendo` | `leido`  
**Calificación:** 1 a 5 (opcional)

## Ejemplos de uso

### Crear un libro
```bash
curl -X POST http://localhost:3000/libros \
  -H "Content-Type: application/json" \
  -d '{"titulo":"El Principito","autor":"Antoine de Saint-Exupéry","genero":"Fábula","anio":1943,"estado":"leido","calificacion":5}'
```

### Buscar libros
```bash
curl "http://localhost:3000/libros/buscar?q=garcia"
```

### Ver estadísticas
```bash
curl http://localhost:3000/stats
```

### Cambiar estado de lectura
```bash
curl -X PATCH http://localhost:3000/libros/1/estado \
  -H "Content-Type: application/json" \
  -d '{"estado":"leyendo"}'
```

## Deploy

Desplegado en Railway: [Ver API en producción](https://TU_URL.railway.app)

## Estructura del proyecto

```
api-biblioteca-personal/
├── src/
│   ├── app.js          # Configuración de Express
│   ├── database.js     # Conexión y schema SQLite
│   └── routes/
│       ├── libros.js   # CRUD libros
│       └── stats.js    # Estadísticas
├── index.js            # Punto de entrada
├── package.json
└── .env.example
```
