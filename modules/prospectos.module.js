/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/prospectos.module.js
   Módulo Prospectos/CRM: lista, kanban, ficha, seguimientos, recordatorios.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
// ================================================================
// PROSPECTOS
// ================================================================
function renderProspectos(){ populateSelects(); filterProsp(); }
function filterProsp(){
  const q=($('s-prosp')?.value||'').toLowerCase();
  const se=$('f-est')?.value||'';
  const sa=$('f-asesor-p')?.value||'';
  const sf=$('f-fuente')?.value||'';
  let list=AUTORIZADOR.puede('ver_global')?DS.find('prospectos'):DS.find('prospectos',{asesor:CU.id});
  // Filtro por estatus
  if(se==='__todos__'){
    // mostrar todos sin filtro
  } else if(se!==''){
    list=list.filter(p=>p.estatus===se);
  } else {
    // Vista default: solo activos
    list=list.filter(p=>!ESTATUS_INACTIVOS.includes(p.estatus));
  }
  if(q){
    const qNorm=q.replace(/\s+/g,'');
    list=list.filter(p=>p.nombre.toLowerCase().includes(q)||(p.telefono||'').replace(/\s+/g,'').includes(qNorm)||(p.correo||'').toLowerCase().includes(q));
  }
  if(sa) list=list.filter(p=>p.asesor===sa);
  if(sf) list=list.filter(p=>p.fuente===sf);
  list.sort((a,b)=>new Date(b.fechaRegistro)-new Date(a.fechaRegistro));
  if(PVIEW==='lista') renderListaView(list);
  else renderKanbanView(list);
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
function renderListaView(list){
  const tb=$('prosp-tbody');
  if(!list.length){ tb.innerHTML=`<tr><td colspan="8"><div class="empty"><div class="empty-i">👥</div><p>Sin prospectos con estos filtros.</p></div></td></tr>`; return; }
  tb.innerHTML=list.map(p=>{const a=getUser(p.asesor);return `<tr style="cursor:pointer" onclick="openDetalle('${p.id}')">
    <td><div style="font-weight:600">${p.nombre}</div><div style="font-size:11.5px;color:var(--t3)">${p.telefono}</div><div>${_badgesHistorial(p.id)}</div></td>
    <td style="color:var(--t2)">${p.fuente||'—'}</td>
    <td style="font-weight:500">${mxn(p.presupuesto)}</td>
    <td>${scoreBadge(p)}</td>
    <td><div style="display:flex;align-items:center;gap:6px"><div class="av" style="width:24px;height:24px;font-size:10px">${a.nombre.charAt(0)}</div>${a.nombre.split(' ')[0]}</div></td>
    <td>${sBadge(p.estatus)}</td>
    <td style="color:var(--t3);font-size:12px">${fDS(p.fechaRegistro)}</td>
    <td onclick="event.stopPropagation()"><button class="btn btn-out btn-xs" onclick="openDetalle('${p.id}')">Ver</button></td>
  </tr>`;}).join('');
}
function renderKanbanView(list){
  $('kanban-board').innerHTML=ESTATUS_ACTIVOS.map(est=>{
    const cs=list.filter(p=>p.estatus===est);
    return `<div class="k-col" ondragover="kDragOver(event)" ondrop="kDrop(event,'${est}')" data-est="${est}">
      <div class="k-hdr"><div class="k-ttl">${est}</div><div class="k-cnt">${cs.length}</div></div>
      <div class="k-cards">${cs.length===0?'<div class="k-empty">Arrastra aquí</div>':cs.map(p=>{const a=getUser(p.asesor);return `<div class="k-card" draggable="true" onclick="openDetalle('${p.id}')" ondragstart="kDragStart(event,'${p.id}')" ondragend="kDragEnd(event)" data-pid="${p.id}"><div class="k-nm">${p.nombre}</div><div class="k-ph">${p.telefono}</div><div>${_badgesHistorial(p.id)}</div><div class="k-ft"><div style="font-size:11px;color:var(--t3)">${a.nombre.split(' ')[0]}</div>${scoreBadge(p)}</div></div>`;}).join('')}</div>
    </div>`;
  }).join('');
}
function auditLog(tabla,id,accion,antes,despues){ DS.audit(tabla,id,accion,antes,despues); }
let _dragPid=null;
function kDragStart(e,pid){ _dragPid=pid; e.currentTarget.style.opacity='.45'; e.dataTransfer.effectAllowed='move'; }
function kDragEnd(e){ e.currentTarget.style.opacity='1'; document.querySelectorAll('.k-col').forEach(c=>c.classList.remove('k-drag-over')); }
function kDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; e.currentTarget.closest('.k-col')?.classList.add('k-drag-over'); }
function kDrop(e,nuevoEst){
  e.preventDefault();
  document.querySelectorAll('.k-col').forEach(c=>c.classList.remove('k-drag-over','k-drag-over-cita','k-drag-over-apt','k-drag-over-seg'));
  if(!_dragPid) return;
  const p=DS.findOne('prospectos',_dragPid);
  if(!p||p.estatus===nuevoEst){ _dragPid=null; return; }
  _dragPrevEst=p.estatus; // store previous for cancel

  if(nuevoEst==='Cita agendada'){
    // Show cita modal
    const d=new Date(); d.setDate(d.getDate()+1);
    $('kc-fecha').value=d.toISOString().split('T')[0];
    $('kc-hora').value='10:00'; $('kc-nota').value='';
    openM('m-kanban-cita'); return;
  }
  if(nuevoEst==='Apartado'){
    // Must create apartado — open flow, cancel = revert
    openApartadoFlow();
    // Auto-select this prospecto in the apartado modal
    setTimeout(()=>{ if($('ap-cli')) $('ap-cli').value=_dragPid; fillAsesor(); },100);
    return;
  }
  if(nuevoEst==='Seguimiento'){
    const d=new Date(); d.setDate(d.getDate()+3);
    $('ks-fecha').value=d.toISOString().split('T')[0];
    $('ks-hora').value='10:00'; $('ks-nota').value='';
    openM('m-kanban-seg'); return;
  }
  if(nuevoEst==='Venta'){
    // 1.95: una venta jamás se fabrica arrastrando — lo impide la Máquina de Estados
    const r=IANNA_PIPELINE.solicitarEstatus(_dragPid,'Venta','Kanban');
    toast(r.error||'Movimiento no permitido','err');
    _dragPid=null; filterProsp(); return;
  }
  // Default: solicitar el cambio al Pipeline (flujo único kanban ≡ ficha)
  doKanbanMove(_dragPid, nuevoEst, p.estatus);
}
let _dragPrevEst=null;
function cancelKanbanAction(){
  // Revert the kanban drag — no state change
  _dragPid=null; _dragPrevEst=null;
  $$('.mbd.open').forEach(m=>m.classList.remove('open'));
  filterProsp();
}
function confirmKanbanCita(){
  const fecha=$('kc-fecha').value; if(!fecha){toast('Selecciona una fecha','err');return;}
  const pid=_dragPid; const prev=_dragPrevEst;
  if(!pid) return;
  doKanbanMove(pid,'Cita agendada',prev);
  recordatoriosService.crear({prospectoId:pid,tipo:'Cita agendada',fecha,hora:$('kc-hora').value,nota:$('kc-nota').value.trim()||'Cita en desarrollo',estado:'pendiente',usuario:CU.id});
  closeM('m-kanban-cita'); _dragPid=null; _dragPrevEst=null;
  toast('Cita agendada y recordatorio creado ✓','ok');
}
function confirmKanbanSeg(){
  const fecha=$('ks-fecha').value; if(!fecha){toast('Selecciona una fecha','err');return;}
  const pid=_dragPid; const prev=_dragPrevEst;
  if(!pid) return;
  doKanbanMove(pid,'Seguimiento',prev);
  recordatoriosService.crear({prospectoId:pid,tipo:'Seguimiento WhatsApp',fecha,hora:$('ks-hora').value,nota:$('ks-nota').value.trim()||'Seguimiento por WhatsApp',estado:'pendiente',usuario:CU.id});
  closeM('m-kanban-seg'); _dragPid=null; _dragPrevEst=null;
  toast('Movido a Seguimiento — recordatorio creado ✓','ok');
}
function doKanbanMove(pid, nuevoEst, anterior){
  // 1.95 (Etapa 2): el módulo SOLICITA; el Pipeline es la única ruta de cambio de estatus.
  const r=IANNA_PIPELINE.solicitarEstatus(pid, nuevoEst, 'Kanban');
  if(!r.ok) toast(r.error,'err');
  else if(r.advertencia) toast(r.advertencia,'warn');
  filterProsp(); updateBell();
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
  $('det-est-btns').innerHTML=(esOper?`<span class="badge" style="background:#1E3D0F;color:#fff;margin-right:6px">${p.estatus} — historial comercial protegido</span>`:'')
    +(p.estatus==='Venta'?`<button class="btn btn-gold btn-xs" onclick="crearNuevaOportunidadPersona('${pid}')">+ Nueva oportunidad</button>`:ESTATUS_CRM.concat(ESTATUS_INACTIVOS).map(s=>`<button class="btn btn-xs ${p.estatus===s?'btn-navy':'btn-out'}" ${esOper?'disabled title="El estatus lo gobierna la Operación activa"':''} onclick="cambiarEstatus('${pid}','${s}')">${s}</button>`).join(''));
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
  prospectosService.actualizar(pid,{estatus:'Nuevo', oportunidad_activa_id:o.id, oportunidad_activa_publica:o.id_publico});
  try{IANNA_MOTOR.auditar('oportunidades',o.id,'NUEVA_OPORTUNIDAD_RECOMPRA',{}, {personaId:pid,id_publico:o.id_publico,origen:fuente},'Cliente existente inicia nueva oportunidad');}catch(e){}
  toast('Nueva oportunidad creada: '+o.id_publico,'ok',5000); closeM('m-det'); filterProsp(); renderDashboard();
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
