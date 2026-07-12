function syncNombreCierre(){ const n=[$('c-nombres')?.value,$('c-apellido-paterno')?.value,$('c-apellido-materno')?.value].filter(Boolean).join(' ').replace(/\s+/g,' ').trim(); if($('c-nombre')) $('c-nombre').value=n; return n; }
/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/cierre.module.js
   Módulo Cierre: captura de cliente, corrida financiera, pagarés, vista previa.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
// ════════════════════════════════════════════════════════════════
// GENERAR CIERRE
// ════════════════════════════════════════════════════════════════
let _cierreData = null; // stores current cierre context

function generarCierre(aid){
  const ap = DS.findOne('apartados', aid);
  if(!ap){ toast('Apartado no encontrado','err'); return; }
  const l = getLote(ap.clave_lote);
  const m = getMod(ap.modelo_id);
  const p = DS.findOne('prospectos', ap.prospectoId);
  if(!l||!m){ toast('Datos del lote o modelo incompletos','err'); return; }

  // Verify dirección oficial
  if(!l.dir_oficial){
    const dir = prompt(`El lote ${ap.clave_lote} no tiene dirección oficial.\nCaptura la dirección oficial:`);
    if(!dir){ toast('Se requiere la dirección oficial para generar el cierre','err'); return; }
    inventarioService.actualizarPorClave(ap.clave_lote,{dir_oficial:dir.trim()});
    l.dir_oficial = dir.trim();
  }

  // Generate or get numero de cliente
  const numCliente = getOrCreateNumCliente(ap.prospectoId);

  // Folio del recibo: si el apartado YA tiene folio, se reutiliza SIEMPRE
  // (reabrir un cierre jamás cambia el folio de un documento emitido).
  const folio = ap.folio_recibo ? String(ap.folio_recibo).padStart(8,'0') : getNextFolio();

  // Store context
  _cierreData = {ap, l, m, p, numCliente, folio, asesorNombre:(getUser(ap.asesor)?.nombre)||CU.nombre, formaPago:(FORMA_PAGO_TXT[ap.metodo_pago]||ap.metodo_pago||null)};

  // Mapear estado civil del prospecto al formato del cierre ("Casado" → "Casado(a)")
  const ECMAP={'Soltero':'Soltero(a)','Casado':'Casado(a)','Divorciado':'Divorciado','Viudo':'Viudo(a)','Unión libre':'Unión libre'};
  const estadoCivilProspecto = p?.estadoCivil ? (ECMAP[p.estadoCivil]||p.estadoCivil) : 'Soltero(a)';

  // Pre-fill client data from prospecto
  const _ecMap={'Soltero':'Soltero(a)','Casado':'Casado(a)','Divorciado':'Divorciado','Viudo':'Viudo(a)','Unión libre':'Unión libre'};
  if(p){
    $('c-nombres').value = p.nombre||''; $('c-apellido-paterno').value=''; $('c-apellido-materno').value=''; syncNombreCierre();
    $('c-cel').value = p.telefono||'';
    $('c-email').value = p.correo||'';
    $('c-estado-civil').value = _ecMap[p.estadoCivil]||p.estadoCivil||'Soltero(a)';
  }
  $('c-num-cliente').value = numCliente;
  $('c-ciudad').value = 'Culiacán';
  $('c-municipio').value = 'Culiacán';
  $('c-nacionalidad').value = 'Mexicana';
  $('prev-folio').textContent = folio;

  // Si ya existe un cierre previo guardado para este apartado, restaurar TODOS los campos
  const dc = ap.datos_cierre;
  if(dc){
    $('c-nombres').value=dc.nombres||dc.nombre||$('c-nombres').value; $('c-apellido-paterno').value=dc.apellido_paterno||''; $('c-apellido-materno').value=dc.apellido_materno||''; syncNombreCierre();
    $('c-curp').value = dc.curp||'';
    $('c-rfc').value = dc.rfc||'';
    $('c-nacimiento').value = dc.nacimiento||'';
    $('c-sexo').value = dc.sexo||'H';
    $('c-estado-civil').value = dc.estadoCivil||estadoCivilProspecto;
    $('c-regimen').value = dc.regimen||'';
    $('c-lugar-nac').value = dc.lugarNac||'Culiacán';
    $('c-nacionalidad').value = dc.nacionalidad||'Mexicana';
    $('c-cel').value = dc.cel||$('c-cel').value;
    $('c-email').value = dc.email||$('c-email').value;
    $('c-calle').value = dc.calle||'';
    $('c-colonia').value = dc.colonia||'';
    $('c-cp').value = dc.cp||'';
    $('c-ciudad').value = dc.ciudad||'Culiacán';
    $('c-municipio').value = dc.municipio||'Culiacán';
    $('c-conyuge-nombre').value = dc.conyugeNombre||'';
    $('c-conyuge-curp').value = dc.conyugeCurp||'';
    $('c-conyuge-rfc').value = dc.conyugeRfc||'';
    $('c-conyuge-nac').value = dc.conyugeNac||'';
    $('c-conyuge-cel').value = dc.conyugeCel||'';
    $('c-ref-nombre').value = dc.refNombre||'';
    $('c-ref-parentesco').value = dc.refParentesco||'';
    $('c-ref-cel').value = dc.refCel||'';
    $('c-empresa').value = dc.empresa||'';
    $('c-puesto').value = dc.puesto||'';
    $('c-ingresos').value = dc.ingresos||'';
    $('c-comprobacion').value = dc.comprobacion||'';
    $('c-tipo-credito').value = dc.tipoCredito||'contado';
    $('c-banco').value = dc.banco||'';
    $('c-plazo-credito').value = dc.plazoCredito||'';

    // ── Restaurar datos financieros guardados (tab 2) ──
    if(dc.fin_credito!==undefined){
      $('c-credito').value = dc.fin_credito||'';
      $('c-descuento').value = dc.fin_descuento||'';
      $('c-pago-adic').value = dc.fin_pago_adic||'';
      $('c-plazo').value = dc.fin_plazo||$('c-plazo').value;
      $('c-fecha-primer-pago').value = dc.fin_fecha_primer_pago||'';
      $('c-forma-pago').value = dc.fin_forma_pago||$('c-forma-pago').value;
    }
  } else {
    // Sin cierre previo: limpiar a valores por defecto (no dejar datos de otro cliente)
    ['c-curp','c-rfc','c-nacimiento','c-regimen','c-calle','c-colonia','c-cp',
     'c-conyuge-nombre','c-conyuge-curp','c-conyuge-rfc','c-conyuge-nac','c-conyuge-cel',
     'c-ref-nombre','c-ref-parentesco','c-ref-cel','c-empresa','c-puesto','c-ingresos',
     'c-comprobacion','c-banco','c-plazo-credito'].forEach(id=>{ if($(id)) $(id).value=''; });
    if($('c-sexo')) $('c-sexo').value='H';
    if($('c-estado-civil')) $('c-estado-civil').value=estadoCivilProspecto;
    if($('c-tipo-credito')) $('c-tipo-credito').value='contado';
  }

  // Set title
  $('cierre-ttl-sub').textContent = `${ubicacionLote(l)} — ${m.nombre} — ${p?p.nombre:'Cliente'}`;

  // Financial tab: show lot summary
  const P = getP();
  const pExc = P.precio_m2_exc||9000;
  const pFrac = P.precio_m2_lote_adicional||13000;
  const dValor = IANNA_VALOR.desglose(ap);
  const vCasa = dValor.vivienda;
  const vExc = dValor.excedente;
  const fracM2 = l.fraccion_fusionada?(l.fraccion_m2_adicional||0):0;
  const pFracLote = l.fraccion_precio_m2||pFrac;
  const vFrac = dValor.fraccion_fusionada;
  const vPlus = dValor.plusvalia;
  const vTotal = dValor.total;
  const gastosParam = P.gastos_operacion||MASTER_PARAMS.gastos_operacion;
  const gastos = gastosParam.filter(g=>g.activo).map(g=>{
    let monto=0;
    if(g.tipo==='fijo') monto=g.valor;
    else if(g.tipo==='pct_vivienda') monto=vTotal*g.valor;
    else if(g.tipo==='pct_credito') monto=0; // calculated after credito input
    return {...g,monto};
  });
  const vGastosFijos = gastos.filter(g=>g.tipo!=='pct_credito').reduce((s,g)=>s+g.monto,0);

  $('cierre-resumen-lote').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:12px">
      <div><div style="color:var(--t3);font-size:10px">LOTE</div><div style="font-weight:700">${l.clave_fisica||IANNA_FMT.UBICACION(l.mz,l.lote)}</div></div>
      <div><div style="color:var(--t3);font-size:10px">MODELO</div><div style="font-weight:700">${m.nombre}</div></div>
      <div><div style="color:var(--t3);font-size:10px">TERRENO</div><div style="font-weight:700">${f3(l.terreno)}m²</div></div>
      <div><div style="color:var(--t3);font-size:10px">EXCEDENTE</div><div style="font-weight:700">${f3(l.excedente)}m²</div></div>
      <div><div style="color:var(--t3);font-size:10px">PRECIO VIVIENDA</div><div style="font-weight:700">${mxn(vCasa)}</div></div>
      <div><div style="color:var(--t3);font-size:10px">EXCEDENTE</div><div style="font-weight:700">${mxn(vExc)}</div></div>
      ${fracM2>0?`<div><div style="color:var(--t3);font-size:10px">FRACCIÓN</div><div style="font-weight:700">${mxn(vFrac)}</div></div>`:''}
      ${vPlus>0?`<div><div style="color:var(--t3);font-size:10px">PLUSVALÍA</div><div style="font-weight:700">${mxn(vPlus)}</div></div>`:''}
      <div><div style="color:var(--t3);font-size:10px">VALOR VIVIENDA</div><div style="font-weight:700;color:var(--navy)">${mxn(vTotal)}</div></div>
      <div><div style="color:var(--t3);font-size:10px">APARTADO YA DADO</div><div style="font-weight:700;color:#dc2626">−${mxn(ap.monto_enganche||50000)}</div></div>
      <div><div style="color:var(--t3);font-size:10px">GASTOS (est.)</div><div style="font-weight:700">${mxn(vGastosFijos)}</div></div>
    </div>`;

  // Set default fecha primer pago (next month, day 1)
  // Defaults financieros — SOLO si este apartado no tiene financieros guardados (si los tiene, ya se restauraron arriba)
  if(!(ap.datos_cierre && ap.datos_cierre.fin_credito!==undefined)){
    const dp = new Date(); dp.setMonth(dp.getMonth()+1); dp.setDate(1);
    $('c-fecha-primer-pago').value = dp.toISOString().split('T')[0];
    $('c-credito').value = '';
    $('c-descuento').value = '';
    $('c-pago-adic').value = '';
    $('c-plazo').value = '0';
  }

  cargarInstitucionesCierre();
  const _dcf=ap.datos_cierre||{};
  if($('c-credito-pct')) $('c-credito-pct').value=Number(_dcf.fin_credito_pct||0).toLocaleString('es-MX',{maximumFractionDigits:3});
  if($('c-publico-monto')) $('c-publico-monto').value=_dcf.fin_componente_publico_monto||'';
  _cierreGastos=Array.isArray(_dcf.fin_gastos_operacion)&&_dcf.fin_gastos_operacion.length?JSON.parse(JSON.stringify(_dcf.fin_gastos_operacion)):IANNA_VALOR.gastosSugeridos(ap,parseMoneyInput($('c-credito').value),IANNA_VALOR.institucion($('c-institucion')?.value)?.tipo);
  renderGastosCierre();
  calcCierre();
  window._cierreLocked=false;
  ['cierre-tab-0','cierre-tab-1'].forEach(tid=>{ const t=$(tid); if(t&&t.querySelectorAll) t.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=false); });
  const _ub=$('btn-cierre-unlock'); if(_ub) _ub.style.display='none';
  const _bv=$('btn-descargar-cierre'); if(_bv) _bv.style.display = (DS.findOne('apartados',aid)?.estatus==='Venta')?'none':'';
  renderEsquemasComisionCierre();
  cierreTab(0);
  openM('m-cierre');
  if(typeof updateCierreWorkflowUI==='function') updateCierreWorkflowUI();
}


function guardarDatosCierre(){
  if(!_cierreData){ toast('Abre un cierre primero','err'); return; }
  const cli = getClienteData();
  apartadosService.actualizar( _cierreData.ap.id, {
    datos_cierre: cli,
    folio_recibo: IANNA_MOTOR.asegurarFolioCierre()
  });
  toast('Datos del cliente guardados ✓','ok');
}
function getOrCreateNumCliente(prospectoId){
  const p=prospectosService.obtener(prospectoId);
  if(!p) return '';
  if(p.id_cliente) return p.id_cliente;
  const cli=IANNA_IDS.asignar('cliente');
  prospectosService.actualizar(prospectoId,{id_cliente:cli});
  return cli;
}

function getNextFolio(){
  // Fase 1.5: delega al servicio central de folios (escanea TODAS las
  // fuentes: recibos, pagos, cancelaciones y registro). Solo consulta,
  // no consume: la emisión en firme ocurre al guardar (IANNA_FOLIOS.emitir).
  return IANNA_FOLIOS.peek();
}

function cierreTab(n){
  for(let i=0;i<4;i++){
    const tab = $('cierre-tab-'+i);
    const btn = $('ctab'+i);
    if(tab) tab.style.display = i===n?'block':'none';
    if(btn){
      btn.style.borderBottom = i===n?'3px solid var(--navy)':'3px solid transparent';
      btn.style.color = i===n?'var(--navy)':'var(--t3)';
      btn.style.fontWeight = i===n?'700':'400';
    }
  }
  if(n===2) updateCierrePreview();
  if(n===3) renderCobranza();
}

let _cierreGastos=[];
let _syncCreditoLock=false;
function cargarInstitucionesCierre(){
  const sel=$('c-institucion'); if(!sel)return;
  const actuales=IANNA_VALOR.instituciones();
  sel.innerHTML=actuales.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
  const dc=_cierreData?.ap?.datos_cierre||{}; sel.value=dc.fin_institucion_id||dc.tipoCredito||'contado'; if(!sel.value&&actuales[0])sel.value=actuales[0].id;
  onInstitucionChange();
}
function onInstitucionChange(){
  const inst=IANNA_VALOR.institucion($('c-institucion')?.value)||{tipo:'tradicional'};
  const mixto=inst.tipo==='mixto';
  if($('c-publico-wrap')) $('c-publico-wrap').style.display=mixto?'':'none';
  if($('c-publico-label')) $('c-publico-label').textContent='Monto aportado por '+(inst.componente_publico||'componente público');
  if(inst.tipo==='contado'){
    $('c-credito').value=''; $('c-credito-pct').value='0.000';
  }
  if(_cierreData){
    const sugeridos=IANNA_VALOR.gastosSugeridos(_cierreData.ap,parseMoneyInput($('c-credito').value),inst.tipo);
    const prev=Array.isArray(_cierreGastos)?_cierreGastos:[];
    const manuales=prev.filter(g=>g.origen==='manual');
    _cierreGastos=sugeridos.map(sug=>{
      const existente=prev.find(g=>g.id&&g.id===sug.id);
      return (existente&&existente.modificado_manualmente)?{...sug,...existente}:sug;
    }).concat(manuales);
    renderGastosCierre();
  }
}
function syncCreditoDesdePct(){
  if(_syncCreditoLock||!_cierreData)return; _syncCreditoLock=true;
  const base=IANNA_VALOR.valorTotalVivienda(_cierreData.ap); const pct=Math.max(0,Math.min(100,parseFloat($('c-credito-pct').value)||0));
  $('c-credito').value=IANNA_FMT.MXN(base*pct/100).replace('$',''); _syncCreditoLock=false; calcCierre();
}
function syncCreditoDesdeMonto(){
  if(_syncCreditoLock||!_cierreData)return; _syncCreditoLock=true;
  const base=IANNA_VALOR.valorTotalVivienda(_cierreData.ap); const monto=parseMoneyInput($('c-credito').value);
  $('c-credito-pct').value=base?((monto/base)*100).toLocaleString('es-MX',{maximumFractionDigits:3}):'0'; _syncCreditoLock=false; calcCierre();
}
function renderGastosCierre(){
  const el=$('cierre-gastos-editor'); if(!el)return;
  el.innerHTML=_cierreGastos.map((g,i)=>`<div style="display:grid;grid-template-columns:1.5fr .8fr 34px;gap:6px;margin:5px 0"><input value="${g.nombre||''}" oninput="_cierreGastos[${i}].nombre=this.value"><input inputmode="numeric" value="${IANNA_FMT.MXN(g.monto_aplicado||0).replace('$','')}" oninput="formatMoneyInput(this);_cierreGastos[${i}].monto_aplicado=parseMoneyInput(this.value);_cierreGastos[${i}].modificado_manualmente=true;_cierreGastos[${i}].usuario_modificacion=CU?.id||'system';_cierreGastos[${i}].fecha_modificacion=new Date().toISOString();calcCierre({skipGastosRender:true})"><button type="button" class="btn btn-red btn-xs" onclick="removeGastoCierre(${i})">×</button></div>`).join('');
}
function addGastoCierre(){ _cierreGastos.push({id:null,nombre:'Nuevo gasto',origen:'manual',tipo:'manual',monto_calculado:0,monto_aplicado:0,modificado_manualmente:true,usuario_modificacion:CU?.id||'system',fecha_modificacion:new Date().toISOString()}); renderGastosCierre(); }
function removeGastoCierre(i){ _cierreGastos.splice(i,1); renderGastosCierre(); calcCierre(); }

function validarFinanciamientoCierre(){
  if(!_cierreData) return {ok:false,error:'No hay cierre activo'};
  const inst=IANNA_VALOR.institucion($('c-institucion')?.value)||null;
  if(!inst) return {ok:false,error:'Selecciona una institución o modalidad de financiamiento'};
  const base=IANNA_VALOR.valorTotalVivienda(_cierreData.ap);
  const credito=parseMoneyInput($('c-credito')?.value||'0');
  const publico=parseMoneyInput($('c-publico-monto')?.value||'0');
  if(inst.tipo==='contado' && credito!==0) return {ok:false,error:'Una operación de Contado debe tener crédito $0'};
  if(credito<0 || credito>base) return {ok:false,error:'El crédito debe estar entre $0 y el Valor Total de la Vivienda'};
  if(inst.tipo==='mixto'){
    if(publico<=0) return {ok:false,error:`Captura el monto aportado por ${inst.componente_publico||'el componente público'}`};
    if(publico>credito) return {ok:false,error:'El monto del componente público no puede ser mayor al crédito total'};
  }
  return {ok:true};
}

function calcCierre(opts){ opts=opts||{};
  if(!_cierreData) return;
  const {ap,l,m} = _cierreData;
  const P = getP();
  const pExc = P.precio_m2_exc||9000;
  const pFrac = P.precio_m2_lote_adicional||13000;
  const dValor = IANNA_VALOR.desglose(ap);
  const vCasa = dValor.vivienda;
  const vExc = dValor.excedente;
  const fracM2 = l.fraccion_fusionada?(l.fraccion_m2_adicional||0):0;
  const vFrac = dValor.fraccion_fusionada;
  const vPlus = dValor.plusvalia;
  const vConstrAdic = dValor.construccion_adicional;
  const constrAdicDesc = ap.construccion_adicional_desc||'';
  const constrAdicM2 = ap.construccion_adicional_m2||0;
  let vLoteAdic = dValor.lote_adicional, loteAdicData = null;
  if(ap.clave_lote_adicional) loteAdicData = getLote(ap.clave_lote_adicional);
  const vTotalVivienda = dValor.total;

  const credito = parseMoneyInput($('c-credito').value);
  const inst=IANNA_VALOR.institucion($('c-institucion')?.value)||{id:'contado',nombre:'Contado',tipo:'contado'};
  if(!_cierreGastos.length) _cierreGastos=IANNA_VALOR.gastosSugeridos(ap,credito,inst.tipo);
  // Recalcular únicamente gastos automáticos no modificados; los ajustes de esta operación se respetan.
  const sugeridos=IANNA_VALOR.gastosSugeridos(ap,credito,inst.tipo);
  _cierreGastos=_cierreGastos.map(g=>{ const sug=sugeridos.find(x=>x.id===g.id); return (sug&&!g.modificado_manualmente)?{...sug}:g; });
  const gastosCalc=_cierreGastos.map(g=>({...g,monto:Number(g.monto_aplicado||0)}));
  const vGastos = gastosCalc.reduce((s,g)=>s+Number(g.monto_aplicado||g.monto||0),0);
  const vTotalOp = vTotalVivienda + vGastos;

  const apartado = ap.monto_enganche||50000;
  const descuento = parseMoneyInput($('c-descuento').value);
  const pagoAdic = parseMoneyInput($('c-pago-adic').value);
  const vDesembolso = vTotalOp - apartado - descuento - pagoAdic - credito;

  // Payment schedule
  const plazo = parseInt($('c-plazo').value)||0;
  let pagares = [];
  if(plazo>0 && vDesembolso>0){
    const base = Math.floor(vDesembolso/plazo);
    const ultimo = vDesembolso - base*(plazo-1);
    const fechaBase = $('c-fecha-primer-pago').value ? new Date($('c-fecha-primer-pago').value+'T12:00:00') : new Date();
    pagares = Array.from({length:plazo},(_,i)=>{
      const d = new Date(fechaBase); d.setMonth(d.getMonth()+i);
      return {n:i+1, fecha:d, monto: i===plazo-1?ultimo:base};
    });
  }

  // Store for PDF generation
  _cierreData.vTotalVivienda = vTotalVivienda;
  _cierreData.vConstrAdic = vConstrAdic;
  _cierreData.constrAdicDesc = constrAdicDesc;
  _cierreData.constrAdicM2 = constrAdicM2;
  _cierreData.vLoteAdic = vLoteAdic;
  _cierreData.loteAdicData = loteAdicData;
  _cierreData.gastosCalc = gastosCalc;
  _cierreData.vGastos = vGastos;
  _cierreData.vTotalOp = vTotalOp;
  _cierreData.apartado = apartado;
  _cierreData.descuento = descuento;
  _cierreData.pagoAdic = pagoAdic;
  _cierreData.credito = credito;
  _cierreData.creditoPct = parseFloat($('c-credito-pct')?.value)||0;
  _cierreData.institucion = inst;
  _cierreData.componentePublicoMonto = parseMoneyInput($('c-publico-monto')?.value||'0');
  _cierreData.complementoBancario = Math.max(0, credito-_cierreData.componentePublicoMonto);
  _cierreData.vDesembolso = vDesembolso;
  _cierreData.pagares = pagares;
  _cierreData.plazo = plazo;
  const apCalc={...ap,datos_cierre:{...(ap.datos_cierre||{}),fin_descuento:String(descuento),tipoCredito:inst.tipo,esquema_comision_id:$('c-distribucion-comision')?.value||''},financial_snapshot:{...(ap.financial_snapshot||{}),tipo_financiamiento:inst.tipo,esquema_comision_id:$('c-distribucion-comision')?.value||''}};
  const comCalc=IANNA_COM.comisionAsesor(apCalc);
  _cierreData.financialSnapshot=IANNA_VALOR.snapshot(ap,{
    gastos:gastosCalc, apartado, descuento, pago_adicional:pagoAdic, forma_pago_adicional:$('c-forma-pago')?.value||'',
    institucion_id:inst.id, institucion_nombre:inst.nombre, tipo_financiamiento:inst.tipo,
    credito_pct:_cierreData.creditoPct, credito_monto:credito,
    componente_publico_tipo:inst.componente_publico||'', componente_publico_monto:_cierreData.componentePublicoMonto,
    complemento_bancario:_cierreData.complementoBancario, desembolso:vDesembolso,
    base_comisionable:comCalc.base, base_snapshot:(()=>{const d=IANNA_VALOR.desglose(apCalc);return {precio_vivienda:d.vivienda,excedente_terreno:d.excedente,fraccion_fusionada:d.fraccion_fusionada,lote_adicional:d.lote_adicional,construccion_adicional:d.construccion_adicional,plusvalia:d.plusvalia,descuento,bruto:vTotalVivienda,total:comCalc.base};})(), politica_version:comCalc.politica_version,
    regla_especial_aplicada:comCalc.regla_especial_aplicada, porcentaje_comision:comCalc.porcentaje,
    distribucion_comision_id:$('c-distribucion-comision')?.value||'', esquema_comision_id:$('c-distribucion-comision')?.value||'', distribucion_comision:comCalc.partes
  });

  if($('c-complemento')) $('c-complemento').textContent = inst.tipo==='mixto' ? ('Financiamiento total: '+IANNA_FMT.MXN(credito)+' · Crédito bancario: '+IANNA_FMT.MXN(_cierreData.complementoBancario)) : '';
  if(!opts.skipGastosRender) renderGastosCierre();

  // Render financial table
  const rows = [
    ['Valor vivienda — '+m.nombre, mxn(vCasa)],
    ...(l.excedente>0?[['Terreno excedente ('+f3(l.excedente)+'m² × '+mxn(pExc)+'/m²)', mxn(vExc)]]:[]),
    ...(fracM2>0?[['Fracción fusionada ('+f3(fracM2)+'m² × '+mxn(l.fraccion_precio_m2||pFrac)+'/m²)', mxn(vFrac)]]:[]),
    ...(vPlus>0?[['Plusvalía — '+l.tipo, mxn(vPlus)]]:[]),
    ...(vConstrAdic>0?[['Construcción adicional'+(constrAdicDesc?' — '+constrAdicDesc:'')+(constrAdicM2?' ('+f3(constrAdicM2)+'m²)':''), mxn(vConstrAdic)]]:[]),
    ...(vLoteAdic>0?[['Lote adicional '+(loteAdicData?ubicacionLote(loteAdicData):'')+' ('+(loteAdicData?f3(loteAdicData.terreno):'0')+'m² × '+mxn(pFrac)+'/m²)', mxn(vLoteAdic)]]:[]),
    ['VALOR TOTAL DE LA VIVIENDA', mxn(vTotalVivienda), true],
    ...gastosCalc.map(g=>[g.nombre, mxn(g.monto_aplicado||g.monto)]),
    ['TOTAL GASTOS DE OPERACIÓN', mxn(vGastos), true],
    ['VALOR TOTAL DE LA OPERACIÓN', mxn(vTotalOp), true, 'navy'],
    ['Apartado', '− '+mxn(apartado)],
    ...(descuento>0?[['Descuento', '− '+mxn(descuento)]]:[]),
    ...(pagoAdic>0?[['Pago adicional', '− '+mxn(pagoAdic)]]:[]),
    ...(credito>0?(inst.tipo==='mixto'?[['Crédito bancario', '− '+mxn(_cierreData.complementoBancario)],[inst.componente_publico||'Componente público', '− '+mxn(_cierreData.componentePublicoMonto)]]:[['Crédito hipotecario', '− '+mxn(credito)]]):[]),
    ['MONTO A PAGAR (DESEMBOLSO)', mxn(Math.max(0,vDesembolso)), true, 'gold'],
  ];

  $('cierre-financiero').innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
    ${rows.map(r=>`<tr class="${r[2]?(r[3]==='navy'?'summary-row summary-row-dark':r[3]==='gold'?'summary-row summary-row-gold':'summary-row'):''}" style="border-bottom:1px solid var(--s2)${r[2]&&!r[3]?';background:var(--s2)':''}">
      <td style="padding:7px 12px;${r[2]?'font-weight:700;color:'+(r[3]==='navy'||r[3]==='gold'?'#fff':'var(--t1)'):''}">${r[0]}</td>
      <td style="text-align:right;padding:7px 12px;font-weight:${r[2]?'700':'400'};${r[2]?'color:'+(r[3]==='navy'||r[3]==='gold'?'#fff':'var(--t1)'):''}">${r[1]}</td>
    </tr>`).join('')}
  </table>`;

  $('prev-pagares-n').textContent = pagares.length > 0 ? pagares.length : 'Contado';

  if(pagares.length>0){
    $('cierre-pagares').innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">Esquema de pagos / Pagarés</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="background:var(--s2)"><th style="padding:6px 12px;text-align:left">Pagaré #</th><th style="padding:6px 12px;text-align:left">Fecha</th><th style="padding:6px 12px;text-align:right">Monto</th></tr></thead>
        <tbody>${pagares.map(p=>`<tr style="border-bottom:1px solid var(--s2)"><td style="padding:5px 12px">${p.n}/${plazo}</td><td style="padding:5px 12px">${p.fecha.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'})}</td><td style="padding:5px 12px;text-align:right;font-weight:600">${mxn(p.monto)}</td></tr>`).join('')}
        <tr style="background:var(--s2);font-weight:700"><td colspan="2" style="padding:6px 12px">Total</td><td style="padding:6px 12px;text-align:right">${mxn(vDesembolso)}</td></tr>
        </tbody>
      </table>`;
  } else {
    $('cierre-pagares').innerHTML = '';
  }
}

function updateCierrePreview(){
  if(!_cierreData) return;
  const {ap,l,m,numCliente,folio,vTotalVivienda,vTotalOp,vDesembolso,pagares,plazo} = _cierreData;
  const nombre = syncNombreCierre()||'—';
  const rb=$('prev-recibo-adicional-btn'), rm=$('prev-recibo-adicional-meta');
  if(rb){ const tiene=Number(_cierreData.pagoAdic||0)>0; rb.style.display=tiene?'flex':'none'; if(tiene&&rm){ const apNow=apartadosService.obtener(ap.id); const st=IANNA_CIERRE.estado(apNow); const fol=apNow?.recibo_pago_adicional?.folio||apNow?.recibo_pago_adicional_folio||''; rm.textContent=(fol?'('+fol+') ':'')+(st===IANNA_CIERRE.ESTADOS.VALIDADO?'— emitido, pendiente de confirmación':'— vista previa sin folio'); } }
  $('cierre-preview-resumen').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px">
      <div><b>Cliente:</b> ${nombre}</div>
      <div><b>No. Cliente:</b> ${numCliente}</div>
      <div><b>Lote:</b> ${l.clave_fisica||IANNA_FMT.UBICACION(l.mz,l.lote)}</div>
      <div><b>Modelo:</b> ${m.nombre}</div>
      <div><b>Valor vivienda:</b> ${mxn(vTotalVivienda)}</div>
      <div><b>Valor total operación:</b> ${mxn(vTotalOp)}</div>
      <div><b>Apartado:</b> ${mxn(_cierreData.apartado)}</div>
      <div><b>Monto a pagar:</b> ${mxn(Math.max(0,vDesembolso))}</div>
      <div><b>Esquema:</b> ${plazo>0?plazo+' pago(s)':'Contado'}</div>
      <div><b>Folio recibo:</b> ${folio}</div>
    </div>`;
}

function recolectarDatosCierreForm(){
  return {
    nombre: syncNombreCierre(), nombres:$('c-nombres')?.value.trim()||'', apellido_paterno:$('c-apellido-paterno')?.value.trim()||'', apellido_materno:$('c-apellido-materno')?.value.trim()||'',
    curp: $('c-curp').value.trim(),
    rfc: $('c-rfc').value,
    nacimiento: $('c-nacimiento').value,
    sexo: $('c-sexo').value,
    estadoCivil: $('c-estado-civil').value,
    regimen: $('c-regimen').value,
    lugarNac: $('c-lugar-nac').value,
    nacionalidad: $('c-nacionalidad').value,
    cel: $('c-cel').value,
    email: $('c-email').value,
    calle: $('c-calle').value,
    colonia: $('c-colonia').value,
    cp: $('c-cp').value,
    ciudad: $('c-ciudad').value,
    municipio: $('c-municipio').value,
    conyugeNombre: $('c-conyuge-nombre').value,
    conyugeCurp: $('c-conyuge-curp').value,
    conyugeRfc: $('c-conyuge-rfc').value,
    conyugeNac: $('c-conyuge-nac').value,
    conyugeCel: $('c-conyuge-cel').value,
    refNombre: $('c-ref-nombre').value,
    refParentesco: $('c-ref-parentesco').value,
    refCel: $('c-ref-cel').value,
    empresa: $('c-empresa').value,
    puesto: $('c-puesto').value,
    ingresos: $('c-ingresos').value,
    comprobacion: $('c-comprobacion').value,
    tipoCredito: $('c-tipo-credito').value,
    banco: $('c-banco').value,
    plazoCredito: $('c-plazo-credito').value,
    id_cliente: _cierreData.numCliente,
    credito: _cierreData.credito,
    vTotalOp: _cierreData.vTotalOp,
    vDesembolso: _cierreData.vDesembolso,
    pagares: _cierreData.pagares,
  };
}




function renderDistribucionesCierre(){
  const sel=$('c-distribucion-comision'); if(!sel)return;
  const pol=IANNA_COM.politicaActual(); const opts=IANNA_COM.distribucionesDisponibles(pol);
  const inst=IANNA_VALOR.institucion($('c-institucion')?.value)||{tipo:'contado'};
  const prev=sel.value; sel.innerHTML=opts.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
  const recomendado=inst.tipo==='contado'?pol.distribuciones_cobro?.contado?.id:pol.distribuciones_cobro?.credito?.id;
  sel.value=(prev&&opts.some(x=>x.id===prev))?prev:(recomendado||opts[0]?.id||'');
}

// 1.97.1 — resolución de esquema Modalidad × Canal
// 1.97.2 — resolución Fuente de captación × Distribución temporal
function renderEsquemasComisionCierre(){
  const sel=$('c-distribucion-comision'); if(!sel||!_cierreData)return;
  const ap=apartadosService.obtener(_cierreData.ap.id)||_cierreData.ap;
  const pol=IANNA_COM.politicaActual();
  const inst=IANNA_VALOR.institucion($('c-institucion')?.value)||{tipo:'credito'};
  const mod=String(inst.tipo||'credito').toLowerCase()==='contado'?'contado':'credito';
  const canal=IANNA_COM.canalOperacion(ap);
  const caps=(IANNA_COM.esquemasCaptacionDisponibles(pol)||[]);
  const dists=(IANNA_COM.distribucionesTemporalesDisponibles(pol)||[]).filter(d=>d.modalidad===mod||d.modalidad==='especial');
  const capRecom=caps.find(c=>c.canal===canal)||caps.find(c=>c.canal==='directo')||caps[0];
  const prev=sel.value;
  const opts=[];
  (capRecom?[capRecom]:caps).forEach(c=>dists.forEach(d=>opts.push({value:`${c.id}|${d.id}`,label:`${c.nombre||c.fuente} · ${d.nombre}`})));
  // Permitir override gerencial: otras fuentes de captación también disponibles en el cierre.
  caps.filter(c=>!capRecom||c.id!==capRecom.id).forEach(c=>dists.forEach(d=>opts.push({value:`${c.id}|${d.id}`,label:`${c.nombre||c.fuente} · ${d.nombre}`})));
  sel.innerHTML=opts.map(o=>`<option value="${o.value}">${o.label}</option>`).join('');
  if(prev&&opts.some(o=>o.value===prev)) sel.value=prev; else if(opts[0]) sel.value=opts[0].value;
  const lab=sel.closest('.fg')?.querySelector('label'); if(lab) lab.textContent='Esquema de captación + distribución de cobro';
}

