const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../database');
const { processTextMessage, processImageMessage, processAudioMessage } = require('../ai/processor');
const { encontrarOCrearObra, obtenerBalance } = require('../obras/service');
const { registrarTransaccion } = require('../transacciones/service');
const { registrarFactura, guardarImagenFactura } = require('../facturas/service');

function cop(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
}

function balanceMsg(obra, bal) {
  const emoji = bal.saldo >= 0 ? '✅' : '⚠️';
  return [
    `📊 *Balance ${obra.nombre}:*`,
    `💚 Ingresos: ${cop(bal.total_ingresos)}`,
    `🔴 Gastos:   ${cop(bal.total_gastos)}`,
    `${emoji} *Saldo: ${cop(bal.saldo)}*`,
  ].join('\n');
}

const HELP_MSG = [
  '❓ No entendí. Puedes decir:',
  '• "ingreso 500000 obra villa maria"',
  '• "compré 50 bolsas cemento por 300000 obra villa maria"',
  '• "balance obra villa maria"',
  '• "listar obras"',
  '• (foto de una factura)',
].join('\n');

async function sendTwilio(to, body) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) return;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
  await axios.post(url, new URLSearchParams({ From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`, To: to, Body: body }), {
    auth: { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN },
  });
}

async function dispatchResult(resultado, from, rawBody, tipo) {
  const { accion, obra: obraNombre, monto, descripcion, material, cantidad, unidad, proveedor, fecha, respuesta_usuario } = resultado;

  if (accion === 'registrar_ingreso') {
    if (!obraNombre) return '❓ ¿Para cuál obra es el ingreso?\nEj: "ingreso 500000 obra villa maria"';
    const obra = encontrarOCrearObra(obraNombre);
    registrarTransaccion({ obraId: obra.id, tipo: 'ingreso', monto, descripcion, fecha, fuente: 'whatsapp', remitente: from, mensajeOriginal: rawBody });
    const bal = obtenerBalance(obra.id);
    return [`✅ *Ingreso registrado!*`, `💵 Monto: ${cop(monto)}`, `🏗️ Obra: ${obra.nombre}`, descripcion ? `📝 Concepto: ${descripcion}` : '', '', balanceMsg(obra, bal)].filter(Boolean).join('\n');
  }

  if (accion === 'registrar_gasto') {
    if (!obraNombre) return '❓ ¿Para cuál obra es el gasto?\nEj: "compré cemento por 300000 obra villa maria"';
    const obra = encontrarOCrearObra(obraNombre);
    registrarTransaccion({ obraId: obra.id, tipo: 'gasto', monto, descripcion, material, cantidad, unidad, proveedor, fecha, fuente: 'whatsapp', remitente: from, mensajeOriginal: rawBody });
    const bal = obtenerBalance(obra.id);
    return [
      `✅ *Gasto registrado!*`,
      `💸 Monto: ${cop(monto)}`,
      `🏗️ Obra: ${obra.nombre}`,
      material ? `🔧 Material: ${material}${cantidad ? ` (${cantidad} ${unidad || ''})`.trim() : ''}` : '',
      descripcion && !material ? `📝 Detalle: ${descripcion}` : '',
      proveedor ? `🏪 Proveedor: ${proveedor}` : '',
      '', balanceMsg(obra, bal),
    ].filter(Boolean).join('\n');
  }

  if (accion === 'registrar_factura') {
    const { es_factura, proveedor: prov, numero_factura, items, subtotal, iva, total, descripcion_general, imageBuffer } = resultado;

    let obra = null;
    if (obraNombre) obra = encontrarOCrearObra(obraNombre);

    const factura = registrarFactura({
      obraId: obra?.id,
      numeroFactura: numero_factura,
      proveedor: prov,
      fecha: resultado.fecha,
      items, subtotal, iva, total,
      descripcionGeneral: descripcion_general,
    });

    // Save invoice image
    if (tipo === 'imagen' && imageBuffer) {
      const imgPath = guardarImagenFactura(imageBuffer, factura.id);
      db.prepare('UPDATE facturas SET archivo_path = ? WHERE id = ?').run(imgPath, factura.id);
    }

    // Auto-register as expense if obra is known and total > 0
    if (obra && total > 0) {
      registrarTransaccion({
        obraId: obra.id, tipo: 'gasto', monto: total,
        descripcion: descripcion_general || `Factura ${numero_factura || factura.id}`,
        proveedor: prov, facturaId: factura.id,
        fuente: 'whatsapp_factura', remitente: from, mensajeOriginal: rawBody,
      });
    }

    return [
      `✅ *Factura registrada! (ID: ${factura.id})*`,
      prov ? `🏪 Proveedor: ${prov}` : '',
      numero_factura ? `🧾 No. Factura: ${numero_factura}` : '',
      total ? `💰 Total: ${cop(total)}` : '',
      obra ? `🏗️ Obra: ${obra.nombre}` : '❓ Indica la obra: "esta factura es para la obra [nombre]"',
      tipo === 'imagen' ? '📁 Imagen guardada en el sistema' : '',
    ].filter(Boolean).join('\n');
  }

  if (accion === 'consultar_balance') {
    if (!obraNombre) return '❓ ¿De cuál obra quieres el balance?\nEj: "balance obra villa maria"';
    const obra = encontrarOCrearObra(obraNombre);
    return balanceMsg(obra, obtenerBalance(obra.id));
  }

  if (accion === 'listar_obras') {
    const obras = db.prepare('SELECT * FROM obras WHERE activa = 1 ORDER BY nombre ASC').all();
    if (!obras.length) return '📋 No tienes obras registradas aún.';
    const lines = obras.map(o => {
      const b = obtenerBalance(o.id);
      const emoji = b.saldo >= 0 ? '💚' : '🔴';
      return `${emoji} *${o.nombre}* — Saldo: ${cop(b.saldo)}`;
    });
    return ['📋 *Tus obras activas:*', '', ...lines].join('\n');
  }

  return respuesta_usuario || HELP_MSG;
}

// ── Twilio webhook ──────────────────────────────────────────────────────────
router.post('/twilio', async (req, res) => {
  // Respond immediately so Twilio doesn't timeout
  res.set('Content-Type', 'text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  const { Body = '', From = '', NumMedia = '0', MediaUrl0, MediaContentType0 } = req.body;
  const numMedia = parseInt(NumMedia, 10);

  const log = db.prepare(`
    INSERT INTO mensajes_log (remitente, tipo_mensaje, contenido, media_url)
    VALUES (?, ?, ?, ?)
  `).run(
    From,
    numMedia > 0 ? (MediaContentType0?.startsWith('image') ? 'imagen' : 'audio') : 'texto',
    Body, MediaUrl0 || null
  );

  try {
    let resultado;
    let tipo = 'texto';

    if (numMedia > 0 && MediaContentType0?.startsWith('image')) {
      tipo = 'imagen';
      resultado = await processImageMessage(MediaUrl0, Body);
    } else if (numMedia > 0 && (MediaContentType0?.startsWith('audio') || MediaContentType0?.includes('ogg'))) {
      tipo = 'audio';
      resultado = await processAudioMessage(MediaUrl0);
    } else {
      resultado = await processTextMessage(Body);
    }

    db.prepare('UPDATE mensajes_log SET ai_resultado = ?, procesado = 1 WHERE id = ?')
      .run(JSON.stringify(resultado), log.lastInsertRowid);

    const reply = await dispatchResult(resultado, From, Body, tipo);
    await sendTwilio(From, reply);
  } catch (err) {
    console.error('[WhatsApp webhook] error:', err.message);
    db.prepare('UPDATE mensajes_log SET error = ?, procesado = -1 WHERE id = ?')
      .run(err.message, log.lastInsertRowid);
    await sendTwilio(From, '❌ Hubo un error procesando tu mensaje. Intenta de nuevo.');
  }
});

// ── Meta WhatsApp API — webhook verification ────────────────────────────────
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
});

// ── Meta WhatsApp API — incoming messages ───────────────────────────────────
router.post('/meta', async (req, res) => {
  res.status(200).json({ status: 'ok' });
  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of (body.entry || [])) {
    for (const change of (entry.changes || [])) {
      for (const msg of (change.value?.messages || [])) {
        const from = msg.from;
        let tipo = msg.type;
        let rawBody = '';
        let mediaUrl = null;
        let mediaType = null;

        if (tipo === 'text') { rawBody = msg.text?.body || ''; }
        else if (tipo === 'image') { mediaUrl = msg.image?.id; mediaType = 'image/jpeg'; }
        else if (tipo === 'audio') { mediaUrl = msg.audio?.id; mediaType = 'audio/ogg'; }

        const log = db.prepare('INSERT INTO mensajes_log (remitente, tipo_mensaje, contenido, media_url) VALUES (?, ?, ?, ?)')
          .run(from, tipo, rawBody, mediaUrl);

        try {
          let resultado;
          if (tipo === 'image' && mediaUrl) resultado = await processImageMessage(`https://graph.facebook.com/v18.0/${mediaUrl}`, rawBody);
          else if (tipo === 'audio' && mediaUrl) resultado = await processAudioMessage(`https://graph.facebook.com/v18.0/${mediaUrl}`);
          else resultado = await processTextMessage(rawBody);

          db.prepare('UPDATE mensajes_log SET ai_resultado = ?, procesado = 1 WHERE id = ?')
            .run(JSON.stringify(resultado), log.lastInsertRowid);

          // Meta API response sending requires additional setup (access token)
          // For now just log — implement sendMetaMessage() when Meta credentials are available
          await dispatchResult(resultado, from, rawBody, tipo);
        } catch (err) {
          console.error('[Meta webhook] error:', err.message);
          db.prepare('UPDATE mensajes_log SET error = ?, procesado = -1 WHERE id = ?')
            .run(err.message, log.lastInsertRowid);
        }
      }
    }
  }
});

module.exports = router;
