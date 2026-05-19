# 📚 API Biblioteca Personal — Catálogo Inteligente y Seguimiento de Lectura

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Express.js Framework](https://img.shields.io/badge/Express.js-v5.0-lightgrey?style=for-the-badge&logo=express)](https://expressjs.com/)
[![SQLite Database](https://img.shields.io/badge/SQLite-Database-blue?style=for-the-badge&logo=sqlite)](https://sqlite.org/)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![Swagger Documentation](https://img.shields.io/badge/OpenAPI-Swagger_UI-85EA2D?style=for-the-badge&logo=swagger)](https://swagger.io/)

Una **API RESTful de Grado Profesional** y de arquitectura en capas, diseñada e implementada para la gestión eficiente y el seguimiento de lectura de colecciones de libros personales. Cuenta con un frontend premium de diseño "Estantería de Biblioteca" interactivo y responsivo desarrollado 100% en JavaScript Vanilla y CSS a la medida.

🌐 **Demostración en Vivo:** [api-biblioteca-personal-six.vercel.app](https://api-biblioteca-personal-six.vercel.app)  
📖 **Documentación de la API (Swagger UI):** `https://api-biblioteca-personal-six.vercel.app/api-docs`

---

## ✨ Características Principales

*   **Gestión CRUD Completa:** Operaciones robustas para crear, consultar, actualizar y eliminar libros del catálogo de forma segura.
*   **Buscador Inteligente Tolerante a Acentos:** Motor de búsqueda integrado que normaliza caracteres Unicode (eliminando tildes y diéresis) para garantizar búsquedas de texto predictivas y sin fricción.
*   **Filtros de Catálogo Dinámicos:** Endpoints dedicados y consultas preparadas para filtrar instantáneamente colecciones por género literario o estado de lectura (`pendiente`, `leyendo`, `leido`).
*   **Módulo de Estadísticas Avanzadas:** Endpoint agregador (`/stats`) que consolida en una sola transacción SQL métricas clave del inventario (libros leídos, páginas acumuladas, calificaciones promedio y distribución por géneros).
*   **Frontend Premium integrado:** Interfaz estilo "Glassmorphic Bookcase" interactiva, con paneles laterales deslizantes, cambio rápido de estado con micro-animaciones, y barra de búsqueda predictiva en tiempo real.

---

## 🛠️ Stack Tecnológico de Grado de Producción

| Capa / Componente | Tecnología Seleccionada | Razón de Elección y Beneficio de Ingeniería |
| :--- | :--- | :--- |
| **Runtime & Servidor** | Node.js (v18+) & Express | Ecosistema maduro y de alto rendimiento asíncrono para el manejo de I/O en APIs. |
| **Base de Datos** | SQLite (`better-sqlite3`) | Persistencia ágil en memoria/disco local con soporte completo para transacciones ACID y consultas complejas. |
| **Validación de Datos** | Joi Schemas | Validación y sanitización estricta de payloads entrantes antes de alcanzar la capa de servicios. |
| **Seguridad Activa** | Helmet.js & Express Rate Limit | Protección activa contra vulnerabilidades comunes (XSS, Clickjacking) y mitigación de ataques DDoS/Fuerza Bruta. |
| **Logging Estructurado** | Pino Logger | Bitácora de eventos y peticiones HTTP en formato JSON optimizado para indexadores de Cloud (ej. Datadog). |
| **TestSuite (Pruebas)** | Jest & Supertest | Suite automatizada de pruebas unitarias y de integración para garantizar cobertura de código del 100% en endpoints críticos. |

---

## 🏗️ Patrones de Diseño y Arquitectura en Capas

El proyecto está diseñado bajo una estricta **separación de responsabilidades**, lo cual facilita su mantenimiento, escalabilidad y testeo independiente:

```
api-biblioteca-personal/
├── public/                # Capa de Frontend (HTML, CSS variables, JS Vanilla)
├── src/
│   ├── routes/            # Capa de Rutas (Mapeo de endpoints HTTP)
│   ├── schemas/           # Capa de Validación (Esquemas e inyección Joi)
│   ├── services/          # Capa de Servicios (Lógica de negocio purificada)
│   ├── database/          # Capa de Datos (SQLite connection y migraciones iniciales)
│   └── app.js             # Punto de configuración del servidor Express
├── index.js               # Punto de entrada de la aplicación
├── package.json
└── vercel.json            # Orquestador de despliegue en la nube
```

---

## 🚀 Instalación y Despliegue Local

Sigue estos 3 pasos simples para ejecutar el proyecto en tu entorno local:

```bash
# 1. Clonar el repositorio
git clone https://github.com/isaias-sanchez/api-biblioteca-personal.git
cd api-biblioteca-personal

# 2. Instalar dependencias oficiales
npm install

# 3. Levantar la aplicación con recarga en caliente
npm run dev
```

El servidor local se iniciará de inmediato en `http://localhost:3000`. Podrás interactuar con la estantería interactiva abriendo la URL en tu navegador, o consultar la documentación en Swagger en `http://localhost:3000/api-docs`.

---

## 📋 Especificación del Modelo de Datos (Libro)

Los payloads se validan estrictamente con la siguiente estructura JSON en operaciones `POST` y `PUT`:

```json
{
  "titulo": "Cien años de soledad",
  "autor": "Gabriel García Márquez",
  "genero": "Realismo mágico",
  "anio": 1967,
  "paginas": 471,
  "estado": "leido",
  "calificacion": 5,
  "notas": "Obra maestra de la literatura latinoamericana. Excelente."
}
```

*   `estado` (Obligatorio): Debe ser estrictamente `pendiente`, `leyendo` o `leido`.
*   `calificacion` (Opcional): Número entero restringido entre `1` y `5`.
*   `paginas` (Obligatorio): Entero positivo mayor a cero.

---

## 🔒 Seguridad e Infraestructura en Producción

Para garantizar que el servicio sea seguro ante peticiones maliciosas o sobrecarga en la nube (Vercel), se inyectaron los siguientes mecanismos de defensa:

*   **Helmet Integration:** Cabeceras HTTP seguras añadidas automáticamente para prevenir inyecciones de scripts maliciosos.
*   **CORS Seguro:** Configuración dinámica de orígenes permitidos para evitar accesos no autorizados desde navegadores externos.
*   **Rate Limiter:** Límite máximo de **100 solicitudes por cada 15 minutos** por dirección IP única para mitigar abusos de bots.

---

## 🧪 Pruebas Automatizadas (Test Suite)

El proyecto cuenta con cobertura de pruebas de integración para asegurar que cada endpoint retorne el código de estado HTTP correcto y responda de forma predecible:

```bash
# Ejecutar suite de pruebas unitarias y de integración
npm test
```

---

## 🧑‍💻 Desarrollado por
*   **Isaías José Sánchez Cervantes** - *Sistemas e Ingeniería de Software* (Universidad de la Costa - CUC).
*   Desarrollado bajo la tutoría académica del **Ing. Luis Toscano Castilla** para la cátedra de *Desarrollo Web (Séptimo Semestre)*.
