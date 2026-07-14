/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/prospectos.module.js
   Módulo Prospectos/CRM: lista, kanban, ficha, seguimientos, recordatorios.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
// ================================================================
// PROSPECTOS
// ================================================================
function renderProspectos(){ populateSelects(); filterProsp(); }

/* 1.97.5.1 — El pipeline representa OPORTUNIDADES, no Personas.
   Una misma Persona puede aparecer simultáneamente en Venta (oportunidad cerrada)
   y en Nuevo/Seguimiento/etc. (otra oportunidad activa). */
let _pipelineByKey={};
let _dragItem=null;
let _dragPrevEst=null;

function _opoEstadoAColumna(estado){
  const mapa={
    'Nueva':'Nuevo','Contactada':'Contactado','Cita agendada':'Cita agendada',
    'Visitó desarrollo':'Visitó desarrollo','Cotización enviada':'Seguimiento',
    'Negociando':'Seguimiento','En pausa':'Seguimiento'
  };
  return mapa[estado]||'Nuevo';
}
function _personaPermitida(p){ return !!p && (AUTORIZADOR.puede('ver_global') || p.asesor===CU.id); }
function _pipelineItems(){
  const personas=DS.find('prospectos').filter(_personaPermitida);
  const pmap=Object.fromEntries(personas.map(p=>[p.id,p]));
  const apartados=DS.find('apartados').filter(a=>pmap[a.prospectoId] && ['Activo','Venta'].includes(a.estatus));

  // Compatibilidad: una Persona sin Oportunidad ni Apartado recibe una oportunidad implícita.
  personas.forEach(p=>{
    const tieneOpo=(typeof IANNA_OPO!=='undefined') && IANNA_OPO.dePersona(p.id).length>0;
    const tieneOperacion=apartados.some(a=>a.prospectoId===p.id);
    if(!tieneOpo&&!tieneOperacion){ try{ IANNA_OPO.oportunidadImplicita(p.id); }catch(e){} }
  });

  const items=[];
  const vinculadas=new Set(apartados.map(a=>a.oportunidadId).filter(Boolean));
  const oportunidades=(typeof IANNA_OPO!=='undefined'?IANNA_OPO.todas():[])
    .filter(o=>pmap[o.personaId] && !['Ganada','Perdida','Cancelada'].includes(o.estado));

  oportunidades.forEach(o=>{
    const p=pmap[o.personaId];
    const key='opo:'+o.id;
    items.push({key,tipo:'oportunidad',oportunidadId:o.id,personaId:p.id,persona:p,
      estatus:_opoEstadoAColumna(o.estado),fuente:o.origen||p.fuente||'',asesor:o.asesor_asignado||p.asesor,
      presupuesto:Number(o.presupuesto||p.presupuesto||0),fecha:o.fecha_creacion||p.fechaRegistro,
      id_publico:o.id_publico||'',operacion:null});
  });

  // Los Apartados y Ventas son oportunidades operacionales inmutables en el pipeline.
  apartados.forEach(a=>{
    const p=pmap[a.prospectoId];
    const venta=a.estatus==='Venta';
    const key=(venta?'venta:':'apartado:')+a.id;
    items.push({key,tipo:venta?'venta':'apartado',oportunidadId:a.oportunidadId||null,personaId:p.id,persona:p,
      estatus:venta?'Venta':'Apartado',fuente:a.fuente||p.fuente||'',asesor:a.asesor||p.asesor,
      presupuesto:Number(a.valor_operacion||p.presupuesto||0),fecha:a.fecha_venta||a.fecha_apartado||p.fechaRegistro,
      id_publico:venta?(a.id_venta||a.id_publico||a.id):(a.id_publico||a.id),operacion:a});
  });

  _pipelineByKey=Object.fromEntries(items.map(x=>[x.key,x]));
  return items;
}
function filterProsp(){
  const q=($('s-prosp')?.value||'').toLowerCase();
  const se=$('f-est')?.value||'';
  const sa=$('f-asesor-p')?.value||'';
  const sf=$('f-fuente')?.value||'';
  let list=_pipelineItems();
  if(se&&se!=='__todos__') list=list.filter(x=>x.estatus===se);
  if(q){
    const qn=q.replace(/\s+/g,'');
    list=list.filter(x=>{
      const p=x.persona||{};
      return (p.nombre||'').toLowerCase().includes(q)||(p.telefono||'').replace(/\s+/g,'').includes(qn)||
        (p.correo||'').toLowerCase().includes(q)||(x.id_publico||'').toLowerCase().includes(q);
    });
  }
  if(sa) list=list.filter(x=>x.asesor===sa);
  if(sf) list=list.filter(x=>x.fuente===sf);
  list.sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0));
  if(PVIEW==='lista') renderListaView(list); else renderKanbanView(list);
}
function setView(m){
  PVIEW=m;
  $('view-lista').style.display=m==='lista'?'block':'none';
  $('view-kanban').style.display=m==='kanban'?'block':'none';
  $('v-lista').className='btn btn-sm '+(m==='lista'?'btn-navy':'btn-out');
  $('v-kanban').className='btn btn-sm '+(m==='kanban'?'btn-navy':'btn-out');
  filterProsp();
}
function _historialPersona(pid){
  const ventas=DS.find('apartados').filter(a=>a.prospectoId===pid&&a.estatus==='Venta');
  const opos=(typeof IANNA_OPO!=='undefined'?IANNA_OPO.dePersona(pid):[]).filter(o=>!['Ganada','Perdida','Cancelada'].includes(o.estado));
  return {ventas,opos};
}
function _badgesHistorial(pid){ const h=_historialPersona(pid); return `${h.ventas.length?`<span class="badge" style="background:#ecfdf5;color:#047857;margin-top:4px">${h.ventas.length} venta${h.ventas.length>1?'s':''}</span>`:''}${h.opos.length?`<span class="badge" style="background:#eff6ff;color:#1d4ed8;margin-top:4px;margin-left:4px">${h.opos.length} oportunidad${h.opos.length>1?'es':''}</span>`:''}`; }
function _itemSubtitulo(x){
  if(x.tipo==='venta') return `${x.id_publico||'Venta'} · ${x.operacion?.clave_lote||''}`;
  if(x.tipo==='apartado') return `${x.id_publico||'Apartado'} · ${x.operacion?.clave_lote||''}`;
  return x.id_publico||'Oportunidad';
}
function renderListaView(list){
  const tb=$('prosp-tbody');
  if(!list.length){ tb.innerHTML=`<tr><td colspan="8"><div class="empty"><div class="empty-i">👥</div><p>Sin oportunidades con estos filtros.</p></div></td></tr>`; return; }
  tb.innerHTML=list.map(x=>{const p=x.persona,a=getUser(x.asesor);return `<tr style="cursor:pointer" onclick="openDetalle('${p.id}')">
    <td><div style="font-weight:600">${p.nombre}</div><div style="font-size:11px;color:var(--t3)">${_itemSubtitulo(x)}</div><div style="font-size:11.5px;color:var(--t3)">${p.telefono||''}</div></td>
    <td style="color:var(--t2)">${x.fuente||'—'}</td>
    <td style="font-weight:500">${mxn(x.presupuesto)}</td>
    <td>${scoreBadge(p)}</td>
    <td><div style="display:flex;align-items:center;gap:6px"><div class="av" style="width:24px;height:24px;font-size:10px">${a.nombre.charAt(0)}</div>${a.nombre.split(' ')[0]}</div></td>
    <td>${sBadge(x.estatus)}</td>
    <td style="color:var(--t3);font-size:12px">${fDS(x.fecha)}</td>
    <td onclick="event.stopPropagation()"><button class="btn btn-out btn-xs" onclick="openDetalle('${p.id}')">Ver</button></td>
  </tr>`;}).join('');
}
function renderKanbanView(list){
  $('kanban-board').innerHTML=ESTATUS_ACTIVOS.map(est=>{
    const cs=list.filter(x=>x.estatus===est);
    return `<div class="k-col" ondragover="kDragOver(event)" ondrop="kDrop(event,'${est}')" data-est="${est}">
      <div class="k-hdr"><div class="k-ttl">${est}</div><div class="k-cnt">${cs.length}</div></div>
      <div class="k-cards">${cs.length===0?'<div class="k-empty">Arrastra aquí</div>':cs.map(x=>{const p=x.persona,a=getUser(x.asesor),movible=x.tipo==='oportunidad';return `<div class="k-card" ${movible?'draggable="true"':''} onclick="openDetalle('${p.id}')" ${movible?`ondragstart="kDragStart(event,'${x.key}')" ondragend="kDragEnd(event)"`:''} data-key="${x.key}">
        <div class="k-nm">${p.nombre}</div><div class="k-ph">${_itemSubtitulo(x)}</div><div class="k-ph">${p.telefono||''}</div>
        <div class="k-ft"><div style="font-size:11px;color:var(--t3)">${a.nombre.split(' ')[0]}</div>${x.tipo==='venta'?'<span class="badge" style="background:#ecfdf5;color:#047857">Histórica</span>':scoreBadge(p)}</div></div>`;}).join('')}</div>
    </div>`;
  }).join('');
}
function auditLog(tabla,id,accion,antes,despues){ DS.audit(tabla,id,accion,antes,despues); }
function kDragStart(e,key){ _dragItem=_pipelineByKey[key]||null; if(!_dragItem)return; e.currentTarget.style.opacity='.45'; e.dataTransfer.effectAllowed='move'; }
function kDragEnd(e){ e.currentTarget.style.opacity='1'; document.querySelectorAll('.k-col').forEach(c=>c.classList.remove('k-drag-over')); }
function kDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; e.currentTarget.closest('.k-col')?.classList.add('k-drag-over'); }
function kDrop(e,nuevoEst){
  e.preventDefault();
  document.querySelectorAll('.k-col').forEach(c=>c.classList.remove('k-drag-over','k-drag-over-cita','k-drag-over-apt','k-drag-over-seg'));
  const x=_dragItem; if(!x||x.tipo!=='oportunidad')return;
  if(x.estatus===nuevoEst){_dragItem=null;return;}
  _dragPrevEst=x.estatus;
  if(nuevoEst==='Cita agendada'){
    const d=new Date();d.setDate(d.getDate()+1);$('kc-fecha').value=d.toISOString().split('T')[0];$('kc-hora').value='10:00';$('kc-nota').value='';openM('m-kanban-cita');return;
  }
  if(nuevoEst==='Apartado'){
    openApartadoFlow();setTimeout(()=>{if($('ap-cli'))$('ap-cli').value=x.personaId;fillAsesor();},100);return;
  }
  if(nuevoEst==='Seguimiento'){
    const d=new Date();d.setDate(d.getDate()+3);$('ks-fecha').value=d.toISOString().split('T')[0];$('ks-hora').value='10:00';$('ks-nota').value='';openM('m-kanban-seg');return;
  }
  if(nuevoEst==='Venta'){toast('La Venta solo nace de confirmar el contrato firmado.','err');_dragItem=null;filterProsp();return;}
  doKanbanMove(x,nuevoEst);
}
function cancelKanbanAction(){ _dragItem=null;_dragPrevEst=null;$$('.mbd.open').forEach(m=>m.classList.remove('open'));filterProsp(); }
function confirmKanbanCita(){
  const fecha=$('kc-fecha').value,x=_dragItem;if(!fecha){toast('Selecciona una fecha','err');return;}if(!x)return;
  doKanbanMove(x,'Cita agendada');recordatoriosService.crear({prospectoId:x.personaId,tipo:'Cita agendada',fecha,hora:$('kc-hora').value,nota:$('kc-nota').value.trim()||'Cita en desarrollo',estado:'pendiente',usuario:CU.id});
  closeM('m-kanban-cita');_dragItem=null;_dragPrevEst=null;toast('Cita agendada y recordatorio creado ✓','ok');
}
function confirmKanbanSeg(){
  const fecha=$('ks-fecha').value,x=_dragItem;if(!fecha){toast('Selecciona una fecha','err');return;}if(!x)return;
  doKanbanMove(x,'Seguimiento');recordatoriosService.crear({prospectoId:x.personaId,tipo:'Seguimiento WhatsApp',fecha,hora:$('ks-hora').value,nota:$('ks-nota').value.trim()||'Seguimiento por WhatsApp',estado:'pendiente',usuario:CU.id});
  closeM('m-kanban-seg');_dragItem=null;_dragPrevEst=null;toast('Movido a Seguimiento — recordatorio creado ✓','ok');
}
function doKanbanMove(x,nuevoEst){
  const estadoOpo=IANNA_OPO.MAPA_COMPAT[nuevoEst]||nuevoEst;
  const r=IANNA_OPO.transicionar(x.oportunidadId,estadoOpo,`Kanban: ${x.estatus} → ${nuevoEst}`);
  if(!r.ok){toast(r.error,'err');return;}
  // Campo legacy de Persona: solo refleja la oportunidad activa más reciente; no gobierna Ventas históricas.
  try{ prospectosService.actualizar(x.personaId,{estatus:nuevoEst}); }catch(e){}
  try{ seguimientosService.crear({prospectoId:x.personaId,tipo:'Nota interna',nota:`Oportunidad ${x.id_publico}: ${x.estatus} → ${nuevoEst}`,fecha:new Date().toISOString(),usuario:CU.id,estatusCambio:nuevoEst}); }catch(e){}
  _dragItem=null;filterProsp();updateBell();
}
function openProspectoModal(editId=null){
  populateSelects();
  $('mp-ttl').textContent=editId?'Editar Prospecto':'Nuevo Prospecto';
  $('mp-id').value=editId||'';
  if(editId){
    const p=DS.findOne('prospectos',editId);
    $('mp-nm').value=p.nombre; $('mp-ph').value=p.telefono; $('mp-em').value=p.correo||'';
    $('mp-fue').value=p.fuente||'Facebook'; $('mp-ec').value=p.estadoCivil||'Soltero'; onFuenteChange(); if(p.brokerId) setTimeout(()=>$('mp-broker').value=p.brokerId,50);
    $('mp-pre').value=moneyInputVal(p.presupuesto); $('mp-eng').value=moneyInputVal(p.enganche); $('mp-ing').value=moneyInputVal(p.ingresos);
    $('mp-est').value=p.estatus; $('mp-ases').value=p.asesor||''; $('mp-com').value=p.comentarios||'';
    $('mp-ases-wrap').style.display='';
  } else {
    ['mp-nm','mp-ph','mp-em','mp-pre','mp-eng','mp-ing','mp-com'].forEach(f=>$(f).value='');
    $('mp-fue').value='Facebook'; $('mp-ec').value='Soltero'; $('mp-est').value='Nuevo'; $('mp-broker-wrap').style.display='none';
    if(!AUTORIZADOR.puede('capturar_para_otros')){ $('mp-ases').value=CU.id; $('mp-ases-wrap').style.display='none'; }
    else $('mp-ases-wrap').style.display='';
  }
  openM('m-prosp');
}
function saveProspecto(){
  const nm=$('mp-nm').value.trim(), ph=$('mp-ph').value.trim();
  if(!nm||!ph){ toast('Nombre y teléfono son requeridos','err'); return; }
  const pid=$('mp-id').value;
  const estatusSolicitado=$('mp-est').value;
  const data={nombre:nm,telefono:fmtTelVal(ph),correo:$('mp-em').value.trim(),fuente:$('mp-fue').value,estadoCivil:$('mp-ec').value,presupuesto:parseMoneyInput($('mp-pre').value),enganche:parseMoneyInput($('mp-eng').value),ingresos:parseMoneyInput($('mp-ing').value),asesor:!AUTORIZADOR.puede('capturar_para_otros')?CU.id:$('mp-ases').value,comentarios:$('mp-com').value.trim(),brokerId:$('mp-fue').value==='Broker'?$('mp-broker').value:null};
  // ── MOTOR: cliente único — jamás dos expedientes para la misma persona ──
  const valDup=IANNA_MOTOR.validarProspectoUnico({telefono:data.telefono, correo:data.correo, editId:pid||undefined});
  if(!valDup.ok){ IANNA_MOTOR.bloquear('prospectos', valDup.dup.id, 'CREAR_PROSPECTO_DUPLICADO', valDup.errores.join(' ')); return; }
  if(pid){
    const antesP=prospectosService.obtener(pid)||{};
    prospectosService.actualizar(pid,data);
    IANNA_MOTOR.auditar('prospectos', pid, 'EDITAR_PROSPECTO', {nombre:antesP.nombre, telefono:antesP.telefono}, {nombre:data.nombre, telefono:data.telefono}, 'Edición de expediente');
    // 1.95: si el estatus cambió, se solicita al Pipeline (misma ruta que kanban/ficha)
    if(estatusSolicitado && estatusSolicitado!==antesP.estatus){
      const r=IANNA_PIPELINE.solicitarEstatus(pid, estatusSolicitado, 'Edición de ficha');
      if(!r.ok) toast(r.error,'err');
    }
    toast('Prospecto actualizado ✓','ok');
  }
  else {
    // Alta: el estatus inicial es un dato de nacimiento (no una transición) — solo CRM válidos
    data.estatus=ESTATUS_CRM.includes(estatusSolicitado)?estatusSolicitado:'Nuevo';
    data.fechaRegistro=new Date().toISOString(); prospectosService.crear(data); IANNA_MOTOR.auditar('prospectos', data.telefono, 'CREAR_PROSPECTO', {}, {nombre:data.nombre, telefono:data.telefono}, 'Alta de prospecto'); toast('Prospecto registrado ✓','ok'); }
  closeM('m-prosp'); filterProsp(); renderDashboard(); updateBell();
}
function onFuenteChange(){
  const isBroker=$('mp-fue').value==='Broker';
  $('mp-broker-wrap').style.display=isBroker?'':'none';
}
function editProspecto(id){ closeM('m-det'); setTimeout(()=>openProspectoModal(id),150); }
function eliminarProspecto(pid){
  if(!pid) return;
  if(!AUTORIZADOR.autorizar('eliminar_prospecto',{registroId:pid}).ok) return;
  const p=DS.findOne('prospectos',pid);
  // ── MOTOR: eliminaciones protegidas — la información histórica NO se borra ──
  const chk=IANNA_MOTOR.puedeEliminarProspecto(pid);
  if(chk.bloqueado){
    const op=chk.activas[0];
    toast(`Este expediente tiene una Operación activa${op?.id_publico?' '+op.id_publico:''}. Resuelve primero la operación mediante el flujo correspondiente.`,'err',7000);
    return;
  }
  if(!chk.fisico){
    const r=chk.relaciones;
    const det=[r.apartados?`${r.apartados} apartado(s)/venta(s)`:null, r.seguimientos?`${r.seguimientos} seguimiento(s)`:null, r.cotizaciones?`${r.cotizaciones} cotización(es)`:null].filter(Boolean).join(', ');
    if(!confirm(`"${p?.nombre}" tiene historial (${det}).

No se eliminará: el expediente se ARCHIVARÁ y conservará su historial.

¿Archivar expediente?`)) return;
    prospectosService.actualizar(pid,{estatus:'Inactivo', archivado:true, archivado_fecha:new Date().toISOString(), archivado_usuario:CU.id});
    IANNA_MOTOR.auditar('prospectos', pid, 'ARCHIVAR_EXPEDIENTE', {estatus:p?.estatus}, {estatus:'Inactivo', relaciones:det}, 'Expediente con historial, sin operación activa');
    closeM('m-det'); filterProsp(); renderDashboard();
    toast(`Expediente de "${p?.nombre}" archivado ✓`,'warn');
    return;
  }
  if(!confirm(`¿Eliminar a "${p?.nombre}" permanentemente? (No tiene historial relacionado.)`)) return;
  prospectosService.eliminar(pid);
  IANNA_MOTOR.auditar('prospectos', pid, 'ELIMINAR_PROSPECTO', {nombre:p?.nombre}, {}, 'Eliminación física: expediente sin relaciones');
  closeM('m-det'); filterProsp(); renderDashboard();

  toast('Prospecto eliminado','warn');
}
function openDetalle(pid){
  CU_PID=pid;
  const p=DS.findOne('prospectos',pid); if(!p) return;
  $('det-nm').textContent=p.nombre;
  $('det-meta').textContent=`📅 ${fD(p.fechaRegistro)} · ${p.fuente||'—'} · Score ${calcScore(p)}/100`;
  const t=(p.telefono||'').replace(/\D/g,'');
  $('det-wa').href=`https://wa.me/52${t}?text=Hola%20${encodeURIComponent(p.nombre.split(' ')[0])}%2C%20le%20contactamos%20de%20Valle%20de%20Arag%C3%B3n.`;
  // Mostrar botón eliminar solo a gerente
  $$('.nav-admin').forEach(el=>{ if(el.id==='as-del-btn') el.style.display=AUTORIZADOR.puede('eliminar_prospecto')?'inline-flex':'none'; });
  const a=getUser(p.asesor);
  const brokerRow=p.brokerId?[['Broker',DS.findOne('brokers',p.brokerId)?.nombre||'—']]:[];
  $('det-info').innerHTML='<div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Ficha del prospecto</div>'+[['Teléfono',p.telefono],['Correo',p.correo||'—'],['Fuente',p.fuente||'—'],...brokerRow,['Estado civil',p.estadoCivil||'—'],['Presupuesto',mxn(p.presupuesto)],['Enganche',mxn(p.enganche)],['Ingresos/mes',mxn(p.ingresos)],['Asesor',a.nombre],['Estatus',sBadge(p.estatus)],['Score',scoreBadge(p)]].map(r=>`<div class="ir"><span class="il">${r[0]}</span><span class="iv">${r[1]}</span></div>`).join('');
  // Comentarios visibles directamente
  $('det-coment-txt').textContent=p.comentarios||'Sin comentarios registrados.';
  $('det-coment-card').style.display=p.comentarios?'block':'block';
  // Botones de estatus
  // 1.95: 'Apartado'/'Venta' son estados de la OPERACIÓN — se muestran, jamás se asignan a mano
  const esOper=ESTATUS_OPERACION.includes(p.estatus);
  const opsPrev=DS.find('apartados').filter(a=>a.prospectoId===pid&&a.estatus==='Venta');
  const opos=typeof IANNA_OPO!=='undefined'?IANNA_OPO.dePersona(pid):[];
  const puedeNuevaCompra=opsPrev.length>0;
  $('det-est-btns').innerHTML=(esOper?`<span class="badge" style="background:#1E3D0F;color:#fff;margin-right:6px">${p.estatus} — operación actual protegida</span>`:'')
    +(puedeNuevaCompra?`<button class="btn btn-gold btn-xs" onclick="crearNuevaOportunidadPersona('${pid}')">+ Nueva oportunidad</button>`:'')
    +(!esOper?ESTATUS_CRM.concat(ESTATUS_INACTIVOS).map(s=>`<button class="btn btn-xs ${p.estatus===s?'btn-navy':'btn-out'}" onclick="cambiarEstatus('${pid}','${s}')">${s}</button>`).join(''):'');
  if(opsPrev.length||opos.length){
    const ventasHtml=opsPrev.length?`<div style="margin-top:8px"><b style="font-size:11px">VENTAS (histórico fijo)</b>${opsPrev.map(v=>`<div style="margin-top:5px;padding:7px;border:1px solid var(--bd);border-radius:8px;background:#f8fafc;font-size:11.5px"><b>${v.id_venta||v.id_publico||v.id}</b> · ${ubicacionLote(v.clave_lote)} · ${v.modelo_nombre||''}<br><span style="color:var(--t3)">${fD(v.fecha_venta||v.fecha_apartado)} · ${mxn(v.valor_operacion||0)}</span></div>`).join('')}</div>`:'';
    const oposAct=opos.filter(o=>!['Ganada','Perdida','Cancelada'].includes(o.estado));
    $('det-info').innerHTML+=`<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)"><b style="font-size:11px">HISTORIAL COMERCIAL</b><div style="font-size:11.5px;color:var(--t2);margin-top:5px">${opsPrev.length} venta(s) histórica(s) · ${oposAct.length} oportunidad(es) activa(s)</div>${ventasHtml}</div>`;
  }
  renderTimeline(pid);
  renderDocsProspecto(pid);
  $$('#m-det .tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  $$('#m-det .tp').forEach((t,i)=>t.classList.toggle('active',i===0));
  $('rec-fecha').value=new Date().toISOString().split('T')[0];
  openM('m-det');
}
function crearNuevaOportunidadPersona(pid){
  const p=DS.findOne('prospectos',pid); if(!p)return;
  const fuente=prompt('Fuente de la nueva oportunidad:', 'Recompra')||'Recompra';
  const o=IANNA_OPO.crear({personaId:pid,proyectoId:'valle-de-aragon',estado:'Nueva',origen:fuente,asesor_asignado:p.asesor,broker_id:null,_motivo:'Nueva compra de cliente existente'});
  // compatibilidad UI: la Persona vuelve al pipeline sin alterar ventas históricas
  prospectosService.actualizar(pid,{estatus:'Nuevo', oportunidad_activa_id:o.id, oportunidad_activa_publica:o.id_publico, tiene_ventas_historicas:true, ventas_historicas_count:_historialPersona(pid).ventas.length});
  try{IANNA_MOTOR.auditar('oportunidades',o.id,'NUEVA_OPORTUNIDAD_RECOMPRA',{}, {personaId:pid,id_publico:o.id_publico,origen:fuente},'Cliente existente inicia nueva oportunidad');}catch(e){}
  toast('Nueva oportunidad creada: '+o.id_publico+'. La venta anterior permanece en Ventas históricas.','ok',5000); closeM('m-det'); filterProsp(); renderVentasHistoricas(); renderDashboard();
}

function renderTimeline(pid){
  const p=DS.findOne('prospectos',pid); if(!p) return;
  const segs=DS.find('seguimientos',{prospectoId:pid}).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
  const recs=DS.find('recordatorios',{prospectoId:pid});
  const ICO={Llamada:'📞',WhatsApp:'📱','Visita al desarrollo':'🏠',Email:'📧','Nota interna':'📝',Registro:'✨'};
  const BG={Llamada:'#eff6ff',WhatsApp:'#f0fdf4','Visita al desarrollo':'#fff7ed',Email:'#fdf4ff','Nota interna':'#f8fafc',Registro:'#fdf3e3'};
  const items=[{tipo:'Registro',nota:p.comentarios||'Prospecto registrado',fecha:p.fechaRegistro,usuario:p.asesor},...segs];
  $('det-tl').innerHTML=items.map(s=>`<div class="tl-i"><div class="tl-ico" style="background:${BG[s.tipo]||'#f8fafc'}">${ICO[s.tipo]||'📌'}</div><div class="tl-b"><div class="tl-h"><div class="tl-lbl">${s.tipo}${s.estatusCambio?` → ${sBadge(s.estatusCambio)}`:''}</div><div class="tl-dt">${fD(s.fecha)} · ${getUser(s.usuario).nombre.split(' ')[0]}</div></div><div class="tl-note">${s.nota||''}</div></div></div>`).join('')
  +(recs.length?`<div style="margin-top:14px;padding-top:14px;border-top:1px dashed var(--bd)"><div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">Recordatorios</div>${recs.map(r=>`<div class="ali ${r.estado==='completado'?'info':'warn'}" style="margin-bottom:6px"><div style="font-size:15px">${r.estado==='completado'?'✅':'🔔'}</div><div><div class="al-ttl">${r.tipo}</div><div class="al-sub">${fD(r.fecha)} ${r.hora||''} · ${r.nota||''}</div></div>${r.estado==='pendiente'?`<button class="btn btn-xs btn-out" style="margin-left:auto;flex-shrink:0" onclick="completarRec('${r.id}')">✓</button>`:''}</div>`).join('')}</div>`:'');
}
function cambiarEstatus(pid,est){
  // 1.95 (Etapa 2): ficha y kanban comparten EXACTAMENTE el mismo flujo.
  const r=IANNA_PIPELINE.solicitarEstatus(pid, est, 'Ficha');
  if(!r.ok){ toast(r.error,'err'); return; }
  if(r.advertencia) toast(r.advertencia,'warn');
  openDetalle(pid); filterProsp(); toast('Estatus actualizado ✓','ok');
}
function saveSeg(){
  const nota=$('seg-nota').value.trim(); if(!nota){ toast('Escribe una descripción','err'); return; }
  const est=$('seg-est').value;
  seguimientosService.crear({prospectoId:CU_PID,tipo:$('seg-tipo').value,nota,fecha:new Date().toISOString(),usuario:CU.id,estatusCambio:null});
  if(est){
    const r=IANNA_PIPELINE.solicitarEstatus(CU_PID, est, 'Seguimiento');
    if(!r.ok) toast(r.error,'err');
  }
  $('seg-nota').value=''; renderTimeline(CU_PID); openDetalle(CU_PID); toast('Seguimiento registrado ✓','ok');
}
function saveRec(){
  const fecha=$('rec-fecha').value; if(!fecha){ toast('Selecciona una fecha','err'); return; }
  recordatoriosService.crear({prospectoId:CU_PID,tipo:$('rec-tipo').value,fecha,hora:$('rec-hora').value,nota:$('rec-nota').value.trim(),estado:'pendiente',usuario:CU.id});
  renderTimeline(CU_PID); updateBell(); toast('Recordatorio creado ✓','ok');
}
function completarRec(rid){ recordatoriosService.actualizar(rid,{estado:'completado'}); renderTimeline(CU_PID); updateBell(); toast('Completado ✓','ok'); }
function detTab(btn,pane){
  $$('#m-det .tab').forEach(t=>t.classList.remove('active'));
  $$('#m-det .tp').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active'); $(pane).classList.add('active');
}
