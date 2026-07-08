/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/importar.module.js
   Importación/Exportación masiva CSV/XLSX.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
// ================================================================
// IMPORTACIÓN MASIVA
// ================================================================
function openImportModal(){
  IMP_ROWS=[];
  $$('#m-import .tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  $$('#m-import .tp').forEach((t,i)=>t.classList.toggle('active',i===0));
  $('imp-do-btn').style.display='none';
  // Mostrar/ocultar selector de asesor según rol
  const adefWrap=$('imp-ases-def-wrap');
  if(adefWrap) adefWrap.style.display=!AUTORIZADOR.puede('capturar_para_otros')?'none':'';
  openM('m-import');
}
function impTab(btn,pane){ $$('#m-import .tab').forEach(t=>t.classList.remove('active')); $$('#m-import .tp').forEach(t=>t.classList.remove('active')); btn.classList.add('active'); $(pane).classList.add('active'); }
function loadImportFile(inp){
  const file=inp.files[0]; if(!file) return;
  const ext=file.name.split('.').pop().toLowerCase();
  const reader=new FileReader();
  reader.onload=function(e){
    let data;
    if(ext==='csv'){
      const txt=e.target.result;
      const lines=txt.split('\n').filter(l=>l.trim());
      const headers=lines[0].split(',').map(h=>h.trim().replace(/"/g,'').toLowerCase());
      data=lines.slice(1).map(l=>{ const vals=l.split(',').map(v=>v.trim().replace(/"/g,'')); return Object.fromEntries(headers.map((h,i)=>[h,vals[i]||''])); });
    } else {
      const wb=XLSX.read(e.target.result,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      data=XLSX.utils.sheet_to_json(ws,{defval:''});
      data=data.map(r=>{ const nr={}; Object.keys(r).forEach(k=>{ nr[k.toLowerCase().trim()]=String(r[k]||'').trim(); }); return nr; });
    }
    processImportData(data);
  };
  if(ext==='csv') reader.readAsText(file,'UTF-8');
  else reader.readAsArrayBuffer(file);
}
function processImportData(rows){
  const MAP={nombre:['nombre','name','full name','nombre completo'],telefono:['telefono','teléfono','tel','phone','celular','móvil'],correo:['correo','email','e-mail','correo electronico'],fuente:['fuente','source','origen'],asesor:['asesor','vendedor','agent'],comentarios:['comentarios','notas','notes','comments'],estatus:['estatus','status','estado']};
  const existing=DS.find('prospectos').map(p=>p.telefono.replace(/\D/g,''));
  IMP_ROWS=rows.map(r=>{
    const mapped={};
    Object.entries(MAP).forEach(([field,keys])=>{ const k=keys.find(k=>r[k]!==undefined); mapped[field]=k?r[k]:''; });
    mapped.telefono=fmtTelVal(mapped.telefono);
    const tel=(mapped.telefono||'').replace(/\D/g,'');
    const isDup=tel&&existing.includes(tel);
    const isOk=mapped.nombre&&mapped.telefono;
    return {...mapped,_status:isDup?'dup':isOk?'ok':'err',_raw:r};
  });
  const ok=IMP_ROWS.filter(r=>r._status==='ok').length;
  const dup=IMP_ROWS.filter(r=>r._status==='dup').length;
  const err=IMP_ROWS.filter(r=>r._status==='err').length;
  $('imp-summary').innerHTML=[{l:'✅ Para importar',v:ok,c:'#f0fdf4'},{l:'🔄 Duplicados',v:dup,c:'#fef3c7'},{l:'❌ Incompletos',v:err,c:'#fef2f2'}].map(s=>`<div style="background:${s.c};border-radius:8px;padding:10px 16px;font-size:13px;font-weight:600">${s.l}: <span style="font-size:18px">${s.v}</span></div>`).join('');
  const head='<tr>'+['Estado','Nombre','Teléfono','Correo','Fuente','Estatus'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
  const body=IMP_ROWS.map(r=>{const bg=r._status==='dup'?'import-row-dup':r._status==='err'?'import-row-err':'import-row-ok';return `<tr class="${bg}"><td style="font-size:11px">${r._status==='ok'?'✅':r._status==='dup'?'🔄':'❌'}</td><td>${r.nombre||'—'}</td><td>${r.telefono||'—'}</td><td style="font-size:11px">${r.correo||'—'}</td><td>${r.fuente||'—'}</td><td>${r.estatus||'Nuevo'}</td></tr>`;}).join('');
  $('imp-table-wrap').innerHTML=`<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  $('imp-do-btn').style.display=ok>0?'inline-flex':'none';
  impTab($('imp-prev-tab'),'imp-preview');
}
function doImport(){
  const defAses=!AUTORIZADOR.puede('capturar_para_otros')?CU.id:($('imp-ases-def').value||CU.id);
  const VALID_STATUS=ESTATUS_CRM.concat(ESTATUS_INACTIVOS); // 1.95: 'Apartado'/'Venta' solo nacen de una Operación — no son importables
  let cnt=0;
  IMP_ROWS.filter(r=>r._status==='ok').forEach(r=>{
    const est=VALID_STATUS.includes(r.estatus)?r.estatus:'Nuevo';
    // Si es asesor: siempre asignar a sí mismo, ignorar columna Asesor del archivo
    let asesorId=defAses;
    if(AUTORIZADOR.puede('capturar_para_otros')&&r.asesor){
      const match=DS.find('usuarios').find(u=>u.nombre.toLowerCase().includes(r.asesor.toLowerCase()));
      if(match) asesorId=match.id;
    }
    prospectosService.crear({nombre:r.nombre,telefono:r.telefono,correo:r.correo||'',fuente:r.fuente||'Otro',estadoCivil:'Soltero',presupuesto:0,enganche:0,ingresos:0,estatus:est,comentarios:r.comentarios||'',asesor:asesorId,fechaRegistro:new Date().toISOString()});
    cnt++;
  });
  $('imp-result-body').innerHTML=`<div style="font-size:36px;margin-bottom:12px">✅</div><div style="font-size:18px;font-weight:700;color:var(--green);margin-bottom:8px">${cnt} prospectos importados</div><div style="font-size:13px;color:var(--t3)">Los registros ya están disponibles en el módulo de Prospectos.</div>`;
  $('imp-do-btn').style.display='none';
  impTab($('imp-res-tab'),'imp-result');
  renderProspectos(); renderDashboard();
  toast(`${cnt} prospectos importados ✓`,'ok');
}
function downloadTemplate(){
  const ws=XLSX.utils.json_to_sheet([{Nombre:'Luis Herrera',Teléfono:'667 123 4567',Correo:'luis@gmail.com',Fuente:'Facebook',Asesor:'',Comentarios:'Interesado en casa de 3 recámaras',Estatus:'Nuevo'}]);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Prospectos');
  XLSX.writeFile(wb,'Plantilla_Prospectos_VA.xlsx');
}

// ================================================================
// EXPORTACIÓN
// ================================================================
function exportarProspectos(){
  let list=AUTORIZADOR.puede('ver_global')?DS.find('prospectos'):DS.find('prospectos',{asesor:CU.id});
  const fEst=$('f-est')?.value||'';
  if(fEst&&fEst!=='__todos__') list=list.filter(p=>p.estatus===fEst);
  else if(!fEst) list=list.filter(p=>!ESTATUS_INACTIVOS.includes(p.estatus));
  const data=list.map(p=>({'Nombre':p.nombre,'Teléfono':p.telefono,'Correo':p.correo||'','Fuente':p.fuente||'','Estatus':p.estatus,'Presupuesto':p.presupuesto||0,'Enganche':p.enganche||0,'Ingresos':p.ingresos||0,'Estado Civil':p.estadoCivil||'','Asesor':getUser(p.asesor).nombre,'Fecha Alta':fD(p.fechaRegistro),'Comentarios':p.comentarios||''}));
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Prospectos');
  XLSX.writeFile(wb,`Prospectos_VA_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast(`${data.length} prospectos exportados ✓`,'ok');
}


// ================================================================
// FASE 1.96 — BOOTSTRAP / IMPORTACIÓN DE INVENTARIO MAESTRO
// El Excel es solo entrada: IANNA valida, asigna LOT- y genera M0000-L0000.
// ================================================================
let INV_IMP_ROWS=[];
const INV_ESTADOS_IMPORT=['Disponible','Entrega Rápida','Lote Especial','Casa Muestra','Vendido histórico','Bloqueado'];

function openInventarioImportModal(){
  INV_IMP_ROWS=[];
  const f=$('inv-imp-file'); if(f) f.value='';
  if($('inv-imp-summary')) $('inv-imp-summary').innerHTML='';
  if($('inv-imp-preview')) $('inv-imp-preview').innerHTML='<div class="empty"><div class="empty-i">📋</div><p>Carga la plantilla para validar el inventario antes de importarlo.</p></div>';
  if($('inv-imp-do')) $('inv-imp-do').style.display='none';
  openM('m-import-inventario');
}

function downloadInventarioTemplate(){
  const ejemplo=[{
    'Manzana':7,'Lote':1,'Domicilio':'Av. Valle de Aragón 701, Privada Aragó, Culiacán, Sinaloa',
    'Superficie_m2':144.000,'Excedente_m2':0.000,'Estado':'Disponible','Modelo_Planeado':'Aragó',
    'Plusvalia':0,'Tipo_Ubicacion':'—','Cliente_ID':'','Cliente_Nombre':'','Observaciones':''
  },{
    'Manzana':7,'Lote':2,'Domicilio':'Av. Valle de Aragón 702, Privada Aragó, Culiacán, Sinaloa',
    'Superficie_m2':180.500,'Excedente_m2':36.500,'Estado':'Vendido histórico','Modelo_Planeado':'Berdún',
    'Plusvalia':50000,'Tipo_Ubicacion':'Esquina','Cliente_ID':'','Cliente_Nombre':'Cliente histórico opcional','Observaciones':'Venta anterior a IANNA'
  }];
  const ws=XLSX.utils.json_to_sheet(ejemplo);
  ws['!cols']=[{wch:10},{wch:10},{wch:58},{wch:16},{wch:16},{wch:20},{wch:20},{wch:14},{wch:20},{wch:16},{wch:28},{wch:36}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Inventario');
  const cat=XLSX.utils.aoa_to_sheet([
    ['CATÁLOGOS / REGLAS'],
    ['Estados permitidos',...INV_ESTADOS_IMPORT],
    ['Modelo Planeado','Usar nombre o ID de un modelo activo de Parámetros. Puede quedar vacío.'],
    ['Domicilio','Dato obligatorio para el cierre; se guarda implícito y no necesita mostrarse en la tabla general.'],
    ['Cliente','Para Vendido histórico puede registrarse Cliente_Nombre sin fabricar una Operación IANNA.'],
    ['IDs','No capturar LOT-. IANNA los genera automáticamente y produce la clave física M0000-L0000.'],
  ]);
  XLSX.utils.book_append_sheet(wb,cat,'Instrucciones');
  XLSX.writeFile(wb,'Plantilla_Inventario_IANNA_1_96.xlsx');
}

function loadInventarioImportFile(inp){
  const file=inp.files?.[0]; if(!file) return;
  const ext=file.name.split('.').pop().toLowerCase();
  const reader=new FileReader();
  reader.onload=e=>{
    let rows=[];
    try{
      if(ext==='csv'){
        const wb=XLSX.read(e.target.result,{type:'string'});
        rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      }else{
        const wb=XLSX.read(e.target.result,{type:'array'});
        rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      }
      procesarInventarioImport(rows);
    }catch(err){ console.error(err); toast('No fue posible leer el archivo','err'); }
  };
  if(ext==='csv') reader.readAsText(file,'UTF-8'); else reader.readAsArrayBuffer(file);
}

function _normInvRow(r){
  const n={}; Object.entries(r||{}).forEach(([k,v])=>{ n[String(k).trim().toLowerCase().replace(/\s+/g,'_')]=v; });
  const val=(...ks)=>{ const k=ks.find(x=>n[x]!==undefined); return k?n[k]:''; };
  return {
    manzana:parseInt(val('manzana','mz'))||0,
    lote:String(val('lote','numero_lote','número_lote')).trim(),
    domicilio:String(val('domicilio','domicilio_oficial','direccion','dirección')).trim(),
    terreno:parseFloat(val('superficie_m2','superficie','terreno_m2','terreno'))||0,
    excedente:parseFloat(val('excedente_m2','excedente'))||0,
    estado:String(val('estado','estatus')).trim()||'Disponible',
    modelo:String(val('modelo_planeado','modelo','modelo_asignado')).trim(),
    plusvalia:parseFloat(val('plusvalia','plusvalía'))||0,
    tipo:String(val('tipo_ubicacion','tipo_ubicación','tipo')).trim()||'—',
    cliente_id:String(val('cliente_id','id_cliente')).trim(),
    cliente_nombre:String(val('cliente_nombre','cliente')).trim(),
    observaciones:String(val('observaciones','notas','comentarios')).trim(),
  };
}

function procesarInventarioImport(rows){
  const existentes=new Set((inventarioService.listar()||[]).map(l=>l.clave_fisica));
  const vistos=new Set();
  const modelos=DS.getModelos().filter(m=>m.activo!==false);
  INV_IMP_ROWS=rows.map((raw,idx)=>{
    const r=_normInvRow(raw); const errores=[];
    if(!r.manzana) errores.push('Manzana requerida');
    if(!r.lote) errores.push('Lote requerido');
    if(!r.domicilio) errores.push('Domicilio requerido');
    if(!(r.terreno>0)) errores.push('Superficie inválida');
    if(!INV_ESTADOS_IMPORT.includes(r.estado)) errores.push('Estado no permitido');
    const clave_fisica=IANNA_IDS.claveFisica({mz:r.manzana,lote:r.lote});
    if(existentes.has(clave_fisica)||vistos.has(clave_fisica)) errores.push('Ubicación duplicada '+clave_fisica); else vistos.add(clave_fisica);
    let modelo_id=''; let modelo_nombre='';
    if(r.modelo){
      const m=modelos.find(x=>x.id.toLowerCase()===r.modelo.toLowerCase()||x.nombre.toLowerCase()===r.modelo.toLowerCase());
      if(!m) errores.push('Modelo no existe/activo'); else { modelo_id=m.id; modelo_nombre=m.nombre; }
    }
    if(r.cliente_id && !DS.find('prospectos').some(p=>p.id_cliente===r.cliente_id)) errores.push('Cliente_ID no existe');
    return {...r,modelo_id,modelo_nombre,clave_fisica,_fila:idx+2,_errores:errores,_status:errores.length?'err':'ok'};
  });
  renderInventarioImportPreview();
}

function renderInventarioImportPreview(){
  const ok=INV_IMP_ROWS.filter(r=>r._status==='ok').length;
  const err=INV_IMP_ROWS.length-ok;
  $('inv-imp-summary').innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><div style="background:#f0fdf4;padding:9px 13px;border-radius:8px;font-size:12px;font-weight:700">✅ Válidos: ${ok}</div><div style="background:#fef2f2;padding:9px 13px;border-radius:8px;font-size:12px;font-weight:700">❌ Con error: ${err}</div><div style="background:var(--s2);padding:9px 13px;border-radius:8px;font-size:12px;font-weight:700">Total: ${INV_IMP_ROWS.length}</div></div>`;
  const rows=INV_IMP_ROWS.map(r=>`<tr class="${r._status==='err'?'import-row-err':'import-row-ok'}"><td>${r._fila}</td><td>${r._status==='ok'?'✅':'❌ '+r._errores.join('; ')}</td><td><b>${r.clave_fisica}</b></td><td>${f3(r.terreno)}</td><td>${r.estado}</td><td>${r.modelo_nombre||'—'}</td><td>${r.domicilio}</td></tr>`).join('');
  $('inv-imp-preview').innerHTML=`<div class="tw"><table><thead><tr><th>Fila</th><th>Validación</th><th>Ubicación</th><th>m²</th><th>Estado</th><th>Modelo</th><th>Domicilio</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  $('inv-imp-do').style.display=ok>0&&err===0?'inline-flex':'none';
}

function importarInventarioValidado(){
  if(!INV_IMP_ROWS.length||INV_IMP_ROWS.some(r=>r._status!=='ok')){ toast('Corrige todas las filas antes de importar','err'); return; }
  if(inventarioService.listar().length && !confirm('El inventario actual no está vacío. La importación agregará los registros validados. ¿Continuar?')) return;
  const P=getP(); let creados=0;
  INV_IMP_ROWS.forEach(r=>{
    const valor=r.terreno*(P.precio_m2_solo||14500)+r.plusvalia;
    inventarioService.crear({
      mz:r.manzana,lote:r.lote,terreno:parseFloat(r.terreno.toFixed(3)),excedente:parseFloat(r.excedente.toFixed(3)),
      estado:r.estado,modelo_asignado:r.modelo_nombre||'',modelo_id_planeado:r.modelo_id||'',plusvalia:r.plusvalia,
      tipo:r.tipo,tipo_ubicacion:r.tipo,cliente_asignado:r.cliente_id||'',cliente_historico_nombre:r.cliente_nombre||'',
      dir_oficial:r.domicilio,observaciones:r.observaciones,precio_m2:P.precio_m2_exc||9000,valor_terreno:valor,
      origen:'importacion_inicial_196',historial:[{estadoAnterior:'',estadoNuevo:r.estado,fecha:new Date().toISOString(),usuario:CU?.id||'system',nota:'Importación inventario maestro 1.96'}]
    });
    creados++;
  });
  IANNA_MOTOR.auditar('inventario','importacion_196','IMPORTAR_INVENTARIO',{}, {registros:creados}, 'Carga por plantilla oficial con LOT y clave física generados por IANNA');
  closeM('m-import-inventario'); renderInventario(); populateSelects();
  toast(`${creados} lotes importados correctamente ✓`,'ok',5000);
}
