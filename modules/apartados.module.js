/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/apartados.module.js
   Módulo Apartados: registro, edición, cancelación de apartado, conversión a venta.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
// ================================================================
// APARTADOS — COTIZACIÓN CORREGIDA
// ================================================================
function renderApartados(){
  populateSelects();
  const fEst=$('f-ap-est')?.value||'';
  let list=AUTORIZADOR.puede('ver_global')?DS.find('apartados'):DS.find('apartados',{asesor:CU.id});
  if(fEst==='__cancelados__'){
    list=list.filter(a=>a.estatus==='Cancelado'||a.estatus==='Venta Cancelada');
  } else if(fEst){
    list=list.filter(a=>a.estatus===fEst);
  } else {
    list=list.filter(a=>a.estatus!=='Cancelado'&&a.estatus!=='Venta Cancelada');
  }
  const activosList=list.filter(a=>a.estatus==='Activo');
  const activos=activosList.length; const hoy=new Date();
  const valorComprometido=activosList.reduce((sum,a)=>sum+Number(a.valor_operacion||0),0);
  const porVencer=activosList.filter(a=>{ if(!a.fecha_vencimiento)return false; const d=(new Date(a.fecha_vencimiento)-hoy)/86400000; return d>=0&&d<=7; }).length;
  const vencidos=activosList.filter(a=>a.fecha_vencimiento&&new Date(a.fecha_vencimiento)<hoy).length;
  $('ap-kpi').innerHTML=[
    {lbl:'Apartados activos',val:activos,sub:'Vigentes'},
    {lbl:'Valor comprometido',val:mxn(valorComprometido),sub:'Inventario apartado'},
    {lbl:'Por vencer',val:porVencer,sub:'Próximos 7 días'},
    {lbl:'Vencidos',val:vencidos,sub:'Requieren atención'},
  ].map(k=>`<div class="kpi-card"><div class="kpi-lbl">${k.lbl}</div><div class="kpi-val" style="font-size:20px">${k.val}</div><div class="kpi-sub">${k.sub}</div></div>`).join('');
  const tb=$('ap-tbody');
  if(!list.length){ tb.innerHTML=`<tr><td colspan="9"><div class="empty"><div class="empty-i">📋</div><p>Sin apartados registrados.</p></div></td></tr>`; return; }
  tb.innerHTML=list.map(a=>{
    const p=DS.findOne('prospectos',a.prospectoId);
    const l=getLote(a.clave_lote);
    const as=getUser(a.asesor);
    const mod=DS.getModelos().find(m=>m.id===a.modelo_id);
    const sc={Activo:'#f97316',Venta:'#10b981',Cancelado:'#ef4444','Venta Cancelada':'#dc2626'}[a.estatus]||'#8896a7';
    return `<tr>
      <td><div style="font-weight:600">${p?p.nombre:'—'}</div><div style="font-size:11.5px;color:var(--t3)">${p?p.telefono:''}</div></td>
      <td style="font-weight:700">${ubicacionLote(a.clave_lote)||'—'}${a.clave_lote_adicional?`<span style="font-size:10px;background:#eff6ff;color:#1e40af;border-radius:4px;padding:2px 5px;margin-left:4px">+${ubicacionLote(a.clave_lote_adicional)}</span>`:''}</td>
      <td>${mod?mod.nombre:'—'}</td>
      <td>${as.nombre.split(' ')[0]}</td>
      <td style="font-size:12px;color:var(--t3)">${AUTORIZADOR.puede('ver_global')?`<input type="date" value="${a.fecha_apartado||''}" style="border:none;border-bottom:1px solid var(--bd2);font-size:12px;color:var(--t3);background:transparent;cursor:pointer" onchange="editarFechaApartado('${a.id}',this.value)" title="Editar fecha">`:`${fD(a.fecha_apartado)}`}</td>
      <td style="font-weight:500">${mxn(a.monto_enganche)}</td>
      <td style="font-weight:700;color:var(--navy)">${mxn(a.valor_operacion)}</td>
      <td><span class="badge" style="background:${sc}18;color:${sc}"><span class="bdot" style="background:${sc}"></span>${a.estatus}</span></td>
      <td style="white-space:nowrap;display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-navy btn-xs" onclick="abrirOperaciones('${a.id}')">⚙ Operaciones</button>
        ${a.estatus==='Activo'?`<button class="btn btn-gold btn-xs" onclick="generarCierre('${a.id}')">📄 Cierre</button>${AUTORIZADOR.puede('ver_global')?`<button class="btn btn-out btn-xs" onclick="refrendarApartado('${a.id}')">↻ Refrendar</button>`:''}`:''}
        ${a.estatus==='Venta'?`<button class="btn btn-gold btn-xs" onclick="abrirCobranzaVenta('${a.id}')">💰 Cobranza</button>`:''}
        ${a.estatus==='Venta Cancelada'?`<span style="font-size:10px;color:#dc2626">Cancelada</span>`:''}
      </td>
    </tr>`;
  }).join('');
}
function openApartadoFlow(clave_pre=null){
  populateSelects();
  $('ap-fecha').value=new Date().toISOString().split('T')[0];
  $('ap-monto').value='50,000';
  $('ap-lote-ficha').style.display='none';
  $('ap-modelo-ficha').style.display='none';
  ['ap-ca-desc','ap-ca-m2','ap-ca-val'].forEach(f=>$(f).value='');
  setLoteAdic(false);
  $('ap-lote-adic-wrap').style.display='none';
  $('ap-lote').dataset.editId='';
  if(!AUTORIZADOR.puede('capturar_para_otros')) $('ap-ases').value=CU.id;
  if(clave_pre){ $('ap-lote').value=clave_pre; onLoteChange(); }
  else { $('ap-lote').value=''; $('ap-modelo').value=''; $('ap-modelo').disabled=false; }
  openM('m-apt');
}
function fillAsesor(){
  if(!AUTORIZADOR.puede('capturar_para_otros')) return;
  const p=DS.findOne('prospectos',$('ap-cli').value);
  if(p?.asesor) $('ap-ases').value=p.asesor;
}

function modeloIdDesdeLoteAsignado(l){
  if(!l) return '';
  const raw=l.modelo_asignado_id||l.modelo_id||l.modelo_asignado||l.modeloPlaneado||l.modelo_planeado||'';
  if(!raw) return '';
  const mods=DS.getModelos()||[];
  const m=mods.find(x=>String(x.id)===String(raw)||String(x.nombre).toLowerCase()===String(raw).toLowerCase());
  return m?m.id:'';
}
function modeloNombreDesdeId(mid){ const m=getMod(mid); return m?m.nombre:''; }

function refreshModelosApartado(){
  // Morello: solo Manzana 10 — se recalcula cada vez que cambia el lote seleccionado
  const sel=$('ap-modelo'); if(!sel) return;
  const prevVal=sel.value;
  const loteSelAp=$('ap-lote')?.value;
  const loteDataAp=loteSelAp?getLote(loteSelAp):null;
  const mzAp=loteDataAp?String(loteDataAp.mz):'';
  const modsAll=DS.getModelos().filter(m=>m.activo);
  sel.innerHTML='<option value="">— Selecciona un modelo —</option>'+modsAll.map(m=>{
    const blocked=m.id==='MORELLO'&&mzAp&&mzAp!=='10';
    return `<option value="${m.id}" ${blocked?'disabled style="color:#aaa"':''}>${m.nombre}${m.precio?' — '+mxn(m.precio):''}${blocked?' (Solo Mz 10)':''}</option>`;
  }).join('');
  if(prevVal){
    const opt=[...sel.options].find(o=>o.value===prevVal);
    if(opt&&!opt.disabled){ sel.value=prevVal; }
    else if(opt&&opt.disabled){ sel.value=''; $('ap-modelo-ficha').style.display='none'; toast('El modelo Morello solo se construye en la Manzana 10 — selecciona otro modelo','warn',4000); }
  }
}
function onLoteChange(){
  const clave=$('ap-lote').value;
  refreshModelosApartado();
  if(!clave){ $('ap-lote-ficha').style.display='none'; return; }
  const l=getLote(clave); if(!l) return;
  const midAsignado=modeloIdDesdeLoteAsignado(l);
  const modeloBloqueado=!!midAsignado && ['Entrega Rápida','Casa Muestra','En construcción','Construcción'].includes(l.estado);
  if(modeloBloqueado){
    $('ap-modelo').value=midAsignado;
    $('ap-modelo').disabled=true;
    $('ap-modelo').dataset.lockedModel=midAsignado;
    $('ap-modelo').title='Modelo físico asignado al lote. Solo Administración puede cambiarlo desde Inventario.';
    onModeloChange();
  } else {
    $('ap-modelo').disabled=false;
    $('ap-modelo').dataset.lockedModel='';
    $('ap-modelo').title='';
  }
  $('ap-lote-ficha').style.display='block';
  $('ap-lote-info').innerHTML=[
    ['Ubicación',`<b>${ubicacionLote(l)}</b>`],['Manzana',l.mz],['Lote',l.lote],
    ['Terreno',f3(l.terreno)+' m²'],['Excedente',f3(l.excedente)+' m²'],
    ['Plusvalía',l.plusvalia?mxn(l.plusvalia):'Sin plusvalía'],
    ['Tipo',l.tipo],['Valor terreno',`<b>${mxn(l.valor_terreno)}</b>`],
  ].map(r=>`<div style="font-size:12px"><div style="color:var(--t3);margin-bottom:2px">${r[0]}</div><div style="font-weight:500">${r[1]}</div></div>`).join('');
  if($('ap-modelo').value) calcCotiz();
  $('ap-lote-adic-wrap').style.display='block';
  // refresh lote adicional dropdown excluding chosen lote
  const claveSel=$('ap-lote').value;
  // Lote adicional: todos los disponibles (incl. fracciones), excluyendo el principal ya seleccionado
  const dispFilt=DS.db.inventario.filter(l=>l.estado==='Disponible'&&l.clave!==claveSel);
  const apAdicEl=$('ap-lote-adic');
  if(apAdicEl) apAdicEl.innerHTML='<option value="">— Selecciona lote adicional —</option>'+dispFilt.map(l=>`<option value="${l.clave}">${ubicacionLote(l)}${l.es_fraccion?' ['+l.fraccion_tipo+']':''} — ${f3(l.terreno)}m² — ${mxn(l.valor_terreno)}</option>`).join('');
}
function onModeloChange(){
  const mid=$('ap-modelo').value;
  if(!mid){ $('ap-modelo-ficha').style.display='none'; return; }
  const m=getMod(mid); if(!m) return;
  $('ap-modelo-ficha').style.display='block';
  if(m.id==='SOLO_TERRENO') m.desc='Solo terreno — precio vigente: '+mxn(getP().precio_m2_solo)+'/m²';
  // Superficie mínima por modelo
  const SURF_MIN={MORELLO:126,AMBEL:144,ARAGO:144,MIRAMBEL:144,BERDUN:144};
  const supMin=SURF_MIN[m.id]||0;
  const loteActual=$('ap-lote').value;
  const loteData=loteActual?getLote(loteActual):null;
  let alertaSuperficie='';
  if(supMin>0&&loteData&&loteData.terreno<supMin){
    alertaSuperficie=`<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:7px;padding:9px 12px;margin-top:10px;font-size:12.5px;color:#92400e">
      ⚠️ El lote seleccionado tiene <b>${f3(loteData.terreno)}m²</b>. El modelo <b>${m.nombre}</b> requiere mínimo <b>${supMin}m²</b>.
      La operación puede registrarse pero se recomienda verificar con el cliente.
    </div>`;
  }
  $('ap-modelo-info').innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">
    ${[['Precio base',m.precio?mxn(m.precio):'Según terreno'],['Construcción',m.construccion?m.construccion+'m²':'—'],['Recámaras',m.recamaras||'—'],['Baños',m.banos||'—']].map(r=>`<div style="font-size:12px"><div style="color:var(--t3);margin-bottom:2px">${r[0]}</div><div style="font-weight:600">${r[1]}</div></div>`).join('')}
  </div><div style="font-size:12px;color:var(--t2)">${m.desc}</div>${alertaSuperficie}`;
  calcCotiz();
}
function calcCotiz(){
  const mid=$('ap-modelo').value; const clave=$('ap-lote').value;
  if(!mid||!clave) return;
  const m=getMod(mid); const l=getLote(clave);
  if(!m||!l) return;
  const P=getP();
  const caVal=parseMoneyInput($('ap-ca-val').value);
  const caM2=parseFloat($('ap-ca-m2').value)||0;
  const caDesc=$('ap-ca-desc').value.trim();
  const pExc=P.precio_m2_exc||9000;
  const pFrac=P.precio_m2_lote_adicional||13000;
  let rows=[], total=0;

  if(m.id==='SOLO_TERRENO'){
    const vTer=l.terreno*(P.precio_m2_solo||14500);
    const vPlus=l.plusvalia||0;
    rows.push([`Terreno (${f3(l.terreno)}m² × ${mxn(P.precio_m2_solo||14500)}/m²)`,mxn(vTer)]);
    if(vPlus) rows.push([`Plusvalía (${l.tipo})`,mxn(vPlus)]);
    total=vTer+vPlus;
  } else {
    const vCasa=m.precio;
    const vExc=l.excedente*pExc;
    const vPlus=l.plusvalia||0;
    // Fracción fusionada: si el lote tiene fracción, se calcula a precio de fracción ($13,000/m²)
    const fracM2=l.fraccion_fusionada?(l.fraccion_m2_adicional||0):0;
    const pFracLote=l.fraccion_precio_m2||pFrac;
    const vFrac=fracM2*pFracLote;
    rows.push([`Modelo ${m.nombre}`,mxn(vCasa)]);
    if(l.excedente>0) rows.push([`Excedente (${f3(l.excedente)}m² × ${mxn(pExc)}/m²)`,mxn(vExc)]);
    if(fracM2>0) rows.push([`Fracción fusionada (${f3(fracM2)}m² × ${mxn(pFracLote)}/m²)`,mxn(vFrac)]);
    if(vPlus) rows.push([`Plusvalía (${l.tipo})`,mxn(vPlus)]);
    total=vCasa+vExc+vFrac+vPlus;
  }
  // Construcción adicional
  if(caVal>0){
    rows.push([`Construcción adicional${caDesc?' — '+caDesc:''}${caM2?' ('+f3(caM2)+'m²)':''}`,mxn(caVal)]);
    total+=caVal;
  }
  // Lote adicional separado
  const adClave=$('ap-lote-adic')?.value;
  const adSel=$('ap-lote-adic-sel')?.style.display!=='none';
  if(adClave&&adSel){
    const lAd=getLote(adClave);
    if(lAd){
      const valorAd=lAd.terreno*pFrac;
      rows.push([`Lote adicional ${ubicacionLote(lAd)} (${f3(lAd.terreno)}m² × ${mxn(pFrac)}/m²)`,mxn(valorAd)]);
      total+=valorAd;
    }
  }
  rows.push(['Valor total de operación',mxn(total)]);
  $('ap-cotiz').innerHTML=rows.map((r,i)=>`<div class="cz-row${i===rows.length-1?' total':''}"><span class="cz-lbl">${r[0]}</span><span class="cz-val">${r[1]}</span></div>`).join('');
  return total;
}
function setLoteAdic(show){
  $('ap-lote-adic-sel').style.display=show?'block':'none';
  $('btn-adic-no').className='btn btn-sm '+(show?'btn-out':'btn-navy');
  $('btn-adic-si').className='btn btn-sm '+(show?'btn-navy':'btn-out');
  if(!show){ $('ap-lote-adic').value=''; $('ap-lote-adic-info').style.display='none'; }
  calcCotiz();
}
function onLoteAdicChange(){
  const clave=$('ap-lote-adic').value;
  if(!clave){ $('ap-lote-adic-info').style.display='none'; calcCotiz(); return; }
  const l=getLote(clave); if(!l) return;
  const P=getP();
  const precioAd=P.precio_m2_lote_adicional||13000;
  const valorAd=l.terreno*precioAd; // full precision
  $('ap-lote-adic-info').style.display='block';
  $('ap-lote-adic-info').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
      <div><div style="color:var(--t3);font-size:10.5px;margin-bottom:2px">Clave</div><div style="font-weight:700">${ubicacionLote(l)}</div></div>
      <div><div style="color:var(--t3);font-size:10.5px;margin-bottom:2px">Terreno</div><div style="font-weight:600">${f3(l.terreno)}m²</div></div>
      <div><div style="color:var(--t3);font-size:10.5px;margin-bottom:2px">Precio/m²</div><div style="font-weight:600">${mxn(precioAd)}</div></div>
      <div><div style="color:var(--t3);font-size:10.5px;margin-bottom:2px">Valor</div><div style="font-weight:700;color:var(--navy)">${mxn(valorAd)}</div></div>
    </div>`;
  calcCotiz();
}
function saveApartado(){
  const prospectoId=$('ap-cli').value;
  const clave_lote=$('ap-lote').value;
  let modelo_id=$('ap-modelo').value||$('ap-modelo').dataset.lockedModel||'';
  if(!prospectoId||!clave_lote||!modelo_id){ toast('Selecciona prospecto, lote y modelo','err'); return; }
  // Candado: Morello solo se construye en Manzana 10
  const _loteMz=getLote(clave_lote);
  if(modelo_id==='MORELLO'&&_loteMz&&String(_loteMz.mz)!=='10'){ toast('El modelo Morello solo se construye en la Manzana 10','err'); return; }
  const metodo_pago=$('ap-metodo-pago')?.value||'Transferencia';
  // ── MOTOR DE REGLAS: unicidad de vivienda (jamás dos operaciones activas sobre el mismo lote) ──
  const editIdVal=$('ap-lote').dataset.editId||'';
  const adClavePre=($('ap-lote-adic')?.value)||'';
  const valAp=IANNA_MOTOR.validarNuevoApartado({clave_lote, clave_lote_adicional:adClavePre, prospectoId, editId:editIdVal||undefined});
  if(!valAp.ok){ IANNA_MOTOR.bloquear('apartados', editIdVal||clave_lote, editIdVal?'EDITAR_APARTADO':'CREAR_APARTADO', valAp.errores.join(' ')); return; }
  // ── MÁQUINA DE ESTADOS: Disponible → Apartado ──
  if(!editIdVal){
    const trAp=IANNA_ESTADOS.puedeTransicionar('Disponible','Apartado');
    if(!trAp.ok){ IANNA_MOTOR.bloquear('apartados', clave_lote, 'CREAR_APARTADO', trAp.razon); return; }
  }
  const valor_operacion=calcCotiz()||0;
  const caDesc=$('ap-ca-desc').value.trim();
  const caM2=parseFloat($('ap-ca-m2').value)||0;
  const caVal=parseMoneyInput($('ap-ca-val').value);
  const adClaveVal=$('ap-lote-adic')?.value;
  const adActivo=$('ap-lote-adic-sel')?.style.display!=='none'&&adClaveVal;
  const editId=$('ap-lote').dataset.editId||'';
  const _opo=typeof IANNA_OPO!=='undefined'?IANNA_OPO.oportunidadImplicita(prospectoId):null; const _pp=DS.findOne('prospectos',prospectoId)||{};
  const ap={prospectoId,oportunidadId:_opo?.id||null,broker_id:_opo?.broker_id||_pp.brokerId||null,fuente:_opo?.origen||_pp.fuente||'',clave_lote,modelo_id,asesor:$('ap-ases').value,fecha_apartado:$('ap-fecha').value, vigencia_dias_snapshot:Number(getP().vigencia_apartado_dias||15), fecha_vencimiento:(()=>{const d=new Date($('ap-fecha').value+'T12:00:00');d.setDate(d.getDate()+Number(getP().vigencia_apartado_dias||15));return d.toISOString().slice(0,10)})(),monto_enganche:parseMoneyInput($('ap-monto').value)||50000,metodo_pago,valor_operacion,estatus:'Activo',modelo_nombre:getMod(modelo_id)?.nombre||'',construccion_adicional_desc:caDesc,construccion_adicional_m2:caM2,construccion_adicional_val:caVal,clave_lote_adicional:adActivo?adClaveVal:''};

  if(editId){
    // EDITAR: actualizar registro existente, no crear uno nuevo
    const prev=DS.findOne('apartados',editId);
    apartadosService.actualizar(editId,ap);
    const prospectoEdit=DS.findOne('prospectos',prospectoId);
    // Si cambió de lote, liberar el anterior y marcar el nuevo
    if(prev&&prev.clave_lote!==clave_lote){
      inventarioService.actualizarPorClave(prev.clave_lote,{estado:'Disponible',modelo_asignado:'',cliente_asignado:''});
    }
    inventarioService.actualizarPorClave(clave_lote,{estado:'Apartado',modelo_asignado:getMod(modelo_id)?.nombre||'',modelo_asignado_id:modelo_id,cliente_asignado:prospectoEdit?.nombre||''});
    auditLog('apartados',editId,'UPDATE',prev,ap);
    $('ap-lote').dataset.editId='';
    closeM('m-apt'); renderApartados(); renderInventario(); renderDashboard(); filterProsp();
    toast('Apartado actualizado ✓','ok');
    return;
  }

  apartadosService.crear(ap);
  IANNA_MOTOR.auditar('apartados', clave_lote, 'CREAR_APARTADO', {}, {cliente:DS.findOne('prospectos',prospectoId)?.nombre, lote:clave_lote, modelo:ap.modelo_nombre, monto:ap.monto_enganche, metodo:metodo_pago}, 'Registro de apartado');
  { const _nw=DS.find('apartados').find(x=>x.clave_lote===clave_lote&&x.estatus==='Activo');
    if(_nw){ IANNA_IDS.alCrearApartado(_nw);
      IANNA_HISTORIAL.registrar({tipo:'crear_apartado', registroId:_nw.id, idPublico:DS.findOne('apartados',_nw.id).id_publico, estadoAnterior:'Disponible', estadoNuevo:'Apartado', motivo:'Registro de apartado', resultado:'ok'}); } }
  // Generar recibo INMEDIATAMENTE al registrar: se abre en pantalla y queda guardado en el expediente
  const newAp = DS.find('apartados').find(a=>a.prospectoId===prospectoId&&a.clave_lote===clave_lote&&a.estatus==='Activo');
  if(newAp){
    const folio = IANNA_FOLIOS.emitir('recibo_apartado', newAp.id);
    const pData=DS.findOne('prospectos',prospectoId);
    const lData=getLote(clave_lote);
    const mData=getMod(modelo_id);
    const numCliente=getOrCreateNumCliente(prospectoId);
    // Snapshot del cliente construido desde el prospecto (los campos del cierre aún no existen)
    const cliSnapshot={
      nombre:pData?.nombre||'', curp:'', rfc:'', nacimiento:'', sexo:'H',
      estadoCivil:pData?.estadoCivil||'', regimen:'', lugarNac:'Culiacán', nacionalidad:'Mexicana',
      cel:pData?.telefono||'', email:pData?.correo||'', calle:'', colonia:'', cp:'',
      ciudad:'Culiacán', municipio:'Culiacán',
      conyugeNombre:'', conyugeCurp:'', conyugeRfc:'', conyugeNac:'', conyugeCel:'',
      refNombre:'', refParentesco:'', refCel:'',
      empresa:'', puesto:'', ingresos:'', comprobacion:'', tipoCredito:'', banco:'', plazoCredito:'',
      numCliente,
    };
    const snapMin={
      cli:cliSnapshot, folio, numCliente, asesorNombre:(getUser(newAp.asesor)?.nombre)||CU.nombre, formaPago:FORMA_PAGO_TXT[metodo_pago]||metodo_pago,
      l:lData?{...lData,historial:undefined}:null, m:mData?{...mData}:null,
      ap:{id:newAp.id, monto_enganche:newAp.monto_enganche, clave_lote:newAp.clave_lote, fecha_apartado:newAp.fecha_apartado},
      pagares:[], fechaSnapshot:new Date().toISOString(),
    };
    apartadosService.actualizar(newAp.id,{folio_recibo:parseInt(folio), doc_snapshot:snapMin});
    registrarDocumento(newAp.id,'imprimirReciboApartado','Recibo de Apartado');
    // Abrir el recibo en pantalla (mismo gesto de clic del usuario: el navegador no lo bloquea)
    const prevCierre = _cierreData;
    _cierreData = {ap:newAp,l:lData,m:mData,p:pData,folio,numCliente,cliSnapshot,asesorNombre:(getUser(newAp.asesor)?.nombre)||CU.nombre,formaPago:FORMA_PAGO_TXT[metodo_pago]||metodo_pago};
    imprimirReciboApartado();
    _cierreData = prevCierre;
  }
  const now=new Date().toISOString();
  const prospectoNuevo=DS.findOne('prospectos',prospectoId);
  const lotePrin=getLote(clave_lote);
  if(lotePrin){
    const hist=[...(lotePrin.historial||[]),{estadoAnterior:'Disponible',estadoNuevo:'Apartado',fecha:now,usuario:CU.id,nota:`Apartado — ${getMod(modelo_id)?.nombre}`}];
    inventarioService.actualizarPorClave(clave_lote,{estado:'Apartado',modelo_asignado:getMod(modelo_id)?.nombre||'',modelo_asignado_id:modelo_id,cliente_asignado:prospectoNuevo?.nombre||'',historial:hist});
  }
  if(adActivo){
    const loteAd=getLote(adClaveVal);
    if(loteAd){
      const histAd=[...(loteAd.historial||[]),{estadoAnterior:'Disponible',estadoNuevo:'Apartado',fecha:now,usuario:CU.id,nota:`Lote adicional — apartado con lote principal ${clave_lote}`}];
      inventarioService.actualizarPorClave(adClaveVal,{estado:'Apartado',modelo_asignado:getMod(modelo_id)?.nombre||'',modelo_asignado_id:modelo_id,cliente_asignado:prospectoNuevo?.nombre||'',historial:histAd});
    }
  }
  IANNA_PIPELINE.derivarEstatusOperacional(prospectoId,'Apartado',{operacion:'crear_apartado'});
  const notaAd=adActivo?` + Lote adicional ${adClaveVal}`:'';
  seguimientosService.crear({prospectoId,tipo:'Nota interna',nota:`Apartado registrado — Lote ${clave_lote}${notaAd} · ${getMod(modelo_id)?.nombre} · Enganche ${mxn(ap.monto_enganche)} · Valor operación ${mxn(valor_operacion)}`,fecha:now,usuario:CU.id,estatusCambio:'Apartado'});
  auditLog('apartados',ap.id,'CREATE',null,ap);
  // Auto-move prospecto to Apartado in Kanban
  IANNA_PIPELINE.derivarEstatusOperacional(prospectoId,'Apartado',{operacion:'crear_apartado'});
  if(_dragPid===prospectoId){ _dragPid=null; _dragPrevEst=null; }
  closeM('m-apt'); renderApartados(); renderInventario(); renderDashboard(); filterProsp();
  toast('Apartado registrado ✓','ok');
}
function editarApartado(aid){
  const ap=DS.findOne('apartados',aid); if(!ap) return;
  // ── MOTOR: las ventas y operaciones cerradas NO se editan; todo cambio es una nueva operación ──
  if(ap.estatus!=='Activo'){ IANNA_MOTOR.bloquear('apartados', aid, 'EDITAR_APARTADO', `Una operación con estatus "${ap.estatus}" no puede editarse. Los cambios sobre ventas se realizan mediante cancelación formal u operaciones relacionadas.`); return; }
  // Pre-fill the apartado modal with existing data
  populateSelects();
  $('ap-cli').value=ap.prospectoId||'';
  $('ap-ases').value=ap.asesor||CU.id;
  $('ap-lote').value=ap.clave_lote||'';
  $('ap-modelo').value=ap.modelo_id||'';
  $('ap-fecha').value=ap.fecha_apartado||new Date().toISOString().split('T')[0];
  $('ap-monto').value=moneyInputVal(ap.monto_enganche||50000);
  $('ap-ca-desc').value=ap.construccion_adicional_desc||'';
  $('ap-ca-m2').value=ap.construccion_adicional_m2||0;
  $('ap-ca-val').value=moneyInputVal(ap.construccion_adicional_val);
  // Store ID for save
  $('ap-lote').dataset.editId=aid;
  if(ap.clave_lote) onLoteChange();
  if(ap.modelo_id) onModeloChange();
  openM('m-apt');
}
// ── SOLICITANTE ──
function cancelarApartadoModal(aid){ return IANNA_OPS.ejecutar('cancelacion_apartado',{aid}); }

// ── EJECUTOR ──
function _ejecutarCancelacionApartado(aid){
  const ap=DS.findOne('apartados',aid); if(!ap) return;
  const p=DS.findOne('prospectos',ap.prospectoId);
  const now=new Date().toISOString();
  // ¿Conservar el modelo? Solo si la construcción física ya inició (queda como Entrega Rápida sin cliente)
  const lPrin=getLote(ap.clave_lote);
  let keepModelo=false;
  if(lPrin&&lPrin.modelo_asignado){
    keepModelo=!confirm(`El lote ${ap.clave_lote} quedará DISPONIBLE: se limpia el cliente y el modelo "${lPrin.modelo_asignado}".\n\n✅ Aceptar → Limpiar todo (lote Disponible, sin modelo ni cliente)\n❌ Cancelar → SOLO si la construcción de la casa YA INICIÓ físicamente: conserva el modelo y queda como Entrega Rápida (sin cliente)`);
  }
  apartadosService.actualizar(aid,{estatus:'Cancelado',cancelacion_fecha:now,cancelacion_usuario:CU.id,cancelacion_motivo:'Cancelado manualmente'});
  // Return lot to Disponible — SIEMPRE se limpia el cliente; el modelo según la pregunta
  const loteCanc=getLote(ap.clave_lote);
  if(loteCanc){
    const hist=[...(loteCanc.historial||[]),{estadoAnterior:'Apartado',estadoNuevo:'Disponible',fecha:now,usuario:CU.id,nota:'Apartado cancelado'+(keepModelo?' — construcción iniciada, conserva modelo':' — modelo y cliente liberados')}];
    inventarioService.actualizarPorClave(ap.clave_lote,{estado:'Disponible',cliente_asignado:'',modelo_asignado:keepModelo?loteCanc.modelo_asignado:'',historial:hist});
  }
  if(ap.clave_lote_adicional){
    const loteAdC=getLote(ap.clave_lote_adicional);
    if(loteAdC){
      const histAd=[...(loteAdC.historial||[]),{estadoAnterior:'Apartado',estadoNuevo:'Disponible',fecha:now,usuario:CU.id,nota:'Apartado cancelado (lote adicional) — liberado'}];
      inventarioService.actualizarPorClave(ap.clave_lote_adicional,{estado:'Disponible',cliente_asignado:'',modelo_asignado:'',historial:histAd});
    }
  }
  IANNA_PIPELINE.derivarEstatusOperacional(ap.prospectoId,'Seguimiento',{operacion:'cancelacion_apartado',operacionId:aid});
  const regCancel=IANNA_MOTOR.registrarCancelacion('apartado', ap, 'Cancelado manualmente', 'Disponible');
  IANNA_MOTOR.auditar('apartados', aid, 'CANCELAR_APARTADO', {estatus:'Activo', lote:ap.clave_lote}, {estatus:'Cancelado', folio_cancelacion:regCancel.folio}, 'Cancelación formal de apartado');
  renderApartados(); renderInventario(); renderDashboard();
  toast(`Apartado cancelado — lote liberado ✓ (Folio de cancelación ${String(regCancel.folio).padStart(8,'0')})`,'warn');
}
function editarFechaApartado(aid, fecha){
  if(!fecha||!AUTORIZADOR.puede('ajustar_fecha_apartado')) return; /* semántica 1.9 conservada: solo gerente */
  apartadosService.actualizar(aid,{fecha_apartado:fecha});
  auditLog('apartados',aid,'UPDATE_FECHA',{},{fecha_apartado:fecha});
  toast('Fecha actualizada ✓','ok');
}
// ── SOLICITANTE ──
function convertirVenta(aid){ return IANNA_OPS.ejecutar('contrato_firmado',{aid}); }

// ── EJECUTOR (solo escribe; validaciones/confirmación las hizo el Motor de Operaciones) ──
function _ejecutarContratoFirmado(aid){
  const ap=DS.findOne('apartados',aid); if(!ap) return false;
  // ── FASE 1.9: congelar snapshot de política ANTES de tocar nada ──
  IANNA_COM.congelarPolitica(ap);
  const now=new Date().toISOString();
  const l=getLote(ap.clave_lote)||{}; const m=getMod(ap.modelo_id)||{};
  const P=getP();
  const vTotal=(m.precio||0)+(l.excedente||0)*(P.precio_m2_exc||9000)+(l.plusvalia||0)+((l.fraccion_fusionada?(l.fraccion_m2_adicional||0):0)*(l.fraccion_precio_m2||P.precio_m2_lote_adicional||13000));
  const gastosTotal=(P.gastos_operacion||[]).filter(g=>g.activo).reduce((s,g)=>s+(g.tipo==='fijo'?g.valor:g.tipo==='pct_vivienda'?vTotal*g.valor:0),0);
  const totalOp=vTotal+gastosTotal;
  apartadosService.actualizar(aid,{estatus:'Venta',fecha_venta:now,total_operacion:totalOp,fecha_firma_contrato:now});
  // Update inventory to Vendido
  const loteVta=getLote(ap.clave_lote);
  if(loteVta){
    const hist=[...(loteVta.historial||[]),{estadoAnterior:'Apartado',estadoNuevo:'Vendido',fecha:now,usuario:CU.id,nota:'Venta cerrada'}];
    inventarioService.actualizarPorClave(ap.clave_lote,{estado:'Vendido',historial:hist});
  }
  if(ap.clave_lote_adicional){
    inventarioService.actualizarPorClave(ap.clave_lote_adicional,{estado:'Vendido'});
  }
  IANNA_PIPELINE.derivarEstatusOperacional(ap.prospectoId,'Venta',{operacion:'contrato_firmado',operacionId:aid});
  seguimientosService.crear({prospectoId:ap.prospectoId,tipo:'Nota interna',nota:`¡VENTA CERRADA! ${ubicacionLote(ap.clave_lote)}`,fecha:now,usuario:CU.id,estatusCambio:'Venta'});
  renderApartados(); renderInventario(); renderDashboard(); filterProsp();
  IANNA_MOTOR.auditar('apartados', aid, 'CONVERTIR_VENTA', {estatus:'Activo'}, {estatus:'Venta', total_operacion:totalOp, lote:ap.clave_lote}, 'Contrato firmado');
  // ── FASE 1.9: marcar la Oportunidad activa como GANADA (enlaza al APT-) ──
  try{
    const oport = IANNA_OPO.oportunidadImplicita(ap.prospectoId);
    if(oport && oport.estado !== 'Ganada') IANNA_OPO.marcarGanada(oport.id, aid);
  }catch(e){ console.error('marcar Oportunidad Ganada',e); }
  // ── FASE 1.9: congelar pagarés como sub-registros con folio ÚNICO y devengar comisiones ──
  try{
    const apV=DS.findOne('apartados',aid);
    // Congelar pagarés desde el cierre en curso o desde el snapshot del expediente
    const pagFuente = (typeof _cierreData!=='undefined'&&_cierreData&&_cierreData.ap.id===aid) ? _cierreData.pagares : (apV.doc_snapshot?.pagares || []);
    if(pagFuente && pagFuente.length && !apV.pagares_congelados){
      const congelados=pagFuente.map((p,i)=>({
        id:'pag_'+aid+'_'+(i+1),
        n:p.n, total:pagFuente.length,
        folio: IANNA_FOLIOS.emitirUnaVez('pagare', aid+':'+p.n), // 1.95: idempotente por pagaré — imposible duplicar
        id_publico: IANNA_IDS.asignar('recibo'),
        fecha: (p.fecha instanceof Date ? p.fecha.toISOString().split('T')[0] : p.fecha),
        monto: p.monto,
        estado:'Pendiente',
        historial:[{accion:'emitido', fecha:new Date().toISOString(), usuario:CU.id}],
      }));
      apartadosService.actualizar( aid, { pagares_congelados: congelados });
    }
    // Devengar comisiones en el ledger (respetando snapshot de política ya congelada)
    IANNA_COM.devengarComisiones(DS.findOne('apartados',aid));
    // Ingreso del apartado inicial (si aún no está en el ledger)
    if(!IANNA_FIN.movimientosDe(aid).some(m=>m.tipo==='ingreso'&&m.concepto?.includes('Apartado inicial'))){
      IANNA_FIN.registrarIngreso({
        operacionId:aid, personaId:apV.prospectoId,
        monto:apV.monto_enganche||0,
        metodo:apV.metodo_pago||'Transferencia',
        documento: IANNA_FMT.FOLIO(apV.folio_recibo),
        concepto:'Apartado inicial',
        politica_version:(apV.politica_snapshot||{}).version||'v1',
        motivo:'Ingreso del apartado, registrado en ledger al firmar contrato',
      });
    }
  }catch(e){ console.error('congelar pagarés/comisiones',e); }
  toast('¡Venta registrada! 🎉','ok');
}


function refrendarApartado(aid){
  const ap=apartadosService.obtener(aid); if(!ap)return;
  const dias=Number(prompt('¿Cuántos días adicionales deseas agregar?',String(getP().vigencia_apartado_dias||15))||0); if(dias<=0)return;
  const base=new Date((ap.fecha_vencimiento||ap.fecha_apartado)+'T12:00:00'); base.setDate(base.getDate()+dias);
  const ref={id_publico:IANNA_IDS.asignar('operacion'),fecha:new Date().toISOString(),dias_adicionales:dias,nueva_fecha_vencimiento:base.toISOString().slice(0,10),usuario:CU.id};
  apartadosService.actualizar(aid,{fecha_vencimiento:ref.nueva_fecha_vencimiento,refrendos:[...(ap.refrendos||[]),ref]});
  toast('Apartado refrendado hasta '+ref.nueva_fecha_vencimiento,'ok'); renderApartados();
}
