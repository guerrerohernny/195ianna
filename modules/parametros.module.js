/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/parametros.module.js
   Módulo Parámetros (precios, gastos, modelos, UMA...).
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
// ================================================================
// PARÁMETROS
// ================================================================
function renderParametros(){
  const P=getP();
  try{ renderPoliticaComercial(); }catch(e){ console.error('renderPoliticaComercial',e); }
  $('pm-solo').value=P.precio_m2_solo||14500; if($('pm-vigencia-apartado')) $('pm-vigencia-apartado').value=P.vigencia_apartado_dias||15;
  $('pm-exc').value=P.precio_m2_exc||9000;
  $('pm-adic').value=P.precio_m2_lote_adicional||13000;
  $('pm-esq').value=P.plus_esquina||50000;
  $('pm-pq').value=P.plus_parque||50000;
  $('pm-ep').value=P.plus_esq_pq||75000;
  $('pm-dev').value=P.desarrollo||'Valle de Aragón';
  $('pm-emp').value=P.empresa||'PALIZ DESARROLLOS';
  $('pm-ger').value=P.gerente||'';
  $('pm-ases').value=P.asesor_default||'';
  renderModelosTable();
  renderGastosTable();
  renderInstTable();
}
function renderGastosTable(){
  const P=getP();
  const gastos=P.gastos_operacion||MASTER_PARAMS.gastos_operacion;
  const TIPOS=['fijo','pct_vivienda','pct_credito'];
  $('gastos-tbody').innerHTML=gastos.map((g,i)=>`<tr>
    <td><input type="text" value="${g.nombre}" onchange="updateGasto(${i},'nombre',this.value)" style="width:160px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><select onchange="updateGasto(${i},'tipo',this.value)" style="border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px">${TIPOS.map(t=>`<option value="${t}" ${g.tipo===t?'selected':''}>${t}</option>`).join('')}</select></td>
    <td><input type="number" value="${g.valor}" step="0.0001" onchange="updateGasto(${i},'valor',parseFloat(this.value))" style="width:90px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><input type="checkbox" ${g.aplica_credito!==false?'checked':''} onchange="updateGasto(${i},'aplica_credito',this.checked)"></td>
    <td><input type="checkbox" ${g.aplica_contado===true?'checked':''} onchange="updateGasto(${i},'aplica_contado',this.checked)"></td>
    <td><input type="checkbox" ${g.activo?'checked':''} onchange="updateGasto(${i},'activo',this.checked)"></td>
    <td><button class="btn btn-red btn-xs" onclick="deleteGasto(${i})">✕</button></td>
  </tr>`).join('');
}
function updateGasto(i,field,val){ const P=getP(); const g=P.gastos_operacion||MASTER_PARAMS.gastos_operacion; g[i][field]=val; parametrosService.guardar({gastos_operacion:g}); }
function deleteGasto(i){ const P=getP(); const g=[...(P.gastos_operacion||[])]; g.splice(i,1); parametrosService.guardar({gastos_operacion:g}); renderGastosTable(); }
function addGastoRow(){ const P=getP(); const g=[...(P.gastos_operacion||[])]; g.push({id:'gasto_'+Date.now(),nombre:'Nuevo concepto',tipo:'fijo',valor:0,aplica_credito:true,aplica_contado:false,activo:true}); parametrosService.guardar({gastos_operacion:g}); renderGastosTable(); }
function renderInstTable(){
  const P=getP();
  const inst=P.instituciones||MASTER_PARAMS.instituciones;
  $('inst-tbody').innerHTML=inst.map((it,i)=>`<tr>
    <td><input type="text" value="${it.nombre}" onchange="updateInst(${i},'nombre',this.value)" style="width:140px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><select onchange="updateInst(${i},'tipo',this.value);renderInstTable()" style="min-width:120px"><option value="tradicional" ${it.tipo==='tradicional'?'selected':''}>Tradicional</option><option value="mixto" ${it.tipo==='mixto'?'selected':''}>Mixto</option><option value="contado" ${it.tipo==='contado'?'selected':''}>Contado</option></select></td>
    <td><input type="text" value="${it.componente_publico||''}" ${it.tipo==='mixto'?'':'disabled'} placeholder="INFONAVIT / FOVISSSTE" onchange="updateInst(${i},'componente_publico',this.value.trim())" style="width:145px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><input type="number" min="1" value="${it.orden||i+1}" onchange="updateInst(${i},'orden',parseInt(this.value)||${i+1})" style="width:58px"></td>
    <td><input type="checkbox" ${it.activo!==false?'checked':''} onchange="updateInst(${i},'activo',this.checked)"></td>
    <td><button class="btn btn-red btn-xs" onclick="deleteInst(${i})">✕</button></td>
  </tr>`).join('');
}
function updateInst(i,field,val){ const P=getP(); const inst=P.instituciones||MASTER_PARAMS.instituciones; inst[i][field]=val; parametrosService.guardar({instituciones:inst}); }
function deleteInst(i){ const P=getP(); const inst=[...(P.instituciones||[])]; inst.splice(i,1); parametrosService.guardar({instituciones:inst}); renderInstTable(); }
function addInstRow(){ const P=getP(); const inst=[...(P.instituciones||[])]; inst.push({id:'inst_'+Date.now(),nombre:'Nueva institución',tipo:'tradicional',activo:true,orden:inst.length+1}); parametrosService.guardar({instituciones:inst}); renderInstTable(); }
function renderModelosTable(){
  const mods=DS.getModelos();
  $('modelos-tbody').innerHTML=mods.map((m,i)=>`<tr>
    <td><input type="text" value="${m.nombre}" onchange="updateModelo(${i},'nombre',this.value)" style="width:80px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><input type="number" value="${m.precio}" onchange="updateModelo(${i},'precio',this.value)" style="width:90px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><input type="number" value="${m.construccion}" onchange="updateModelo(${i},'construccion',this.value)" style="width:70px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><input type="number" value="${m.recamaras}" onchange="updateModelo(${i},'recamaras',this.value)" style="width:50px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><input type="number" value="${m.banos}" step="0.5" onchange="updateModelo(${i},'banos',this.value)" style="width:50px;border:1px solid var(--bd2);border-radius:5px;padding:3px 6px;font-size:12px"></td>
    <td><input type="checkbox" ${m.activo?'checked':''} onchange="updateModelo(${i},'activo',this.checked)"></td>
    <td><button class="btn btn-red btn-xs" onclick="deleteModelo(${i})">✕</button></td>
  </tr>`).join('');
}
function updateModelo(i,field,val){
  const mods=DS.getModelos();
  if(field==='precio'||field==='construccion'||field==='recamaras'||field==='banos') mods[i][field]=parseFloat(val)||0;
  else mods[i][field]=val;
  modelosService.guardar(mods);
}
function deleteModelo(i){
  const mods=DS.getModelos(); const mod=mods[i]; if(!mod) return;
  // ── MOTOR: un modelo usado en operaciones no se elimina — se desactiva ──
  if(IANNA_MOTOR.modeloEnUso(mod.id)){
    mods[i]={...mod, activo:false}; modelosService.guardar(mods); renderModelosTable();
    IANNA_MOTOR.auditar('modelos', mod.id, 'DESACTIVAR_MODELO', {activo:true}, {activo:false}, 'Eliminación protegida: modelo con operaciones en historial');
    toast(`"${mod.nombre}" tiene operaciones en su historial: se desactivó (no se elimina) ✓`,'warn',5000);
    return;
  }
  mods.splice(i,1); modelosService.guardar(mods); renderModelosTable();
  IANNA_MOTOR.auditar('modelos', mod.id, 'ELIMINAR_MODELO', {nombre:mod.nombre}, {}, 'Eliminación física: sin operaciones');
}
function addModeloRow(){
  const mods=DS.getModelos();
  mods.push({id:'MOD_'+uid(),nombre:'Nuevo',precio:0,construccion:0,recamaras:3,banos:2.5,desc:'',activo:true});
  modelosService.guardar(mods); renderModelosTable();
}
function saveParametros(){
  parametrosService.guardar({precio_m2_solo:parseFloat($('pm-solo').value)||14500,vigencia_apartado_dias:parseInt($('pm-vigencia-apartado')?.value)||15,precio_m2_exc:parseFloat($('pm-exc').value)||9000,precio_m2_lote_adicional:parseFloat($('pm-adic').value)||13500,plus_esquina:parseFloat($('pm-esq').value)||50000,plus_parque:parseFloat($('pm-pq').value)||50000,plus_esq_pq:parseFloat($('pm-ep').value)||75000,desarrollo:$('pm-dev').value.trim(),empresa:$('pm-emp').value.trim(),gerente:$('pm-ger').value.trim(),asesor_default:$('pm-ases').value.trim()});
  toast('Parámetros guardados ✓ — todo el sistema actualizado','ok');
}


// ══ FASE 1.9: Política Comercial editable desde Parámetros ══════
let _distDraft={asesor:[],gerente:[]}; let _cobroDistDraft={credito:null,contado:null,especiales:[]}; let _esquemasComisionDraft=[];
function renderPoliticaComercial(){
  const pol = IANNA_COM.politicaActual();
  $('pc-version').textContent = pol.version;
  $('pc-bc-viv').checked = !!pol.base_comisionable.precio_vivienda;
  $('pc-bc-exc').checked = !!pol.base_comisionable.excedente_terreno;
  $('pc-bc-plus').checked = !!pol.base_comisionable.plusvalia;
  $('pc-bc-adic').checked = !!(pol.base_comisionable.adicional||pol.base_comisionable.fraccion_fusionada||pol.base_comisionable.lote_adicional||pol.base_comisionable.construccion_adicional);
  $('pc-bc-gastos').checked = !!pol.base_comisionable.gastos_operacion;
  $('pc-desc').checked = !!pol.aplicar_descuento;
  $('pc-pct-ad').value = (pol.porcentajes.asesor_directo*100).toLocaleString('es-MX',{maximumFractionDigits:3});
  $('pc-pct-ab').value = (pol.porcentajes.asesor_broker*100).toLocaleString('es-MX',{maximumFractionDigits:3});
  $('pc-pct-ge').value = (pol.porcentajes.gerente*100).toLocaleString('es-MX',{maximumFractionDigits:3});
  $('pc-pct-bk').value = (pol.porcentajes.broker*100).toLocaleString('es-MX',{maximumFractionDigits:3});
  $('pc-contado-act').checked=!!pol.reglas_especiales?.contado?.activa;
  $('pc-contado-pct').value=((pol.reglas_especiales?.contado?.porcentaje_asesor||0.025)*100).toLocaleString('es-MX',{maximumFractionDigits:3});
  _distDraft.asesor=JSON.parse(JSON.stringify(pol.distribucion_asesor||[])); _distDraft.gerente=JSON.parse(JSON.stringify(pol.distribucion_gerente||[]));
  const d=pol.distribuciones_cobro||IANNA_COM.politicaDefault().distribuciones_cobro; _cobroDistDraft=JSON.parse(JSON.stringify(d)); renderCobroDistribuciones(); _esquemasComisionDraft=JSON.parse(JSON.stringify(pol.esquemas_comision||IANNA_COM.politicaDefault().esquemas_comision||[])); renderEsquemasComision();
  $('pc-pen-apt').value = (((pol.penalizaciones?.cancelacion_apartado?.valor)||0)*100).toFixed(2);
  $('pc-pen-ven').value = (((pol.penalizaciones?.cancelacion_venta?.valor)||0)*100).toFixed(2);
}
function renderDistRows(tipo){
  const el=$('pc-dist-'+tipo); if(!el)return;
  el.innerHTML=(_distDraft[tipo]||[]).map((x,i)=>`<div style="display:grid;grid-template-columns:1.4fr .7fr 34px;gap:6px;margin:6px 0"><input value="${x.nombre||x.parte||''}" oninput="updateDist('${tipo}',${i},'nombre',this.value)"><input type="number" step="0.001" value="${((x.pct||0)*100).toFixed(3)}" oninput="updateDist('${tipo}',${i},'pct',this.value)"><button type="button" class="btn btn-red btn-xs" onclick="removeDist('${tipo}',${i})">×</button></div>`).join('');
}
function addDistRow(tipo){ _distDraft[tipo].push({parte:'parte_'+(_distDraft[tipo].length+1),nombre:'Nueva parte',evento:'manual',pct:0}); renderDistRows(tipo); }
function removeDist(tipo,i){ _distDraft[tipo].splice(i,1); renderDistRows(tipo); }
function updateDist(tipo,i,campo,val){ if(campo==='pct') _distDraft[tipo][i].pct=(parseFloat(val)||0)/100; else _distDraft[tipo][i][campo]=val; }
function _validarDist(arr,nombre){ const sum=(arr||[]).reduce((s,x)=>s+Number(x.pct||0),0); if(Math.abs(sum-1)>0.0001){ toast(`La distribución de ${nombre} debe sumar 100%`,'err'); return false; } return true; }
function renderEsquemasComision(){
  const el=$('pc-esquemas-comision'); if(!el)return;
  el.innerHTML=_esquemasComisionDraft.map((e,ei)=>`<div class="card" style="padding:12px;margin:8px 0;border-left:4px solid var(--navy)"><div style="display:grid;grid-template-columns:1.5fr .8fr .8fr auto;gap:8px;align-items:end"><div class="fg" style="margin:0"><label>Nombre</label><input value="${e.nombre||''}" oninput="_esquemasComisionDraft[${ei}].nombre=this.value"></div><div class="fg" style="margin:0"><label>Modalidad</label><select onchange="_esquemasComisionDraft[${ei}].modalidad=this.value"><option value="credito" ${e.modalidad==='credito'?'selected':''}>Crédito</option><option value="contado" ${e.modalidad==='contado'?'selected':''}>Contado</option><option value="especial" ${e.modalidad==='especial'?'selected':''}>Especial</option></select></div><div class="fg" style="margin:0"><label>Canal</label><select onchange="_esquemasComisionDraft[${ei}].canal=this.value"><option value="directo" ${e.canal==='directo'?'selected':''}>Directo</option><option value="broker" ${e.canal==='broker'?'selected':''}>Broker</option><option value="cualquiera" ${e.canal==='cualquiera'?'selected':''}>Cualquiera</option></select></div><button class="btn btn-red btn-xs" onclick="_esquemasComisionDraft.splice(${ei},1);renderEsquemasComision()">Eliminar</button></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px"><div class="fg" style="margin:0"><label>Asesor (%)</label><input type="number" step="0.001" value="${Number((e.porcentajes?.asesor||0)*100).toLocaleString('es-MX',{maximumFractionDigits:3})}" oninput="setPctEsquema(${ei},'asesor',this.value)"></div><div class="fg" style="margin:0"><label>Gerente (%)</label><input type="number" step="0.001" value="${Number((e.porcentajes?.gerente||0)*100).toLocaleString('es-MX',{maximumFractionDigits:3})}" oninput="setPctEsquema(${ei},'gerente',this.value)"></div><div class="fg" style="margin:0"><label>Broker (%)</label><input type="number" step="0.001" value="${Number((e.porcentajes?.broker||0)*100).toLocaleString('es-MX',{maximumFractionDigits:3})}" oninput="setPctEsquema(${ei},'broker',this.value)"></div></div><div style="font-size:11px;font-weight:700;margin-top:10px">Distribución temporal</div>${(e.partes||[]).map((x,i)=>`<div style="display:grid;grid-template-columns:1.5fr .7fr 34px;gap:6px;margin-top:6px"><input value="${x.nombre||''}" oninput="_esquemasComisionDraft[${ei}].partes[${i}].nombre=this.value"><input type="number" value="${Number((x.pct||0)*100).toLocaleString('es-MX',{maximumFractionDigits:3})}" oninput="_esquemasComisionDraft[${ei}].partes[${i}].pct=(parseFloat(this.value)||0)/100"><button class="btn btn-red btn-xs" onclick="_esquemasComisionDraft[${ei}].partes.splice(${i},1);renderEsquemasComision()">×</button></div>`).join('')}<button class="btn btn-out btn-xs" style="margin-top:6px" onclick="_esquemasComisionDraft[${ei}].partes.push({parte:'parte_'+Date.now(),nombre:'Nueva parte',evento:'manual',pct:0});renderEsquemasComision()">+ Parte</button></div>`).join('');
}
function setPctEsquema(i,rol,v){if(!_esquemasComisionDraft[i].porcentajes)_esquemasComisionDraft[i].porcentajes={};_esquemasComisionDraft[i].porcentajes[rol]=(parseFloat(v)||0)/100;}
function addEsquemaComisionEspecial(){_esquemasComisionDraft.push({id:'EC-ESP-'+Date.now(),nombre:'Nuevo esquema especial',modalidad:'especial',canal:'cualquiera',porcentajes:{asesor:0,gerente:0,broker:0},partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:1}]});renderEsquemasComision();}
function validarEsquemasComision(){for(const e of _esquemasComisionDraft){const sum=(e.partes||[]).reduce((s,x)=>s+Number(x.pct||0),0);if(Math.abs(sum-1)>0.0001){toast(`La distribución de "${e.nombre}" debe sumar 100%`,'err');return false;}}return true;}

function guardarPoliticaComercial(){
  if(!_validarCobroDist()||!validarEsquemasComision()) return;
  const nueva = {
    base_comisionable: {
      precio_vivienda:$('pc-bc-viv').checked, excedente_terreno:$('pc-bc-exc').checked, plusvalia:$('pc-bc-plus').checked,
      fraccion_fusionada:$('pc-bc-adic').checked, lote_adicional:$('pc-bc-adic').checked, construccion_adicional:$('pc-bc-adic').checked,
      gastos_operacion:$('pc-bc-gastos').checked,
    },
    aplicar_descuento:$('pc-desc').checked,
    porcentajes:{ asesor_directo:(parseFloat($('pc-pct-ad').value)||0)/100, asesor_broker:(parseFloat($('pc-pct-ab').value)||0)/100, gerente:(parseFloat($('pc-pct-ge').value)||0)/100, broker:(parseFloat($('pc-pct-bk').value)||0)/100 },
    distribucion_asesor:JSON.parse(JSON.stringify(_cobroDistDraft.credito?.partes||[])), distribucion_gerente:JSON.parse(JSON.stringify(_cobroDistDraft.credito?.partes||[])), distribuciones_cobro:JSON.parse(JSON.stringify(_cobroDistDraft)), esquemas_comision:JSON.parse(JSON.stringify(_esquemasComisionDraft)),
    reglas_especiales:{contado:{activa:$('pc-contado-act').checked,porcentaje_asesor:(parseFloat($('pc-contado-pct').value)||0)/100}},
    penalizaciones:{ cancelacion_apartado:{tipo:'porcentaje',valor:(parseFloat($('pc-pen-apt').value)||0)/100,exhibiciones:1,retencion_comisiones:false}, cancelacion_venta:{tipo:'porcentaje',valor:(parseFloat($('pc-pen-ven').value)||0)/100,exhibiciones:1,retencion_comisiones:false,distribucion:[]} }
  };
  const guardada=IANNA_COM.guardarPolitica(nueva,'Cambio manual desde Parámetros'); renderPoliticaComercial(); toast('Política Comercial guardada como '+guardada.version+' ✓','ok');
}

/* ── FASE 1.95 · BLOQUE 10: navegación por categorías ─────────────── */
function paramTab(cat){
  document.querySelectorAll('.ptab-pane').forEach(el=>el.style.display='none');
  const pane=document.getElementById('ptab-'+cat); if(pane) pane.style.display='';
  document.querySelectorAll('#param-tabs .btn').forEach(b=>b.className='btn btn-sm btn-out');
  const btn=document.getElementById('ptab-btn-'+cat); if(btn) btn.className='btn btn-sm btn-navy';
  if(cat==='sistema') _renderParamSistema();
}
function _renderParamSistema(){
  const el=document.getElementById('param-sys-info'); if(!el) return;
  let pol='v1'; try{ pol=IANNA_COM.politicaActual().version; }catch(e){}
  let movs=0; try{ movs=IANNA_FIN.ledgerCompleto().length; }catch(e){}
  el.innerHTML=[
    ['Versión de esquema de datos','1.96 (Business Rules & UX Hardening)'],
    ['Política comercial vigente',pol],
    ['Política de autorización',(typeof AUTORIZADOR!=='undefined')?AUTORIZADOR.politicaAplicada():'—'],
    ['Movimientos en el Ledger',movs+' (inmutable, append-only)'],
  ].map(r=>`<div><b>${r[0]}:</b> ${r[1]}</div>`).join('');
}

function renderCobroDistribuciones(){
  ['credito','contado'].forEach(tipo=>{ const el=$('pc-dist-'+tipo); if(!el)return; const dist=_cobroDistDraft[tipo]; el.innerHTML=(dist?.partes||[]).map((x,i)=>`<div style="display:grid;grid-template-columns:1.4fr .7fr 34px;gap:6px;margin:6px 0"><input value="${x.nombre||''}" oninput="updateCobroDist('${tipo}',${i},'nombre',this.value)"><input type="number" step="0.001" value="${(Number(x.pct||0)*100).toFixed(3)}" oninput="updateCobroDist('${tipo}',${i},'pct',this.value)"><button type="button" class="btn btn-red btn-xs" onclick="removeCobroDist('${tipo}',${i})">×</button></div>`).join(''); });
  const e=$('pc-dist-especiales'); if(e)e.innerHTML=(_cobroDistDraft.especiales||[]).map((d,di)=>`<div class="card" style="padding:10px;margin:8px 0"><div style="display:flex;gap:8px;align-items:center"><input value="${d.nombre}" oninput="_cobroDistDraft.especiales[${di}].nombre=this.value" style="flex:1"><button class="btn btn-red btn-xs" onclick="_cobroDistDraft.especiales.splice(${di},1);renderCobroDistribuciones()">Eliminar</button></div>${(d.partes||[]).map((x,i)=>`<div style="display:grid;grid-template-columns:1.4fr .7fr 34px;gap:6px;margin-top:6px"><input value="${x.nombre}" oninput="updateEspecialDist(${di},${i},'nombre',this.value)"><input type="number" value="${(x.pct*100).toFixed(3)}" oninput="updateEspecialDist(${di},${i},'pct',this.value)"><button class="btn btn-red btn-xs" onclick="_cobroDistDraft.especiales[${di}].partes.splice(${i},1);renderCobroDistribuciones()">×</button></div>`).join('')}<button class="btn btn-out btn-xs" onclick="_cobroDistDraft.especiales[${di}].partes.push({parte:'parte_'+Date.now(),nombre:'Nueva parte',evento:'manual',pct:0});renderCobroDistribuciones()">+ Parte</button></div>`).join('');
}
function addCobroDistRow(tipo){ _cobroDistDraft[tipo].partes.push({parte:'parte_'+Date.now(),nombre:'Nueva parte',evento:'manual',pct:0}); renderCobroDistribuciones(); }
function removeCobroDist(tipo,i){ _cobroDistDraft[tipo].partes.splice(i,1); renderCobroDistribuciones(); }
function updateCobroDist(tipo,i,campo,val){ _cobroDistDraft[tipo].partes[i][campo]=campo==='pct'?(parseFloat(val)||0)/100:val; }
function addDistribucionEspecial(){ _cobroDistDraft.especiales.push({id:'DCO-ESP-'+Date.now(),nombre:'Nueva distribución especial',tipo:'especial',partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:1}]}); renderCobroDistribuciones(); }
function updateEspecialDist(di,i,campo,val){ _cobroDistDraft.especiales[di].partes[i][campo]=campo==='pct'?(parseFloat(val)||0)/100:val; }
function _validarCobroDist(){ const ds=[_cobroDistDraft.credito,_cobroDistDraft.contado,...(_cobroDistDraft.especiales||[])]; for(const d of ds){ const sum=(d.partes||[]).reduce((s,x)=>s+Number(x.pct||0),0); if(Math.abs(sum-1)>0.0001){toast('La distribución "'+d.nombre+'" debe sumar 100%','err');return false;} } return true; }
