const Joi = require('joi');

// Validación básica de ID (positivo, integer)
const idSchema = Joi.number().integer().positive().required();

// Schema para libro completo
const libroSchema = Joi.object({
  titulo: Joi.string().min(1).max(255).required(),
  autor: Joi.string().min(1).max(255).required(),
  genero: Joi.string().min(1).max(100).required(),
  anio: Joi.number().integer().min(0).max(2100).optional().allow(null),
  paginas: Joi.number().integer().min(1).optional().allow(null),
  estado: Joi.string().valid('pendiente', 'leyendo', 'leido').required(),
  calificacion: Joi.number().integer().min(1).max(5).optional().allow(null),
  notas: Joi.string().max(2000).optional().allow(null, '')
});

// Schema para crear libro (todos los campos excepto id)
const libroCreateSchema = libroSchema.keys({
  estado: libroSchema.extract('estado').default('pendiente'),
  calificacion: libroSchema.extract('calificacion').allow(null),
  notas: libroSchema.extract('notas').allow(null, '')
});

// Schema para actualizar libro completo
const libroUpdateSchema = libroSchema.keys({
  estado: libroSchema.extract('estado').optional()
});

// Schema para actualizar solo estado
const libroEstadoSchema = Joi.object({
  estado: Joi.string().valid('pendiente', 'leyendo', 'leido').required()
});

// Schema para buscar (query params)
const searchSchema = Joi.object({
  q: Joi.string().min(1).max(100).required(),
  genero: Joi.string().min(1).max(100).optional().allow(''),
  estado: Joi.string().valid('pendiente', 'leyendo', 'leido').optional().allow('')
});

// Schema para paginación
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}).unknown(true);

// Schema para parámetros de ruta con :id
const idParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

// Validador genérico para express
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const target = property === 'params' ? { id: req.params.id } : req[property];
    const { error } = schema.validate(target);
    if (error) {
      return res.status(400).json({
        error: `Error de validación: ${error.details[0].message}`
      });
    }
    next();
  };
};

module.exports = {
  idSchema,
  idParamsSchema,
  libroSchema,
  libroCreateSchema,
  libroUpdateSchema,
  libroEstadoSchema,
  searchSchema,
  paginationSchema,
  validate
};