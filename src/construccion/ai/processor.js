const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_TEXT = `Eres un asistente contable para obras de construcción en Colombia.
Analiza mensajes de WhatsApp y extrae información financiera estructurada.
Responde ÚNICAMENTE con JSON válido con esta estructura exacta:
{
  "accion": "registrar_ingreso" | "registrar_gasto" | "registrar_factura" | "consultar_balance" | "listar_obras" | "no_entendido",
  "obra": "nombre de la obra o null",
  "monto": número entero en pesos colombianos o null,
  "descripcion": "descripción del movimiento o null",
  "material": "nombre del material si aplica o null",
  "cantidad": número o null,
  "unidad": "bolsas/m3/kg/unidades/etc o null",
  "proveedor": "proveedor si aplica o null",
  "fecha": "YYYY-MM-DD o null",
  "respuesta_usuario": "mensaje breve en español coloquial colombiano"
}

Detecta INGRESOS con: ingreso, ingrese, entró, recibí, pagaron, cobré, anticipo, abono, me pagaron.
Detecta GASTOS con: gasté, compré, pagué, gasto, compra, material, adquirí, invertí.
Detecta CONSULTAS con: balance, saldo, cuánto va, cómo va, resumen, cuánto llevo.
Detecta LISTAR con: obras, listar, mis proyectos, qué obras tengo.

Montos colombianos — normaliza a entero:
"500 mil" → 500000, "2 millones" → 2000000, "1,5 millones" → 1500000,
"$300.000" → 300000, "300k" → 300000, "1.200.000" → 1200000.

Si falta la obra, deja "obra" null.
Si no entiendes, usa "no_entendido".`;

const SYSTEM_IMAGE = `Analiza esta imagen de factura o recibo de compra.
Responde ÚNICAMENTE con JSON válido:
{
  "es_factura": true/false,
  "proveedor": "nombre del proveedor o null",
  "numero_factura": "número de factura o null",
  "fecha": "YYYY-MM-DD o null",
  "items": [{"descripcion": "...", "cantidad": 0, "precio_unitario": 0, "subtotal": 0}],
  "subtotal": 0,
  "iva": 0,
  "total": 0,
  "descripcion_general": "resumen de qué se compró"
}
Si no es una factura o recibo, devuelve es_factura: false con el resto en null/0.`;

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('La IA no devolvió JSON válido');
  return JSON.parse(match[0]);
}

async function processTextMessage(message) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_TEXT,
    messages: [{ role: 'user', content: message }],
  });
  return extractJSON(response.content[0].text);
}

async function processImageMessage(imageUrl, caption = '') {
  // Download image (Twilio requires auth)
  const axiosConfig = {};
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    axiosConfig.auth = {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN,
    };
  }

  const imageResp = await axios.get(imageUrl, { ...axiosConfig, responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(imageResp.data);
  const base64 = imageBuffer.toString('base64');
  const contentType = (imageResp.headers['content-type'] || 'image/jpeg').split(';')[0];

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: contentType, data: base64 } },
        { type: 'text', text: caption ? `${SYSTEM_IMAGE}\n\nEl usuario también dijo: "${caption}"` : SYSTEM_IMAGE },
      ],
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages,
  });

  const invoiceData = extractJSON(response.content[0].text);

  // Try to extract obra name from caption
  let obra = null;
  if (caption) {
    const match = caption.match(/(?:obra|proyecto|para)\s+([^,\.]+)/i);
    if (match) obra = match[1].trim();
  }

  return { ...invoiceData, obra, accion: 'registrar_factura', imageBuffer };
}

async function processAudioMessage(audioUrl) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      accion: 'no_entendido',
      respuesta_usuario:
        '🎤 Las notas de voz aún no están configuradas. Por favor escribe el mensaje. Ej: "ingreso 500000 obra villa maria"',
    };
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const axiosConfig = {};
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      axiosConfig.auth = { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN };
    }

    const audioResp = await axios.get(audioUrl, { ...axiosConfig, responseType: 'arraybuffer' });
    const tempPath = path.join('/tmp', `audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempPath, Buffer.from(audioResp.data));

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: 'es',
    });

    fs.unlinkSync(tempPath);
    return processTextMessage(transcription.text);
  } catch (err) {
    return {
      accion: 'no_entendido',
      respuesta_usuario: '❌ No pude procesar la nota de voz. Envíame el mensaje como texto.',
    };
  }
}

module.exports = { processTextMessage, processImageMessage, processAudioMessage };
