/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/ingresos.module.js
   Fase 1.97.6 · Comisiones, hitos y cortes de pago
   ────────────────────────────────────────────────────────────────
   Una línea cambia a ELEGIBLE únicamente cuando se cumple el hito
   de la Venta. Después puede integrarse a un corte y marcarse pagada.
   ════════════════════════════════════════════════════════════════ */
function renderIngresos(){
  const isAdmin=AUTORIZADOR.puede('ver_comisiones_equipo');
  const period=$('ing-periodo')?.value||'todo', filtroAsesor=$('ing-asesor')?.value||'';
  let ventas=apartadosService.listar({estatus:'Venta'});
  ventas.forEach(v=>{try{IANNA_COM_CICLO.prepararVenta(v);}catch(e){}});
  if(!isAdmin) ventas=ventas.filter(v=>v.asesor===CU.id);
  else if(filtroAsesor) ventas=ventas.filter(v=>v.asesor===filtroAsesor);
  const now=new Date();
  if(period==='mes') ventas=ventas.filter(v=>{const d=new Date(v.fecha_venta||v.fecha_apartado||0);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  if(period==='año') ventas=ventas.filter(v=>new Date(v.fecha_venta||v.fecha_apartado||0).getFullYear()===now.getFullYear());
  const ventaIds=new Set(ventas.map(v=>v.id));
  let lineas=comisionesNominaService.lineas().filter(l=>ventaIds.has(l.operacion_id)&&l.estado!=='cancelada');
  if(!isAdmin) lineas=lineas.filter(l=>l.beneficiario_id===CU.id||(!l.beneficiario_id&&l.rol==='asesor'));
  const total=xs=>xs.reduce((s,x)=>s+Number(x.monto||0),0);
  const generado=total(lineas), pendienteHito=total(lineas.filter(x=>x.estado==='pendiente_hito')),
        elegible=total(lineas.filter(x=>x.estado==='elegible')), enCorte=total(lineas.filter(x=>x.estado==='en_corte')),
        pagado=total(lineas.filter(x=>x.estado==='pagada'));
  const facturado=ventas.reduce((s,v)=>s+Number(v.financial_snapshot?.valor_total_vivienda||v.valor_operacion||0),0);
  const cont=$('ing-cont'); if(!cont)return;
  cont.innerHTML=`${isAdmin?renderNominaComisionesPanel():''}
    <div class="commission-kpis" style="display:grid;grid-template-columns:repeat(5,minmax(145px,1fr));gap:10px;margin-bottom:16px">
      ${_kpiCom(isAdmin?'Facturación del equipo':'Has vendido',facturado,'#1e3d0f')}
      ${_kpiCom('Comisión generada',generado,'#c9963c')}
      ${_kpiCom('Pendiente de hito',pendienteHito,'#64748b')}
      ${_kpiCom('Elegible / por cortar',elegible,'#047857')}
      ${_kpiCom('Pagada',pagado,'#1d4ed8')}
    </div>
    <div class="card" style="overflow:hidden">
      <div style="padding:13px 16px;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;gap:10px"><div><b>Detalle por Venta</b><div style="font-size:11px;color:var(--t3)">Pendiente de hito → Elegible → En corte → Pagada</div></div><span class="badge" style="background:#f8fafc;color:#475569">${IANNA_FMT.MXN(enCorte)} en cortes</span></div>
      ${ventas.length?ventas.map(v=>renderVentaComisiones(v,lineas,isAdmin)).join(''):'<div class="empty"><div class="empty-i">💰</div><p>Sin ventas en este periodo.</p></div>'}
    </div>`;
}
function _kpiCom(lbl,val,color){return `<div class="card" style="padding:14px;border-top:4px solid ${color}"><div style="font-size:10.5px;text-transform:uppercase;color:var(--t3);font-weight:700">${lbl}</div><div style="font-size:21px;font-weight:800;margin-top:5px">${IANNA_FMT.MXN(val)}</div></div>`;}
function _badgeComEstado(e){const m={pendiente_hito:['Pendiente de hito','#f1f5f9','#64748b'],elegible:['Elegible','#ecfdf5','#047857'],en_corte:['En corte','#fff7ed','#c2410c'],pagada:['Pagada','#eff6ff','#1d4ed8'],ajustada:['Ajustada','#f5f3ff','#6d28d9']};const x=m[e]||[e,'#f8fafc','#475569'];return `<span class="badge" style="background:${x[1]};color:${x[2]}">${x[0]}</span>`;}
function renderVentaComisiones(v,lineas,isAdmin){
  const p=prospectosService.obtener(v.prospectoId)||{}, l=getLote(v.clave_lote)||{}, r=IANNA_COM_CICLO.resumen(v.id);
  const ls=lineas.filter(x=>x.operacion_id===v.id);
  const grupos={}; ls.forEach(x=>{const k=x.rol+':'+(x.beneficiario_id||x.beneficiario||'');(grupos[k]||(grupos[k]={rol:x.rol,nombre:x.beneficiario||x.rol,lineas:[]})).lineas.push(x);});
  return `<div style="padding:14px 16px;border-bottom:1px solid var(--bd2)">
    <div style="display:grid;grid-template-columns:1.5fr .8fr .9fr auto;gap:12px;align-items:start"><div><b>${p.nombre||'Cliente'}</b><div style="font-size:10.5px;color:var(--t3)">${v.id_venta||v.id_publico} · ${l.clave_fisica||ubicacionLote(v.clave_lote)}</div></div><div><small>Esquema</small><div style="font-size:11.5px">${r.ok?r.snapshot.esquema_nombre:'—'}</div></div><div><small>Fuente</small><div style="font-size:11.5px">${r.ok?(r.snapshot.fuente_nombre||r.snapshot.canal):'—'}</div></div><button class="btn btn-out btn-xs" onclick="abrirOperaciones('${v.id}')">Ver hitos</button></div>
    <div style="margin-top:9px;display:grid;gap:7px">${Object.values(grupos).length?Object.values(grupos).map(g=>`<div style="background:#f8fafc;border-radius:8px;padding:9px"><div style="font-weight:700;font-size:11.5px;text-transform:capitalize">${g.nombre} · ${g.rol}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:6px;margin-top:6px">${g.lineas.map(x=>`<div style="background:#fff;border:1px solid var(--bd2);border-radius:7px;padding:7px"><div style="display:flex;justify-content:space-between;gap:6px"><span>${x.parte_nombre}</span><b>${IANNA_FMT.MXN(x.monto)}</b></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px"><small>${IANNA_FMT.PCT(x.porcentaje_venta)}</small>${_badgeComEstado(x.estado)}</div></div>`).join('')}</div></div>`).join(''):'<div style="font-size:11px;color:var(--t3)">Sin líneas de comisión para esta vista.</div>'}</div>
  </div>`;
}

function renderNominaComisionesPanel(){
  const elegibles=comisionesNominaService.lineas({estado:'elegible'}), cortes=comisionesNominaService.cortes().slice().sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  const total=xs=>xs.reduce((s,x)=>s+Number(x.monto||0),0);
  const porBenef={}; elegibles.forEach(x=>{const k=x.beneficiario_id||x.beneficiario;(porBenef[k]||(porBenef[k]={nombre:x.beneficiario||'Beneficiario',monto:0,n:0}));porBenef[k].monto+=Number(x.monto||0);porBenef[k].n++;});
  return `<div class="card" style="margin-bottom:14px;border-left:5px solid var(--gold);padding:14px">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>Cortes de comisiones</b><div style="font-size:11px;color:var(--t3)">Solo las líneas cuyo hito ya se cumplió pueden incorporarse a un corte.</div></div><button class="btn btn-gold btn-sm" ${elegibles.length?'':'disabled'} onclick="crearCorteComisiones()">Crear corte seleccionado</button></div>
    <div style="display:grid;grid-template-columns:1.3fr .7fr;gap:12px;margin-top:12px">
      <div><div style="font-size:11px;font-weight:700;margin-bottom:6px">Líneas elegibles (${elegibles.length})</div><div style="max-height:230px;overflow:auto;border:1px solid var(--bd2);border-radius:8px">${elegibles.length?elegibles.map(x=>`<label style="display:grid;grid-template-columns:22px 1fr auto;gap:7px;align-items:center;padding:8px;border-bottom:1px solid var(--bd2);cursor:pointer"><input type="checkbox" class="nom-linea-check" value="${x.id}" checked><span><b>${x.beneficiario}</b><small style="display:block;color:var(--t3)">${x.venta_id} · ${x.parte_nombre}</small></span><b>${IANNA_FMT.MXN(x.monto)}</b></label>`).join(''):'<div style="padding:18px;color:var(--t3);text-align:center">Sin comisiones elegibles.</div>'}</div></div>
      <div><div style="font-size:11px;font-weight:700;margin-bottom:6px">Por beneficiario</div>${Object.values(porBenef).map(x=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd2)"><span>${x.nombre}<small style="display:block;color:var(--t3)">${x.n} línea(s)</small></span><b>${IANNA_FMT.MXN(x.monto)}</b></div>`).join('')||'<div style="color:var(--t3);font-size:11px">—</div>'}</div>
    </div>
    <div style="font-size:11px;font-weight:700;margin-top:12px">Cortes recientes</div>${cortes.slice(0,5).map(c=>`<div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--bd2)"><span><b>${c.id_publico}</b><small style="display:block;color:var(--t3)">${c.estado} · ${fD(c.fecha)}</small></span><b>${IANNA_FMT.MXN(c.total)}</b><span>${c.estado==='borrador'?`<button class="btn btn-gold btn-xs" onclick="pagarCorteComisiones('${c.id}')">Marcar pagado</button> <button class="btn btn-out btn-xs" onclick="cancelarCorteComisiones('${c.id}')">Cancelar</button>`:_badgeComEstado(c.estado==='pagado'?'pagada':c.estado)}</span></div>`).join('')||'<div style="font-size:11px;color:var(--t3);padding-top:6px">Sin cortes registrados.</div>'}
  </div>`;
}
function crearCorteComisiones(){
  const ids=[...document.querySelectorAll('.nom-linea-check:checked')].map(x=>x.value); if(!ids.length){toast('Selecciona al menos una línea elegible','warn');return;}
  const inicio=prompt('Inicio del periodo (AAAA-MM-DD):',new Date().toISOString().slice(0,8)+'01'); if(inicio===null)return;
  const fin=prompt('Fin del periodo (AAAA-MM-DD):',new Date().toISOString().slice(0,10)); if(fin===null)return;
  const r=IANNA_COM_CICLO.crearCorte(ids,{periodo_inicio:inicio,periodo_fin:fin}); if(!r.ok){toast(r.error||r.justificacion,'err');return;} toast('Corte creado: '+r.corte.id_publico,'ok');renderIngresos();
}
function pagarCorteComisiones(id){
  const metodo=prompt('Método de pago del corte:','Transferencia electrónica');if(metodo===null)return;
  const referencia=prompt('Referencia / folio bancario (opcional):','')||'';
  const r=IANNA_COM_CICLO.pagarCorte(id,{metodo,referencia});if(!r.ok){toast(r.error||r.justificacion,'err');return;}toast('Corte marcado como pagado ✓','ok');renderIngresos();
}
function cancelarCorteComisiones(id){const motivo=prompt('Motivo de cancelación del corte:','');if(motivo===null)return;const r=IANNA_COM_CICLO.cancelarCorte(id,motivo);if(!r.ok){toast(r.error||r.justificacion,'err');return;}toast('Corte cancelado; las líneas regresaron a Elegible.','warn');renderIngresos();}
// Compatibilidad: las comisiones ya no se liberan con el antiguo botón Cobrar.
function cobrarComisionParte(ventaId,parteKey,quien){toast('La comisión se vuelve elegible al cumplir su hito dentro de la Venta.','warn',5000);abrirOperaciones(ventaId);}
function cobrarComision(ventaId,parte,quien){return cobrarComisionParte(ventaId,String(parte),quien);}
