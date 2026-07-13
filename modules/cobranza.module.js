/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/cobranza.module.js
   Módulo Cobranza: pagos, recibos con folio, alerta de efectivo LFPIORPI (8,025 UMA), modo consulta.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
// ════════════════════════════════════════════════════════════════
// COBRANZA — pagos de enganche con recibo, y alerta de efectivo LFPIORPI
// ════════════════════════════════════════════════════════════════
function _cobDatos(){
  const ap=apartadosService.obtener(_cierreData.ap.id)||_cierreData.ap;
  const pagos=ap.pagos||[];
  const ledger=IANNA_FIN.movimientosDe(ap.id)||[];
  const aportado=IANNA_FIN.ingresosNetosOperacion(ap.id);
  // Efectivo documental + ledger, deduplicado por folio/documento para incluir apartado y pago adicional.
  const efDocs=[];
  if(String(ap.metodo_pago||'').toLowerCase().includes('efect')) efDocs.push({key:'apartado',monto:Number(ap.monto_enganche||0)});
  pagos.filter(x=>String(x.metodo||'').toLowerCase().includes('efect')).forEach(x=>efDocs.push({key:String(x.folio||x.id),monto:Number(x.monto||0)}));
  const fs=ap.financial_snapshot||{}; if(Number(fs.pago_adicional||0)>0&&String(fs.forma_pago_adicional||'').toLowerCase().includes('efect'))efDocs.push({key:'adicional',monto:Number(fs.pago_adicional||0)});
  const seen=new Set(); let efectivo=0; efDocs.forEach(x=>{if(!seen.has(x.key)){seen.add(x.key);efectivo+=x.monto}});
  ledger.filter(x=>x.tipo==='ingreso'&&String(x.metodo||'').toLowerCase().includes('efect')).forEach(x=>{const k=String(x.documento||x.id_publico||x.id);if(!seen.has(k)){seen.add(k);efectivo+=Number(x.monto||0)}});
  const P=getP(), topeEfectivo=8025*(P.uma_diaria||117.31);
  const baseCasa=Number(ap.financial_snapshot?.base_comisionable_snapshot?.total||IANNA_COM.baseComisionable(ap).base||ap.valor_operacion||0);
  const totalAdeudo=Number(ap.financial_snapshot?.desembolso ?? Math.max(0,Number(ap.financial_snapshot?.valor_total_financiero||ap.total_operacion||0)-Number(ap.financial_snapshot?.credito_monto||0)));
  const pendiente=Math.max(0,totalAdeudo-aportado), excedente=Math.max(0,aportado-totalAdeudo);
  const hoy=new Date();hoy.setHours(0,0,0,0);const vencidos=(_cierreData.pagares||[]).filter(p=>new Date(p.fecha)<hoy);
  return {ap,pagos,ledger,aportado,efectivo,topeEfectivo,baseCasa,totalAdeudo,pendiente,excedente,vencidos};
}
function renderCobranza(){
  if(!_cierreData)return;const d=_cobDatos();if(!$('cob-fecha').value)$('cob-fecha').value=new Date().toISOString().split('T')[0];
  $('cob-kpis').innerHTML=[{lbl:'Base comercial',val:mxn(d.baseCasa)},{lbl:'Total a cubrir',val:mxn(d.totalAdeudo)},{lbl:'Pagado',val:mxn(d.aportado)},{lbl:d.excedente>0?'Saldo a favor':'Saldo pendiente',val:mxn(d.excedente||d.pendiente)}].map(k=>`<div class="card" style="padding:11px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase">${k.lbl}</div><div style="font-size:17px;font-weight:800">${k.val}</div></div>`).join('');
  const pct=d.topeEfectivo>0?Math.round(d.efectivo/d.topeEfectivo*100):0,bar=Math.min(100,pct),exc=pct>100; const col=exc?'#dc2626':pct>=70?'#f59e0b':'#16a34a';
  $('cob-efectivo').innerHTML=`<div style="border:1px solid ${exc?'#fecaca':'#bbf7d0'};border-radius:8px;padding:12px;background:${exc?'#fee2e2':'#f0fdf4'}"><div style="display:flex;justify-content:space-between"><div><b>💵 Efectivo acumulado:</b> ${mxn(d.efectivo)} de ${mxn(d.topeEfectivo)} (8,025 UMA — LFPIORPI)</div><b>${pct}%</b></div><div style="height:8px;background:#e5e7eb;border-radius:20px;margin-top:8px;overflow:hidden"><div style="height:100%;width:${bar}%;background:${col}"></div></div>${exc?`<div style="color:#991b1b;font-weight:800;margin-top:6px">⚠️ Exceso de efectivo: ${mxn(d.efectivo-d.topeEfectivo)}</div>`:''}<div style="font-size:10.5px;color:var(--t3);margin-top:5px">La base de la operación se muestra separada; el límite legal se calcula por UMA vigente y el acumulado incluye apartado, pago adicional y cobranza en efectivo.</div></div>`;
  const rows=[{fecha:d.ap.fecha_apartado,concepto:'Apartado',metodo:d.ap.metodo_pago,monto:Number(d.ap.monto_enganche||0),folio:d.ap.folio},...d.pagos];
  if(Number(d.ap.financial_snapshot?.pago_adicional||0)>0)rows.push({fecha:(d.ap.financial_snapshot.creado_en||'').slice(0,10),concepto:'Pago adicional',metodo:d.ap.financial_snapshot.forma_pago_adicional,monto:Number(d.ap.financial_snapshot.pago_adicional),folio:d.ap.recibo_pago_adicional});
  $('cob-lista').innerHTML=`<div style="font-weight:800;margin-bottom:8px">Estado de cuenta</div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${['Fecha','Concepto','Método','Cargo','Abono','Saldo','Folio',''].map(h=>`<th style="padding:8px;text-align:left;background:var(--s2)">${h}</th>`).join('')}</tr></thead><tbody>${(()=>{let saldo=d.totalAdeudo;return rows.filter(x=>Number(x.monto||0)>0).sort((a,b)=>new Date(a.fecha||0)-new Date(b.fecha||0)).map(x=>{saldo-=Number(x.monto||0);return `<tr style="border-bottom:1px solid var(--bd)"><td style="padding:8px">${x.fecha?fD(x.fecha):'—'}</td><td>${x.concepto||'Pago'}</td><td>${x.metodo||'—'}</td><td>—</td><td style="font-weight:700;color:#047857">${mxn(x.monto)}</td><td style="font-weight:700;color:${saldo<0?'#b45309':'inherit'}">${saldo<0?'A favor '+mxn(Math.abs(saldo)):mxn(saldo)}</td><td>${x.folio?String(x.folio).padStart(8,'0'):'—'}</td><td>${x.id?`<button class="btn btn-out btn-xs" onclick="reabrirReciboPago('${d.ap.id}','${x.id}')">Recibo</button>`:''}</td></tr>`}).join('')})()}</tbody></table>${d.pendiente===0?'<div class="ali info" style="margin-top:10px">✅ Cuenta liquidada. Los pagarés pueden liberarse conforme al flujo autorizado.</div>':''}`;
} 
function registrarPagoCobranza(){
  if(!_cierreData) return;
  const monto=parseMoneyInput($('cob-monto').value);
  const fecha=$('cob-fecha').value;
  const metodo=$('cob-metodo').value;
  const concepto=$('cob-concepto').value;
  if(!monto||monto<=0){ toast('Captura el monto del pago','err'); return; }
  if(!fecha){ toast('Captura la fecha del pago','err'); return; }
  const d=_cobDatos();
  if(monto>d.pendiente&&d.pendiente>0){ if(!confirm(`El pago supera el saldo pendiente por ${mxn(monto-d.pendiente)}. Se registrará como saldo a favor. ¿Continuar?`)) return; }
  if(metodo==='Efectivo'&&(d.efectivo+monto)>d.topeEfectivo){
    if(!confirm(`⚠️ ALERTA LFPIORPI\n\nCon este pago el efectivo acumulado sería ${mxn(d.efectivo+monto)}, superando el tope legal de ${mxn(d.topeEfectivo)} (8,025 UMA).\n\nRecibir este efectivo implica sanciones conforme a la ley.\n\n¿Registrar de todas formas?`)) return;
  }
  const folio=IANNA_FOLIOS.emitir('pago', _cierreData.ap.id);
  const pago={id:'pg'+Date.now(), fecha, monto, metodo, concepto, folio:parseInt(folio), usuario:CU.id, registrado:new Date().toISOString()};
  const ap=DS.findOne('apartados',_cierreData.ap.id);
  const pagos=[...(ap.pagos||[]),pago];
  // Asegurar snapshot del cliente para poder regenerar el recibo desde la ficha
  let snap=ap.doc_snapshot;
  if(!snap){ snap=construirSnapshotCierre(); }
  apartadosService.actualizar(_cierreData.ap.id,{pagos, doc_snapshot:snap});
  _cierreData.ap.pagos=pagos;
  // Registrar en expediente
  const docs=(ap.documentos||[]).filter(x=>x.pagoId!==pago.id);
  docs.push({fn:'imprimirReciboPago', pagoId:pago.id, label:`Recibo de ${concepto} — ${mxn(monto)}`, fecha:new Date().toISOString(), usuario:CU.id});
  apartadosService.actualizar(_cierreData.ap.id,{documentos:docs});
  // Abrir recibo (mismo gesto de clic → sin bloqueo de popup)
  _cierreData.pagoActual=pago;
  imprimirReciboPago();
  _cierreData.pagoActual=null;
  $('cob-monto').value='';
  renderCobranza();
  IANNA_MOTOR.auditar('apartados', _cierreData.ap.id, 'REGISTRAR_PAGO', {}, {monto:pago.monto, metodo:pago.metodo, concepto:pago.concepto, folio:pago.folio}, 'Pago de cobranza con recibo');
  // ── FASE 1.9: registrar el pago en el LEDGER inmutable del Motor Financiero ──
  try{
    IANNA_FIN.registrarIngreso({
      operacionId:_cierreData.ap.id, personaId:_cierreData.ap.prospectoId,
      monto:pago.monto, metodo:pago.metodo,
      documento:IANNA_FMT.FOLIO(pago.folio),
      concepto:pago.concepto,
      politica_version:(_cierreData.ap.politica_snapshot||{}).version||'v1',
      motivo:'Cobranza registrada desde cierre',
    });
  }catch(e){ console.error('ledger cobranza',e); }
  toast(`Pago registrado — Recibo folio ${String(pago.folio).padStart(8,'0')} ✓`,'ok');
}
function reabrirReciboPago(apId,pagoId){
  const ap=DS.findOne('apartados',apId); if(!ap) return;
  const pago=(ap.pagos||[]).find(p=>p.id===pagoId); if(!pago){ toast('Pago no encontrado','err'); return; }
  if(_cierreData&&_cierreData.ap.id===apId){
    _cierreData.pagoActual=pago; imprimirReciboPago(); _cierreData.pagoActual=null; return;
  }
  abrirReciboPagoDesdeFicha(apId,pagoId);
}
function abrirReciboPagoDesdeFicha(apId,pagoId){
  const ap=DS.findOne('apartados',apId); if(!ap||!ap.doc_snapshot) return;
  const pago=(ap.pagos||[]).find(p=>p.id===pagoId); if(!pago) return;
  const s=ap.doc_snapshot; const prev=_cierreData;
  _cierreData={ap:{...ap}, l:s.l||getLote(ap.clave_lote)||{}, m:s.m||{}, folio:pago.folio,
    numCliente:s.numCliente, cliSnapshot:s.cli, asesorNombre:s.asesorNombre, formaPago:s.formaPago, pagoActual:pago};
  try{ imprimirReciboPago(); }catch(e){ console.error(e); toast('Error al generar el recibo','err'); }
  _cierreData=prev;
}
// Recibo de pago de cobranza — mismo formato del recibo oficial, concepto y método del pago
function imprimirReciboPago(){
  if(!_cierreData||!_cierreData.pagoActual) return;
  const {l} = _cierreData;
  const pago=_cierreData.pagoActual;
  const cli = getClienteData();
  const hoy = new Date(pago.fecha+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
  const monto = pago.monto;
  const montoPalabras = numToLetras(monto);
  const CONC=['APARTADO','ENGANCHE','PAGO ADICIONAL','MENSUALIDAD','INTERÉS MORATORIO'];
  const sel=(pago.concepto||'').toUpperCase()==='INTERÉS MORATORIO'?'INTERÉS MORATORIO':(pago.concepto||'').toUpperCase();
  const esInteres=sel==='INTERÉS MORATORIO';
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Recibo ${String(pago.folio).padStart(8,'0')}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#1a1a1a}
  .marco{border:2px solid #1E3D0F;border-radius:10px;padding:18px 22px;max-width:820px;margin:0 auto}
  table{width:100%;border-collapse:collapse}td{padding:4px 6px;vertical-align:top}
  .sep{border-top:1px solid #94a3b8;margin:9px 0}
  .concepto-box{display:flex;gap:18px;margin-top:6px}
  .concepto-box label{display:flex;align-items:center;gap:6px;font-size:11.5px}
  .chk{width:13px;height:13px;border:1.5px solid #333;display:inline-block;border-radius:2px}
  .chk{position:relative}.chk.sel{background:#1E3D0F;print-color-adjust:exact;-webkit-print-color-adjust:exact}.chk.sel::after{content:'✕';position:absolute;left:0;right:0;top:-2px;text-align:center;color:#1E3D0F;font-weight:900;font-size:11px;line-height:15px;text-shadow:0 0 2px #fff,0 0 2px #fff}
  .firma{border-top:1.5px solid #333;margin-top:44px;padding-top:5px;text-align:center;font-size:10.5px;font-weight:700}
  @media print{button{display:none!important}@page{size:letter;margin:10mm}}</style></head><body>
  <div class="marco">
    <table style="margin-bottom:8px"><tr>
      <td style="width:130px"><img src="${VA_LOGO}" style="height:52px"></td>
      <td style="text-align:center"><div style="font-weight:800;font-size:15px;color:#1E3D0F">DESARROLLADORA PALIZ</div>
        <div style="font-size:10.5px">BLVD. FRANCISCO I. MADERO #1051 COL. CENTRO C.P. 80000<br>CULIACÁN, SINALOA</div></td>
      <td style="width:160px"><div style="border:1.5px solid #1E3D0F;border-radius:6px;padding:6px 10px;text-align:right">
        <div style="font-size:10px;font-weight:700">FOLIO</div>
        <div style="font-size:11px;font-weight:700">No. ${String(pago.folio).padStart(8,'0')}</div>
        <div style="font-size:13px;font-weight:800;color:#C9963C">$ ${mxn(monto).replace('$','')}</div></div></td>
    </tr></table>
    <table>
      <tr><td><b>DESARROLLO:</b> VALLE DE ARAGÓN</td><td><b>MANZANA:</b> ${l.mz}</td><td><b>LOTE:</b> ${l.lote}</td></tr>
      <tr><td colspan="3"><b>RECIBIMOS DE:</b> ${cli.numCliente} &nbsp; ${(cli.nombre||'').toUpperCase()}</td></tr>
      <tr><td colspan="3"><b>LA CANTIDAD DE:</b> <span style="font-size:14px;font-weight:800;color:#1E3D0F">$ ${mxn(monto).replace('$','')}</span></td></tr>
      <tr><td colspan="3"><b>(${montoPalabras})</b></td></tr>
    </table>
    <div class="sep"></div>
    <div><b>POR CONCEPTO DE:</b>
      <div class="concepto-box">
        ${CONC.map(c=>`<label><span class="chk ${c===sel?'sel':''}"></span>${c}</label>`).join('')}
      </div>
    </div>
    <div style="margin-top:6px"><b>OBSERVACIONES:</b> &nbsp;</div>
    <div class="sep"></div>
    <div><b>DISTRIBUCIÓN DEL PAGO:</b> &nbsp; Pago a Capital: ${esInteres?'0.00':mxn(monto).replace('$','')} &nbsp;&nbsp; Interés Moratorio: ${esInteres?mxn(monto).replace('$',''):'0.00'}</div>
    <div style="margin-top:6px"><b>Forma de pago:</b> ${FORMA_PAGO_TXT[pago.metodo]||pago.metodo}</div>
    <div class="sep"></div>
    <div style="text-align:right;font-size:11px">ADMINISTRACIÓN</div>
    <table style="margin-top:30px"><tr>
      <td style="width:45%"><div class="firma">ELABORÓ</div></td><td></td>
      <td style="width:45%;text-align:center"><div style="font-size:11px;font-weight:700;margin-top:44px;border-top:1.5px solid #333;padding-top:5px">CULIACÁN, SINALOA &nbsp; ${hoy}</div></td>
    </tr></table>
  </div>
  <button onclick="window.print()" style="margin:14px auto;display:block;padding:8px 20px;background:#1E3D0F;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨 Imprimir</button>
  </body></html>`);
  win.document.close();
}

function imprimirReciboPagoAdicional(){
  if(!_cierreData) return;
  const fs=_cierreData.financialSnapshot||_cierreData.ap?.financial_snapshot||{};
  const monto=Number(fs.pago_adicional||_cierreData.pagoAdic||0);
  if(monto<=0){toast('Esta operación no tiene pago adicional','warn');return;}
  const prev=_cierreData.pagoActual;
  _cierreData.pagoActual={
    id:'pago_adicional', fecha:(fs.creado_en||new Date().toISOString()).slice(0,10), monto,
    metodo:fs.forma_pago_adicional||'Transferencia electrónica', concepto:'Pago adicional',
    folio:_cierreData.ap?.recibo_pago_adicional||_cierreData.ap?.folio_pago_adicional||''
  };
  try{ imprimirReciboPago(); }finally{ _cierreData.pagoActual=prev; }
}

// ── Modo consulta para ventas cerradas ──
function setCierreLock(locked){
  ['cierre-tab-0','cierre-tab-1'].forEach(tid=>{
    const tab=$(tid); if(!tab||!tab.querySelectorAll) return;
    tab.querySelectorAll('input,select,textarea').forEach(el=>{ el.disabled=locked; });
    tab.querySelectorAll('button').forEach(b=>{
      const oc=b.getAttribute&&b.getAttribute('onclick')||'';
      if(oc.includes('guardar')) b.style.display=locked?'none':'';
    });
  });
  // Tab 3 (vista previa): en modo consulta ocultar Guardar y el botón de registrar venta (ya vendido)
  const esVenta=_cierreData&&_cierreData.ap&&DS.findOne('apartados',_cierreData.ap.id)?.estatus==='Venta';
  const btnVenta=$('btn-descargar-cierre');
  if(btnVenta) btnVenta.style.display=(locked||esVenta)?'none':'';
  const tab2=$('cierre-tab-2');
  if(tab2&&tab2.querySelectorAll) tab2.querySelectorAll('button').forEach(b=>{
    const oc=b.getAttribute&&b.getAttribute('onclick')||'';
    if(oc.includes('guardarCierreCompleto')) b.style.display=locked?'none':'';
  });
  const unlockBtn=$('btn-cierre-unlock');
  if(unlockBtn) unlockBtn.style.display=locked?'inline-flex':'none';
  window._cierreLocked=locked;
  if(!locked){
    const apLock=_cierreData&&DS.findOne('apartados',_cierreData.ap.id);
    if(apLock&&apLock.estatus==='Venta') IANNA_MOTOR.auditar('apartados', apLock.id, 'CORRECCION_ADMINISTRATIVA_DESBLOQUEO', {}, {}, 'Edición habilitada sobre venta cerrada');
    toast('Edición habilitada — puedes modificar y guardar','ok');
  }
}
function abrirCobranzaVenta(aid){
  generarCierre(aid);
  setCierreLock(true);
  cierreTab(3);
}

