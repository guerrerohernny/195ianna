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
  $('ops-titulo').textContent=`${p?.nombre||'Cliente'} — Lote ${ap.clave_lote}${l?.clave_fisica?' ('+l.clave_fisica+')':''}`;
  $('ops-body').innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:11.5px">
      <span class="badge" style="background:#1E3D0F;color:#fff">Estado: ${cat.estado}</span>
      ${ap.id_publico?`<span class="badge" style="background:#f1f5f9;color:#334155">${ap.id_publico}</span>`:''}
      ${ap.id_venta?`<span class="badge" style="background:#f1f5f9;color:#334155">${ap.id_venta}</span>`:''}
      ${ap.id_contrato?`<span class="badge" style="background:#f1f5f9;color:#334155">${ap.id_contrato}</span>`:''}
      ${p?.id_cliente?`<span class="badge" style="background:#f1f5f9;color:#334155">${p.id_cliente}</span>`:(p?.id_publico?`<span class="badge" style="background:#f1f5f9;color:#334155">${p.id_publico}</span>`:'')}
    </div>
    <div style="font-weight:700;font-size:12.5px;margin-bottom:8px">Operaciones permitidas en este estado</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;margin-bottom:14px">
      ${cat.permitidas.map((o,i)=>`<button class="btn ${o.futura?'btn-out':'btn-navy'}" style="justify-content:flex-start;font-size:12.5px;white-space:normal;text-align:left" onclick="ejecutarOpDesdeModal(${i})">${o.nombre}${o.futura?' <span style="opacity:.55;font-size:10px;margin-left:4px">(próxima fase)</span>':''}</button>`).join('')||'<div style="color:var(--t3);font-size:12px">Ninguna — estado terminal.</div>'}
    </div>
    ${cat.prohibidas.length?`<div style="font-weight:700;font-size:12.5px;margin-bottom:6px;color:var(--t3)">No disponibles en "${cat.estado}"</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${cat.prohibidas.map(o=>`<span class="badge" style="background:#f8fafc;color:#94a3b8;border:1px dashed #e2e8f0">${o.nombre}</span>`).join('')}</div>`:''}
    ${cat.documentos.length?`<div style="font-size:11px;color:var(--t3)">📎 Documentos de esta etapa: ${cat.documentos.join(' · ')}</div>`:''}
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
  const motivo=prompt(`Cancelar venta de ${p?p.nombre:'cliente'} — Lote ${ap.clave_lote}\n\nEscribe el motivo de cancelación:`,'');
  if(motivo===null) return; // cancelado por el usuario
  if(!motivo.trim()){ toast('El motivo es requerido','err'); return; }
  const destino=confirm(`¿Volver el lote ${ap.clave_lote} a:\n\n✅ Aceptar → Disponible\n❌ Cancelar → Apartado`)?'Disponible':'Apartado';
  cancelarVenta(aid, motivo.trim(), destino); // solicitante puro → IANNA_OPS.ejecutar('cancelacion_venta',…)
}
