const ExcelJS = require('exceljs');
const { obtenerObraPorId, obtenerBalance } = require('../obras/service');
const { obtenerTransacciones, obtenerResumenPorMes } = require('../transacciones/service');
const { obtenerFacturas } = require('../facturas/service');
const path = require('path');

const H_DARK = 'FF1A237E';
const H_MID  = 'FF2E4057';
const WHITE  = 'FFFFFFFF';
const GREEN  = 'FF1B5E20';
const GREEN_BG = 'FFC8E6C9';
const RED    = 'FFB71C1C';
const RED_BG = 'FFFFCDD2';

function headerStyle(bg = H_MID) {
  return {
    font: { bold: true, color: { argb: WHITE }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { bottom: { style: 'medium', color: { argb: H_DARK } } },
  };
}

function moneyCell(color = null) {
  const style = { numFmt: '"$"#,##0', alignment: { horizontal: 'right' } };
  if (color) style.font = { color: { argb: color } };
  return style;
}

async function generarReporteObra(obraId) {
  const obra = obtenerObraPorId(obraId);
  if (!obra) throw new Error('Obra no encontrada');

  const balance = obtenerBalance(obraId);
  const transacciones = obtenerTransacciones(obraId);
  const resumenMes = obtenerResumenPorMes(obraId);
  const facturas = obtenerFacturas(obraId);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Asistente Contable Obras';
  wb.created = new Date();

  // ─── HOJA 1: RESUMEN ────────────────────────────────────────────────────────
  const wsRes = wb.addWorksheet('Resumen');
  wsRes.columns = [{ width: 32 }, { width: 26 }];

  const title = wsRes.getCell('A1');
  title.value = `OBRA: ${obra.nombre.toUpperCase()}`;
  title.font = { bold: true, size: 16, color: { argb: WHITE } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: H_DARK } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRes.mergeCells('A1:B1');
  wsRes.getRow(1).height = 42;

  wsRes.addRow([]);
  wsRes.addRow(['Fecha del reporte', new Date().toLocaleDateString('es-CO')]);
  wsRes.addRow(['Estado', obra.activa ? 'Activa' : 'Finalizada']);
  if (obra.descripcion) wsRes.addRow(['Descripción', obra.descripcion]);
  wsRes.addRow([]);

  function addSummaryRow(label, value, numFmt, bgArgb, fgArgb) {
    const row = wsRes.addRow([label, value]);
    ['A', 'B'].forEach(col => {
      wsRes.getCell(`${col}${row.number}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      wsRes.getCell(`${col}${row.number}`).font = { bold: true, color: { argb: fgArgb } };
    });
    if (numFmt) wsRes.getCell(`B${row.number}`).numFmt = numFmt;
    row.height = 24;
    return row;
  }

  addSummaryRow('TOTAL INGRESOS', balance.total_ingresos, '"$"#,##0', GREEN_BG, GREEN);
  addSummaryRow('TOTAL GASTOS',   balance.total_gastos,   '"$"#,##0', RED_BG,   RED);
  wsRes.addRow([]);
  const saldoBg = balance.saldo >= 0 ? 'FFE8F5E9' : 'FFFFEBEE';
  const saldoFg = balance.saldo >= 0 ? GREEN : RED;
  addSummaryRow('SALDO ACTUAL', balance.saldo, '"$"#,##0', saldoBg, saldoFg);

  wsRes.addRow([]);
  wsRes.addRow(['Total transacciones', balance.total_transacciones]);
  if (obra.presupuesto > 0) {
    wsRes.addRow(['Presupuesto', obra.presupuesto]).getCell('B' + wsRes.lastRow.number).numFmt = '"$"#,##0';
    const ej = ((balance.total_gastos / obra.presupuesto) * 100).toFixed(1);
    wsRes.addRow(['Ejecución presupuestal', `${ej}%`]);
  }

  // ─── HOJA 2: TRANSACCIONES ────────────────────────────────────────────────
  const wsTr = wb.addWorksheet('Transacciones');
  wsTr.columns = [
    { header: 'ID',          key: 'id',          width: 7  },
    { header: 'Fecha',       key: 'fecha',        width: 13 },
    { header: 'Tipo',        key: 'tipo',         width: 11 },
    { header: 'Monto',       key: 'monto',        width: 18 },
    { header: 'Descripción', key: 'descripcion',  width: 36 },
    { header: 'Material',    key: 'material',     width: 22 },
    { header: 'Cantidad',    key: 'cantidad',     width: 11 },
    { header: 'Unidad',      key: 'unidad',       width: 11 },
    { header: 'Proveedor',   key: 'proveedor',    width: 26 },
    { header: 'Fuente',      key: 'fuente',       width: 13 },
  ];

  wsTr.getRow(1).eachCell(cell => { cell.style = headerStyle(); });
  wsTr.getRow(1).height = 25;

  transacciones.forEach(t => {
    const row = wsTr.addRow({
      id: t.id, fecha: t.fecha,
      tipo: t.tipo.toUpperCase(), monto: t.monto,
      descripcion: t.descripcion, material: t.material,
      cantidad: t.cantidad, unidad: t.unidad,
      proveedor: t.proveedor, fuente: t.fuente,
    });

    const isIngreso = t.tipo === 'ingreso';
    const tipoBg  = isIngreso ? GREEN_BG : RED_BG;
    const tipoFg  = isIngreso ? GREEN : RED;
    row.getCell('tipo').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: tipoBg } };
    row.getCell('tipo').font  = { bold: true, color: { argb: tipoFg } };
    row.getCell('monto').numFmt = '"$"#,##0';
    row.getCell('monto').font   = { color: { argb: tipoFg } };
    row.eachCell(cell => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
    });
  });

  // Totals
  wsTr.addRow([]);
  const trI = wsTr.addRow({ tipo: 'TOTAL INGRESOS', monto: balance.total_ingresos });
  trI.getCell('tipo').font  = { bold: true, color: { argb: GREEN } };
  trI.getCell('monto').numFmt = '"$"#,##0';
  trI.getCell('monto').font   = { bold: true, color: { argb: GREEN } };
  const trG = wsTr.addRow({ tipo: 'TOTAL GASTOS', monto: balance.total_gastos });
  trG.getCell('tipo').font  = { bold: true, color: { argb: RED } };
  trG.getCell('monto').numFmt = '"$"#,##0';
  trG.getCell('monto').font   = { bold: true, color: { argb: RED } };
  const trS = wsTr.addRow({ tipo: 'SALDO FINAL', monto: balance.saldo });
  trS.getCell('tipo').font  = { bold: true, size: 12 };
  trS.getCell('monto').numFmt = '"$"#,##0';
  trS.getCell('monto').font   = { bold: true, size: 12, color: { argb: balance.saldo >= 0 ? GREEN : RED } };

  // ─── HOJA 3: POR MES ──────────────────────────────────────────────────────
  if (resumenMes.length > 0) {
    const wsMes = wb.addWorksheet('Por Mes');
    wsMes.columns = [
      { header: 'Mes',            key: 'mes',            width: 14 },
      { header: 'Ingresos',       key: 'ingresos',       width: 20 },
      { header: 'Gastos',         key: 'gastos',         width: 20 },
      { header: 'Saldo del mes',  key: 'saldo',          width: 20 },
      { header: 'Transacciones',  key: 'transacciones',  width: 16 },
    ];
    wsMes.getRow(1).eachCell(cell => { cell.style = headerStyle(); });
    wsMes.getRow(1).height = 25;
    resumenMes.forEach(m => {
      const saldo = m.ingresos - m.gastos;
      const row = wsMes.addRow({ mes: m.mes, ingresos: m.ingresos, gastos: m.gastos, saldo, transacciones: m.transacciones });
      row.getCell('ingresos').numFmt = '"$"#,##0';
      row.getCell('gastos').numFmt   = '"$"#,##0';
      row.getCell('saldo').numFmt    = '"$"#,##0';
      row.getCell('saldo').font = { color: { argb: saldo >= 0 ? GREEN : RED } };
    });
  }

  // ─── HOJA 4: FACTURAS ─────────────────────────────────────────────────────
  if (facturas.length > 0) {
    const wsFact = wb.addWorksheet('Facturas');
    wsFact.columns = [
      { header: 'ID',          key: 'id',                  width: 7  },
      { header: 'Fecha',       key: 'fecha',               width: 13 },
      { header: 'Proveedor',   key: 'proveedor',           width: 28 },
      { header: 'No. Factura', key: 'numero_factura',      width: 16 },
      { header: 'Subtotal',    key: 'subtotal',            width: 18 },
      { header: 'IVA',         key: 'iva',                 width: 15 },
      { header: 'Total',       key: 'total',               width: 18 },
      { header: 'Descripción', key: 'descripcion_general', width: 40 },
      { header: 'Archivo',     key: 'archivo',             width: 28 },
    ];
    wsFact.getRow(1).eachCell(cell => { cell.style = headerStyle(); });
    wsFact.getRow(1).height = 25;
    facturas.forEach(f => {
      const row = wsFact.addRow({
        id: f.id, fecha: f.fecha, proveedor: f.proveedor,
        numero_factura: f.numero_factura,
        subtotal: f.subtotal, iva: f.iva, total: f.total,
        descripcion_general: f.descripcion_general,
        archivo: f.archivo_path ? path.basename(f.archivo_path) : '',
      });
      ['subtotal', 'iva', 'total'].forEach(k => { row.getCell(k).numFmt = '"$"#,##0'; });
    });
  }

  return wb;
}

module.exports = { generarReporteObra };
