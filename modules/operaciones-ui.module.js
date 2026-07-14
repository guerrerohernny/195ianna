/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/operaciones-ui.module.js
   UI DEL MOTOR DE OPERACIONES (Fase 1.95 · Etapa 5)
   ────────────────────────────────────────────────────────────────
   Capa de PRESENTACIÓN del Motor de Operaciones. Aquí vive todo lo
   que toca pantalla: el modal ⚙, el mapa "operación → flujo de UI"
   y la captura de datos de cancelación. El motor (business/) queda
   sin conocimiento de la UI (corrige la dependencia invertida A2/A3
   del DEPENDENCY_MAP).

   Correcciones visuales del modal (causa raíz):
   · closeM + apertura del siguiente modal en el MISMO tick dejaba
     backdrop/scroll en estado inconsistente → la acción se difiere
     un frame (setTimeout 80 ms).
   · grid fijo 1fr 1fr desbordaba con etiquetas largas → auto-fit
     con mínimo de 230 px.
   ════════════════════════════════════════════════════════════════ */

/* Mapa operación → flujo de pantalla (presentación pura) */
const OPERACIONES_UI = {
  editar_apartado:(a)=>editarApartado(a.id),
  generar_cierre:(a)=>generarCierre(a.id),
  contrato_firmado:(a)=>convertirVenta(a.id),
  cancelacion_apartado:(a)=>cancelarApartadoModal(a.id),
  cancelacion_venta:(a)=>openCancelarVenta(a.id),
  cobranza:(a)=>abrirCobranzaVenta(a.id),
  registrar_pago:(a)=>{ a.estatus==='Venta'?abrirCobranzaVenta(a.id):(generarCierre(a.id),cierreTab(3)); },
  correccion_administrativa:(a)=>{
    if(!AUTORIZADOR.autorizar('correccion_administrativa',{registroId:a.id}).ok) return;
    abrirCobranzaVenta(a.id); setCierreLock(false);
  },
  cambio_lote:()=>IANNA_OPERACIONES.cambio_lote.ejecutar(),
  cambio_modelo:()=>IANNA_OPERACIONES.cambio_modelo.ejecutar(),
  cambio_cliente:()=>IANNA_OPERACIONES.cambio_cliente.ejecutar(),
  cambio_asesor:()=>IANNA_OPERACIONES.cambio_asesor.ejecutar(),
  transferencia:()=>IANNA_OPERACIONES.transferencia.ejecutar(),
};

/* ── MODAL ⚙ OPERACIONES (el módulo solicita; el motor decide el catálogo) ── */
function abrirOperaciones(aid){
  const ap=apartadosService.obtener(aid); if(!ap) return;
  const p=prospectosService.obtener(ap.prospectoId);
  const l=getLote(ap.clave_lote);
  const cat=IANNA_OPS.catalogoPara(ap);
  window._opsApId=aid;
  $('ops-titulo').textContent=`${p?.nombre||'Cliente'} — ${l?.clave_fisica||IANNA_FMT.UBICACION(l?.mz,l?.lote)}`;
  const comisionesHtml=ap.estatus==='Venta'?renderComisionesVentaOps(ap):'';
  $('ops-body').innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:11.5px">
      <span class="badge" style="background:#1E3D0F;color:#fff">Estado: ${cat.estado}</span>
      ${ap.id_publico?`<span class="badge" style="background:#f1f5f9;color:#334155">${ap.id_publico}</span>`:''}
      ${ap.id_venta?`<span class="badge" style="background:#f1f5f9;color:#334155">${ap.id_venta}</span>`:''}
      ${ap.id_contrato?`<span class="badge" style="background:#f1f5f9;color:#334155">${ap.id_contrato}</span>`:''}
      ${p?.id_cliente?`<span class="badge" style="background:#f1f5f9;color:#334155">${p.id_cliente}</span>`:(p?.id_publico?`<span class="badge" style="background:#f1f5f9;color:#334155">${p.id_publico}</span>`:'')}
    </div>
    <div style="font-weight:700;font-size:12.5px;margin-bottom:8px">Operaciones permitidas en este estado</div>
    <div class="ops-grid" style="margin-bottom:14px">
      ${cat.permitidas.map((o,i)=>`<button class="btn ${o.futura?'btn-out':'btn-navy'}" style="justify-content:flex-start;font-size:12.5px;white-space:normal;text-align:left" onclick="ejecutarOpDesdeModal(${i})">${o.nombre}${o.futura?' <span style="opacity:.55;font-size:10px;margin-left:4px">(próxima fase)</span>':''}</button>`).join('')||'<div style="color:var(--t3);font-size:12px">Ninguna — estado terminal.</div>'}
    </div>
    ${cat.prohibidas.length?`<div style="font-weight:700;font-size:12.5px;margin-bottom:6px;color:var(--t3)">No disponibles en "${cat.estado}"</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${cat.prohibidas.map(o=>`<span class="badge" style="background:#f8fafc;color:#94a3b8;border:1px dashed #e2e8f0">${o.nombre}</span>`).join('')}</div>`:''}
    ${cat.documentos.length?`<div style="font-size:11px;color:var(--t3)">📎 Documentos de esta etapa: ${cat.documentos.join(' · ')}</div>`:''}
    ${comisionesHtml}
    <div style="font-size:11px;color:var(--t3);margin-top:10px">🕓 Historial: ${IANNA_HISTORIAL.de(aid).length} operación(es) registradas sobre este expediente.</div>`;
  window._opsCat=cat;
  openM('m-operaciones');
}
function ejecutarOpDesdeModal(i){
  const cat=window._opsCat; const ap=apartadosService.obtener(window._opsApId);
  if(!cat||!ap) return;
  const o=cat.permitidas[i]; if(!o) return;
  const flujo=OPERACIONES_UI[o.op];
  closeM('m-operaciones');
  if(!flujo){ toast('Esta operación aún no tiene flujo de captura (próxima fase).','warn'); return; }
  // Un frame de separación entre cerrar este modal y abrir el siguiente (corrige backdrop/scroll)
  setTimeout(()=>{ try{ flujo(ap); }catch(e){ console.error('operación UI',e); toast('No se pudo abrir el flujo: '+e.message,'err'); } }, 80);
}

/* ── Captura de cancelación de venta (UI) — el motor solo recibe la solicitud ── */
function openCancelarVenta(aid){
  if(!AUTORIZADOR.autorizar('cancelar_operacion',{registroId:aid}).ok) return;
  const ap=apartadosService.obtener(aid); if(!ap||ap.estatus!=='Venta') return;
  const p=prospectosService.obtener(ap.prospectoId);
  const motivo=prompt(`Cancelar venta de ${p?p.nombre:'cliente'} — ${ubicacionLote(ap.clave_lote)}\n\nEscribe el motivo de cancelación:`,'');
  if(motivo===null) return; // cancelado por el usuario
  if(!motivo.trim()){ toast('El motivo es requerido','err'); return; }
  const destino=confirm(`¿Volver el lote ${ap.clave_lote} a:\n\n✅ Aceptar → Disponible\n❌ Cancelar → Apartado`)?'Disponible':'Apartado';
  cancelarVenta(aid, motivo.trim(), destino); // solicitante puro → IANNA_OPS.ejecutar('cancelacion_venta',…)
}


/* ── Fase 1.97.6 · Hitos de comisión dentro de la Venta ───────── */
function _estadoLineaComisionBadge(estado){
  const m={pendiente_hito:['Pendiente de hito','#f8fafc','#64748b'],elegible:['Elegible','#ecfdf5','#047857'],en_corte:['En corte','#fff7ed','#c2410c'],pagada:['Pagada','#eff6ff','#1d4ed8'],cancelada:['Cancelada','#fef2f2','#b91c1c']};
  const x=m[estado]||[estado,'#f8fafc','#475569']; return `<span class="badge" style="background:${x[1]};color:${x[2]}">${x[0]}</span>`;
}
function renderComisionesVentaOps(ap){
  try{
    const r=IANNA_COM_CICLO.resumen(ap.id); if(!r.ok)return `<div class="card" style="margin-top:14px;padding:12px;color:#b91c1c">${r.error||'Sin información de comisión'}</div>`;
    const puede=AUTORIZADOR.puede('marcar_hito_comision');
    const hitos=(r.snapshot.hitos||[]).map(h=>{
      const lineas=r.lineas.filter(l=>l.hito_id===h.id), monto=lineas.reduce((s,l)=>s+Number(l.monto||0),0);
      const bloqueada=lineas.some(l=>['en_corte','pagada'].includes(l.estado));
      const accion=h.estado==='CUMPLIDO'
        ? (puede&&!bloqueada?`<button class="btn btn-out btn-xs" onclick="revocarHitoComisionDesdeUI('${ap.id}','${h.id}')">Reabrir</button>`:'')
        : (puede?`<button class="btn btn-gold btn-xs" onclick="marcarHitoComisionDesdeUI('${ap.id}','${h.id}')">Marcar cumplida</button>`:'');
      return `<div style="display:grid;grid-template-columns:28px 1fr auto;gap:9px;align-items:start;padding:10px 0;border-top:1px solid var(--bd2)">
        <div style="width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${h.estado==='CUMPLIDO'?'#dcfce7':'#f1f5f9'};color:${h.estado==='CUMPLIDO'?'#166534':'#64748b'}">${h.estado==='CUMPLIDO'?'✓':h.orden}</div>
        <div><div style="font-weight:700;font-size:12.5px">${h.nombre}</div><div style="font-size:10.5px;color:var(--t3)">${h.estado==='CUMPLIDO'?'Cumplida '+fD(h.cumplido_en||''):'Pendiente'} · ${IANNA_FMT.MXN(monto)}</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">${lineas.map(l=>`${_estadoLineaComisionBadge(l.estado)}<span style="font-size:10.5px">${l.rol}: ${IANNA_FMT.MXN(l.monto)}</span>`).join('')}</div></div>
        <div>${accion}</div>
      </div>`;
    }).join('');
    return `<div class="card" style="margin-top:14px;padding:12px;border-left:4px solid var(--gold)">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>Comisiones de la Venta</b><div style="font-size:10.5px;color:var(--t3)">${r.snapshot.esquema_nombre} · ${r.snapshot.fuente_nombre||r.snapshot.canal}</div></div><button class="btn btn-out btn-xs" onclick="closeM('m-operaciones');setTimeout(()=>navTo('ingresos'),80)">Ver cortes</button></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px"><div class="kpi"><small>Elegible</small><b>${IANNA_FMT.MXN(r.totales.elegible)}</b></div><div class="kpi"><small>En corte</small><b>${IANNA_FMT.MXN(r.totales.en_corte)}</b></div><div class="kpi"><small>Pagado</small><b>${IANNA_FMT.MXN(r.totales.pagado)}</b></div></div>${hitos}</div>`;
  }catch(e){console.error('render comisión venta',e);return '<div class="card" style="margin-top:14px;padding:12px;color:#b91c1c">No fue posible cargar las comisiones.</div>';}
}
function marcarHitoComisionDesdeUI(aid,hitoId){
  const fecha=prompt('Fecha de cumplimiento (AAAA-MM-DD):',new Date().toISOString().slice(0,10)); if(fecha===null)return;
  const nota=prompt('Comentario o referencia (opcional):','')||'';
  const r=IANNA_COM_CICLO.cumplirHito(aid,hitoId,{fecha:fecha?fecha+'T12:00:00':new Date().toISOString(),nota});
  if(!r.ok){toast(r.error||r.justificacion,'err');return;} toast(`Hito cumplido. ${r.lineas_elegibles||0} comisión(es) elegible(s).`,'ok'); abrirOperaciones(aid); try{renderIngresos();}catch(e){}
}
function revocarHitoComisionDesdeUI(aid,hitoId){
  const motivo=prompt('Motivo para reabrir el hito:',''); if(motivo===null)return;
  const r=IANNA_COM_CICLO.revocarHito(aid,hitoId,motivo); if(!r.ok){toast(r.error||r.justificacion,'err');return;} toast('Hito reabierto y comisiones regresadas a pendiente.','warn'); abrirOperaciones(aid); try{renderIngresos();}catch(e){}
}
