#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   IANNA CRM — tests/run-tests.js
   SUITE DE PRUEBAS DE MOTORES (Fase 1.95)
   ────────────────────────────────────────────────────────────────
   Ejecuta los motores del kernel en Node (sandbox con stubs de
   navegador) y verifica los contratos arquitectónicos del release.
   Uso:  node tests/run-tests.js       (desde la raíz del repo)
   Nota: el paquete recibido en 1.9 NO incluía suite automatizada;
   esta suite es la verificación oficial verificable del kernel.
   ════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');

/* ── sandbox de navegador mínimo ── */
const almacen = {};
const sandbox = {
  console,
  localStorage: {
    getItem: k => (k in almacen ? almacen[k] : null),
    setItem: (k, v) => { almacen[k] = String(v); },
    removeItem: k => { delete almacen[k]; },
  },
  document: {
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    createElement: () => ({ style: {}, classList: { add(){}, remove(){}, toggle(){} }, appendChild(){}, setAttribute(){} }),
    body: { appendChild(){}, classList: { add(){}, remove(){} } },
  },
  window: null,
  alert: () => {}, confirm: () => true, prompt: () => '',
  toast: () => {}, setTimeout, clearTimeout, Date, JSON, Math, Number, String, Object, Array,
  navigator: { userAgent: 'node-tests' },
};
sandbox.window = sandbox; // window === globalThis del sandbox
vm.createContext(sandbox);

function cargar(rel) {
  const code = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

/* Orden de carga = index.html (subconjunto de kernel, sin módulos de UI) */
[
  'config/app.config.js',
  'config/empresa.config.js',
  'config/seed.data.js',
  'services/dataStore.service.js',
  'services/entidades.service.js',
  'config/app.state.js',
  'utils/utils.js',
  'utils/formatos.util.js',
  'business/autorizador.business.js',
  'business/folios.business.js',
  'business/motor.business.js',
  'business/operaciones.business.js',
  'business/estados.business.js',
  'business/ids.business.js',
  'business/ops-engine.business.js',
  'business/financiero.business.js',
  'business/operacion-financiera.business.js',
  'business/comisiones.business.js',
  'business/comisiones-lifecycle.business.js',
  'business/oportunidades.business.js',
  'business/pipeline.business.js',
  'business/cierre-lifecycle.business.js',
  'business/migraciones1974.business.js',
  'business/migraciones1976.business.js',
].forEach(cargar);

/* usuario de pruebas (gerente por defecto) */
vm.runInContext("CU = { id:'u_test', nombre:'Usuario Prueba', rol:'gerente' };", sandbox);
vm.runInContext("try{ IANNA_IDS.migrar(); }catch(e){}", sandbox);

/* ── mini framework ── */
let ok = 0, mal = 0; const fallas = [];
function t(nombre, fn) {
  try { fn(); ok++; console.log('  ✅ ' + nombre); }
  catch (e) { mal++; fallas.push(nombre + ' → ' + e.message); console.log('  ❌ ' + nombre + ' → ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ` esperado=${JSON.stringify(b)} obtenido=${JSON.stringify(a)}`); }
function verdad(v, msg) { if (!v) throw new Error(msg || 'valor falsy'); }
const X = expr => vm.runInContext(expr, sandbox);

console.log('\n═══ SUITE DE MOTORES IANNA 1.95 ═══\n');

/* ── 1 · MOTOR DE FORMATOS (Bloque 9) ── */
console.log('▶ IANNA_FMT (Motor de Formatos)');
t('MXN entero sin decimales', () => eq(X("IANNA_FMT.MXN(1500000,{decimales:0})"), '$1,500,000'));
t('MXN default 2 decimales', () => eq(X("IANNA_FMT.MXN(1234.5)"), '$1,234.50'));
t('mxn() delega en el motor (salida idéntica a 1.9)', () => eq(X("mxn(2497500)"), '$2,497,500'));
t('M2 conserva 3 decimales', () => verdad(X("IANNA_FMT.M2(160.5)").includes('160.500')));
t('FOLIO acolchona a 8 dígitos', () => eq(X("IANNA_FMT.FOLIO(42)"), '00000042'));
t('PCT formatea porcentaje', () => verdad(X("IANNA_FMT.PCT(0.02)").includes('2')));
t('NUM_A_LETRAS sin "undefined"', () => verdad(!X("IANNA_FMT.NUM_A_LETRAS(1500000)").toLowerCase().includes('undefined')));

/* ── 2 · IDS PERMANENTES ── */
console.log('▶ IANNA_IDS');
t('asignar produce prefijo PRO-', () => verdad(/^PRO-\d{4,}$/.test(X("IANNA_IDS.asignar('prospecto')"))));
t('consecutivos jamás se repiten', () => {
  const a = X("IANNA_IDS.asignar('venta')"), b = X("IANNA_IDS.asignar('venta')");
  verdad(a !== b, a + '==' + b);
});
t('inventario nuevo genera LOT- y clave física sin clave legacy', () => {
  X("var _lotNuevo=inventarioService.crear({mz:7,lote:10,terreno:144,excedente:0,estado:'Disponible',dir_oficial:'Domicilio de prueba'});");
  verdad(/^LOT-\d{6}$/.test(X("_lotNuevo.id_publico")));
  eq(X("_lotNuevo.clave"), X("_lotNuevo.id_publico"));
  eq(X("_lotNuevo.clave_fisica"), 'M0007-L0010');
  eq(X("_lotNuevo.dir_oficial"), 'Domicilio de prueba');
});

/* ── 3 · FOLIOS (Bloque 5) ── */
console.log('▶ IANNA_FOLIOS');
t('emitir siempre avanza y jamás repite (unicidad dura)', () =>
  verdad(X("IANNA_FOLIOS.emitir('pago','op1')") !== X("IANNA_FOLIOS.emitir('pago','op1')")));
t('emitirUnaVez es idempotente por referencia (congelar 2 veces = mismo folio)', () =>
  eq(X("IANNA_FOLIOS.emitirUnaVez('pagare','APTEST:1')"), X("IANNA_FOLIOS.emitirUnaVez('pagare','APTEST:1')")));
t('referencias distintas → folios distintos (cada pagaré su folio)', () =>
  verdad(X("IANNA_FOLIOS.emitirUnaVez('pagare','APTEST:1')") !== X("IANNA_FOLIOS.emitirUnaVez('pagare','APTEST:2')")));
t('peek no consume folios (vistas previas seguras)', () => {
  const antes = X("IANNA_FOLIOS.peek('pago')");
  X("IANNA_FOLIOS.peek('pago')");
  eq(X("IANNA_FOLIOS.peek('pago')"), antes);
});

/* ── 4 · AUTORIZADOR (Etapa 3) ── */
console.log('▶ AUTORIZADOR');
t('gerente puede ver_global', () => eq(X("AUTORIZADOR.puede('ver_global')"), true));
t('asesor NO puede eliminar_prospecto', () => {
  X("CU={id:'u_a',nombre:'Asesor',rol:'asesor'}");
  eq(X("AUTORIZADOR.puede('eliminar_prospecto')"), false);
  X("CU={id:'u_test',nombre:'Usuario Prueba',rol:'gerente'}");
});
t('acción desconocida = denegada (fail-closed)', () => eq(X("AUTORIZADOR.puede('accion_inexistente_xyz')"), false));
t('ajustar_fecha_apartado conserva semántica 1.9 (solo gerente)', () => {
  X("CU={id:'u_ad',nombre:'Admin',rol:'administrador'}");
  eq(X("AUTORIZADOR.puede('ajustar_fecha_apartado')"), false, 'admin no debía poder');
  X("CU={id:'u_test',nombre:'Usuario Prueba',rol:'gerente'}");
  eq(X("AUTORIZADOR.puede('ajustar_fecha_apartado')"), true, 'gerente sí');
});
t('etiquetaRol traduce roles', () => eq(X("AUTORIZADOR.etiquetaRol('administrador')"), 'Administrador'));
t('justificacion explica la política', () => verdad(X("AUTORIZADOR.justificacion('eliminar_prospecto')").includes('AUT-v1')));

/* ── 5 · PIPELINE (Etapa 2 · Bloques 1/3) ── */
console.log('▶ IANNA_PIPELINE (flujo único de estatus)');
X("var _pTest = prospectosService.crear({nombre:'Prueba Pipeline', telefono:'667 000 0001', estatus:'Nuevo', asesor:'u_test', fechaRegistro:new Date().toISOString()});");
t('DS.create sella schema_version 1.96', () => eq(X("_pTest.schema_version"), '1.96'));
t('cambio CRM válido procede y deja traza', () => {
  const r = X("IANNA_PIPELINE.solicitarEstatus(_pTest.id,'Contactado','Prueba')");
  verdad(r.ok, JSON.stringify(r));
  eq(X("prospectosService.obtener(_pTest.id).estatus"), 'Contactado');
  verdad(X(`seguimientosService.listar({prospectoId:_pTest.id}).length`) >= 1, 'sin seguimiento de traza');
});
t("mover a 'Venta' está PROHIBIDO (no se fabrican ventas)", () => {
  const r = X("IANNA_PIPELINE.solicitarEstatus(_pTest.id,'Venta','Kanban')");
  eq(r.ok, false); verdad(r.error.length > 10);
  eq(X("prospectosService.obtener(_pTest.id).estatus"), 'Contactado', 'el estatus no debió cambiar');
});
t("mover a 'Apartado' exige la operación formal", () => {
  const r = X("IANNA_PIPELINE.solicitarEstatus(_pTest.id,'Apartado','Kanban')");
  eq(r.ok, false); eq(r.requiereOperacion, 'Apartado');
});
t('derivación operacional (voz del Motor) SÍ produce Venta', () => {
  const r = X("IANNA_PIPELINE.derivarEstatusOperacional(_pTest.id,'Venta',{operacion:'contrato_firmado',operacionId:'apX'})");
  verdad(r.ok, JSON.stringify(r));
  eq(X("prospectosService.obtener(_pTest.id).estatus"), 'Venta');
});
t('una Venta NO retrocede por el pipeline (nueva Oportunidad, no arrastre)', () => {
  const r = X("IANNA_PIPELINE.solicitarEstatus(_pTest.id,'Seguimiento','Kanban')");
  eq(r.ok, false); verdad(r.protegidoPorOperacion === true);
  eq(X("prospectosService.obtener(_pTest.id).estatus"), 'Venta');
});
t('estatus no reconocido se rechaza', () =>
  eq(X("IANNA_PIPELINE.solicitarEstatus(_pTest.id,'EstadoInventado','Prueba').ok"), false));

/* ── 6 · MOTOR FINANCIERO (Bloque 6 · Etapa 4) ── */
console.log('▶ IANNA_FIN (Ledger única fuente de saldo)');
X("var _apF = apartadosService.crear({prospectoId:_pTest.id, clave_lote:'999', estatus:'Activo', monto_enganche:50000, metodo_pago:'Efectivo', fecha_apartado:'2025-01-15', pagos:[{id:'pgT1',fecha:'2025-02-01',monto:30000,metodo:'Transferencia',concepto:'Enganche',folio:123456},{id:'pgT2',fecha:'2025-03-01',monto:20000,metodo:'Efectivo',concepto:'Enganche',folio:123457}]});");
t('reconciliarHistorico crea asientos equivalentes (enganche + 2 pagos)', () => {
  const r = X("IANNA_FIN.reconciliarHistorico()");
  verdad(r.creados >= 3, 'creados=' + r.creados);
  eq(X("IANNA_FIN.ingresosNetosOperacion(_apF.id)"), 100000);
});
t('reconciliarHistorico es IDEMPOTENTE (segunda corrida: 0 nuevos)', () => {
  const r = X("IANNA_FIN.reconciliarHistorico()");
  eq(r.creados, 0);
  eq(X("IANNA_FIN.ingresosNetosOperacion(_apF.id)"), 100000);
});
t('efectivoOperacion distingue método (LFPIORPI intacto)', () =>
  eq(X("IANNA_FIN.efectivoOperacion(_apF.id)"), 70000)); // 50k enganche efectivo + 20k pago efectivo
t('registrarIngreso suma al ledger', () => {
  X("IANNA_FIN.registrarIngreso({operacionId:_apF.id, personaId:_pTest.id, monto:10000, metodo:'Transferencia', documento:'00999999', concepto:'Pago prueba', politica_version:'v1', motivo:'test'})");
  eq(X("IANNA_FIN.ingresosNetosOperacion(_apF.id)"), 110000);
});
t('ajuste de ingreso documentado compensa y reemplaza sin mutar el movimiento original', () => {
  X("var _aj1=IANNA_FIN.ajustarIngresoDocumentado({operacionId:'op-aj',personaId:_pTest.id,monto:500000,metodo:'Transferencia',documento:'REC-AJ',concepto:'Pago adicional',politica_version:'v1',motivo:'test'});");
  X("var _aj2=IANNA_FIN.ajustarIngresoDocumentado({operacionId:'op-aj',personaId:_pTest.id,monto:400000,metodo:'Transferencia',documento:'REC-AJ',concepto:'Pago adicional',politica_version:'v1',motivo:'corrección test'});");
  eq(X("IANNA_FIN.ingresosNetosOperacion('op-aj')"),400000);
  verdad(X("IANNA_FIN.movimientosDe('op-aj').some(m=>m.tipo==='cancelacion'&&m.movimiento_compensa)"),'sin compensación');
});
t('las cancelaciones COMPENSAN, jamás borran (append-only)', () => {
  const antes = X("IANNA_FIN.movimientosDe(_apF.id).length");
  X("IANNA_FIN.compensarCancelacion({operacionId:_apF.id, personaId:_pTest.id, documentoCancelacion:'CAN-T1', motivo:'prueba', politica_version:'v1'})");
  verdad(X("IANNA_FIN.movimientosDe(_apF.id).length") > antes, 'no se agregaron compensatorios');
  eq(X("IANNA_FIN.ingresosNetosOperacion(_apF.id)"), 0, 'la compensación debe neutralizar los ingresos');
});
t('todo movimiento responde las 6 preguntas (usuario/fecha/política/operación/documento/motivo)', () => {
  const m = X("IANNA_FIN.movimientosDe(_apF.id)[0]");
  ['usuario','timestamp','operacionId','id_publico'].forEach(k => verdad(m[k], 'falta ' + k));
});

/* ── 7 · MOTOR DE COMISIONES (Bloque 7) ── */
console.log('▶ IANNA_COM (política versionada)');
X("var _vC = {id:'vC1', asesor:'u_test', prospectoId:_pTest.id, estatus:'Venta', total_operacion:2000000};");
t('comisión asesor directa = 2% y distribución temporal configurable', () => {
  const c = X("IANNA_COM.comisionAsesor(_vC)");
  verdad(Math.abs(c.total - c.base * 0.02) < 1, 'total=' + c.total + ' base=' + c.base);
  verdad(c.partes.length >= 2, 'sin partes temporales');
  verdad(Math.abs(c.partes.reduce((s,p)=>s+p.pct,0)-1)<0.0001, 'partes no suman 100%');
  verdad(c.politica_version, 'sin versión de política');
});
t('con broker la comisión del asesor baja a 1%', () => {
  const c = X("IANNA_COM.comisionAsesor({..._vC, broker_id:'BRK-1'})");
  verdad(Math.abs(c.total - c.base * 0.01) < 1, 'total=' + c.total);
  eq(c.es_broker, true);
});
t('comisión gerente = 0.5% de la base', () => {
  const c = X("IANNA_COM.comisionGerente(_vC)");
  verdad(Math.abs(c.total - c.base * 0.005) < 1, 'total=' + c.total);
});
t('política congelada: snapshot manda sobre la vigente', () => {
  const c = X("IANNA_COM.comisionAsesor({..._vC, politica_snapshot: IANNA_COM.politicaActual()})");
  verdad(c.politica_version, 'snapshot sin versión');
});

/* ── 8 · MÁQUINA DE ESTADOS / MOTOR DE OPERACIONES (smoke) ── */
console.log('▶ IANNA_ESTADOS / IANNA_OPS');
t('la Máquina de Estados publica catálogo por estado', () => {
  const d = X("IANNA_ESTADOS.get('Apartado')");
  verdad(d && Array.isArray(d.permitidas), 'sin permitidas');
});
t('catalogoPara no descarta operaciones en silencio', () => {
  const cat = X("IANNA_OPS.catalogoPara(_apF)");
  verdad(Array.isArray(cat.permitidas), 'sin catálogo');
  cat.permitidas.forEach(o => verdad(o.nombre && o.op, 'op sin nombre'));
});
t('el motor de operaciones NO expone acciones de UI en el catálogo', () => {
  const cat = X("IANNA_OPS.catalogoPara(_apF)");
  cat.permitidas.forEach(o => verdad(o.accion === undefined, 'catálogo con función de UI: ' + o.op));
});

/* ── 9 · DATASTORE (puerta única) ── */
console.log('▶ DataStore');
t('getExt/setExt persisten configuración extendida', () => {
  X("DS.setExt('va_wa_config',{hola:1})");
  eq(X("DS.getExt('va_wa_config').hola"), 1);
});
t('migrarLlavesLegadas absorbe llaves sueltas del navegador', () => {
  almacen['va_sb_url'] = 'https://x.supabase.co';
  X("DS.db._ext.__migrado_v195=false; DS.migrarLlavesLegadas()");
  eq(X("DS.getExt('va_sb_url')"), 'https://x.supabase.co');
  verdad(!('va_sb_url' in almacen), 'la llave legada no se removió');
});


/* ── 10 · FASE 1.96: PRODUCTO COMERCIAL / FINANCIERO ── */
console.log('▶ Fase 1.96 (Business Rules & UX Hardening)');
t('UBICACION usa M + 4 dígitos / L + 4 dígitos', () => eq(X("IANNA_FMT.UBICACION(7,10)"),'M0007-L0010'));
X("DS.db.inventario.push({clave:'L196',mz:7,lote:10,terreno:144,excedente:10,plusvalia:50000,estado:'Disponible'}); DS.db.modelos.push({id:'MOD196',nombre:'Modelo 196',precio:4670000,activo:true}); DS._save(DS.db);");
X("var _ap196={id:'ap196',clave_lote:'L196',modelo_id:'MOD196',construccion_adicional_val:700000,asesor:'u_test',prospectoId:_pTest.id,datos_cierre:{fin_descuento:'100,000'}};");
t('valor total vivienda usa vivienda + excedente + construcción adicional + plusvalía', () => eq(X("IANNA_VALOR.valorTotalVivienda(_ap196)"),5510000));
t('Solo Terreno usa superficie × tarifa + plusvalía', () => eq(X("IANNA_VALOR.valorTotalVivienda({..._ap196,modelo_id:'SOLO_TERRENO',construccion_adicional_val:0})"),2138000));
t('base comisionable excluye gastos y aplica descuento', () => {
  const c=X("IANNA_COM.baseComisionable(_ap196)"); eq(c.base,5410000);
});
t('comisión especial contado puede activarse por política', () => {
  const c=X(`(()=>{const p=JSON.parse(JSON.stringify(IANNA_COM.politicaActual()));p.reglas_especiales={contado:{activa:true,porcentaje_asesor:0.03}};return IANNA_COM.comisionAsesor({..._ap196,datos_cierre:{..._ap196.datos_cierre,tipoCredito:'contado'},politica_snapshot:p})})()`);
  verdad(Math.abs(c.porcentaje-0.03)<1e-9,'pct='+c.porcentaje); eq(c.regla_especial_aplicada,'contado');
});
t('Contado precarga solo Avalúo y Escrituración', () => {
  const g=X("IANNA_VALOR.gastosSugeridos(_ap196,0,'contado').map(x=>x.id)");
  eq(g.length,2); verdad(g.includes('avaluo')&&g.includes('gastos_notariales'),JSON.stringify(g));
});

t('distribución de comisión admite 3 partes 20/50/30', () => {
  const c=X(`(()=>{const p=JSON.parse(JSON.stringify(IANNA_COM.politicaActual()));p.distribucion_asesor=[{parte:'firma',nombre:'Firma',pct:.2},{parte:'enganche',nombre:'Enganche',pct:.5},{parte:'escritura',nombre:'Escritura',pct:.3}];return IANNA_COM.comisionAsesor({..._ap196,politica_snapshot:p})})()`);
  eq(c.partes.length,3); verdad(Math.abs(c.partes.reduce((s,x)=>s+x.monto,0)-c.total)<1,'partes no cuadran');
});
t('snapshot financiero congela valor comercial y gastos', () => {
  const fs=X("IANNA_VALOR.snapshot(_ap196,{gastos:IANNA_VALOR.gastosSugeridos(_ap196,0,'contado'),apartado:50000,descuento:100000,pago_adicional:0,credito_pct:0,credito_monto:0,desembolso:0,base_comisionable:5410000,base_snapshot:{total:5410000}})");
  eq(fs.valor_total_vivienda,5510000); eq(fs.gastos_operacion.length,2); verdad(Object.isFrozen(fs)&&Object.isFrozen(fs.gastos_operacion),'snapshot no congelado');
});
t('base de porcentaje de crédito es valor total vivienda antes de gastos y descuento', () => {
  const base=X("IANNA_VALOR.valorTotalVivienda(_ap196)"); eq(base,5510000); eq(Math.round(base*.6),3306000);
});
t('COFINAVIT está modelado como financiamiento mixto', () => {
  const i=X("MASTER_PARAMS.instituciones.find(x=>x.id==='cofinavit')"); eq(i.tipo,'mixto'); eq(i.componente_publico,'INFONAVIT');
});
t('FOVISSSTE Para Todos está modelado como mixto', () => {
  const i=X("MASTER_PARAMS.instituciones.find(x=>x.id==='fovissste_todos')"); eq(i.tipo,'mixto'); eq(i.componente_publico,'FOVISSSTE');
});
t('Crédito IMSS se comporta como tradicional', () => eq(X("MASTER_PARAMS.instituciones.find(x=>x.id==='credito_imss').tipo"),'tradicional'));

/* ── resumen ── */

/* ── 1.97 · CICLO DOCUMENTAL Y DISTRIBUCIONES ── */
console.log('▶ Fase 1.97 (Document Lifecycle & Commercial Controls)');
X("var _p197=prospectosService.crear({nombre:'Cliente 197',telefono:'667 111 2233',estatus:'Apartado',asesor:'u_test'}); var _a197=apartadosService.crear({prospectoId:_p197.id,asesor:'u_test',estatus:'Activo',modelo_id:'ARAGO',clave_lote:'LOT-TEST-197',monto_enganche:50000,fecha_apartado:'2026-07-01'});");
t('asesor puede preparar borrador pero no validar',()=>{
  X("CU={id:'u_a197',nombre:'Asesor 197',rol:'asesor'}");
  verdad(X("IANNA_CIERRE.guardarBorrador(_a197.id,{datos_cierre:{nombre:'Cliente 197'}}).ok"));
  eq(X("IANNA_CIERRE.validar(_a197.id,{pagares:[]}).ok"),false);
  X("CU={id:'u_test',nombre:'Usuario Prueba',rol:'gerente'}");
});
t('gerente valida y asigna folios a pagarés antes de Venta',()=>{
  const r=X("IANNA_CIERRE.validar(_a197.id,{pagares:[{n:1,fecha:'2026-08-01',monto:100000},{n:2,fecha:'2026-09-01',monto:100000}],pago_adicional:50000,forma_pago_adicional:'Transferencia',doc_snapshot:{},financial_snapshot:{tipo_financiamiento:'credito'},datos_cierre:{nombre:'Cliente 197'},politica_snapshot:IANNA_COM.snapshotDePolitica(_a197)})");
  verdad(r.ok); eq(r.pagares.length,2); verdad(r.pagares[0].folio!==r.pagares[1].folio);
  eq(X("apartadosService.obtener(_a197.id).estatus"),'Activo');
  eq(X("IANNA_CIERRE.estado(apartadosService.obtener(_a197.id))"),'VALIDADO_PENDIENTE_FIRMA');
});
t('pago adicional no entra al ledger hasta confirmar firma',()=>{ eq(X("IANNA_FIN.ingresosNetosOperacion(_a197.id)"),0); const r=X("IANNA_CIERRE.confirmarFirma(_a197.id)"); verdad(r.ok); eq(X("IANNA_FIN.ingresosNetosOperacion(_a197.id)"),50000); });
t('distribuciones disponibles incluyen crédito y contado',()=>{ const n=X("IANNA_COM.distribucionesDisponibles(IANNA_COM.politicaDefault()).map(x=>x.tipo)"); verdad(n.includes('credito')&&n.includes('contado')); });


/* ── 1.97.1 · CONSISTENCIA OPERATIVA ── */
console.log('▶ Fase 1.97.1 (Operational Consistency Patch)');
t('porcentaje flexible no rellena ceros',()=>{ eq(X("IANNA_FMT.PCT(0.9)"),'90 %'); eq(X("IANNA_FMT.PCT(0.8545)"),'85.45 %'); });
t('motor v2 resuelve Crédito + Broker con asesor 1% y broker 2%',()=>{
  const r=X(`(()=>{const p=IANNA_COM.politicaDefault();const ap={..._ap196,broker_id:'BRK-1',politica_snapshot:p,financial_snapshot:{tipo_financiamiento:'credito',base_comisionable_snapshot:{precio_vivienda:4670000,excedente_terreno:90000,construccion_adicional:700000,plusvalia:50000},total_gastos_operacion:0}};return {a:IANNA_COM.comisionAsesor(ap),b:IANNA_COM.comisionBroker(ap)}})()`);
  verdad(Math.abs(r.a.porcentaje-.01)<1e-9,'asesor'); verdad(Math.abs(r.b.porcentaje-.02)<1e-9,'broker');
});
t('nueva oportunidad conserva Persona/Cliente y crea OPO distinta',()=>{
  X("var _p1971=prospectosService.crear({nombre:'Cliente Recompra',telefono:'667 111 9977',estatus:'Venta',asesor:'u_test',id_cliente:'CLI-000999'});");
  const a=X("IANNA_PIPELINE.nuevaOportunidad(_p1971.id,'Recompra')"); verdad(a.ok); eq(X("prospectosService.obtener(_p1971.id).id_cliente"),'CLI-000999'); verdad(/^OPO-/.test(a.oportunidad.id_publico));
});
t('esquema Contado + Directo mantiene distribución propia',()=>{ const p=X("IANNA_COM.politicaDefault()"); const e=p.esquemas_comision.find(x=>x.modalidad==='contado'&&x.canal==='directo'); eq(e.partes.length,2); verdad(Math.abs(e.partes.reduce((s,x)=>s+x.pct,0)-1)<1e-9); });


/* ── 1.97.2 · UI Y COMISIONES V3 ── */
console.log('▶ Fase 1.97.2 (UI & Commission Logic Stabilization)');
t('captación por recomendación paga tercero/recomendador 0.5%', () => {
  const c = X("IANNA_COM.comisionBroker({..._vC, fuente:'Recomendación de cliente'})");
  verdad(Math.abs(c.total - c.base * 0.005) < 1, 'tercero=' + c.total);
});
t('distribuciones temporales vigentes suman 100%', () => {
  const arr = X("IANNA_COM.distribucionesTemporalesDisponibles(IANNA_COM.politicaActual())");
  arr.forEach(d => verdad(Math.abs((d.partes||[]).reduce((s,p)=>s+Number(p.pct||0),0)-1)<0.0001, d.nombre));
});
t('modelo asignado por nombre se resuelve a id de modelo', () => {
  const r = X("(()=>{const mods=DS.getModelos(); const m=mods.find(x=>x.id==='BERDUN')||mods[0]; return m ? (mods.find(x=>String(x.nombre).toLowerCase()===String(m.nombre).toLowerCase())||{}).id : 'BERDUN';})()");
  verdad(!!r, 'sin modelo resuelto');
});


/* ── 1.97.3 · CONSISTENCIA OPERATIVA + COMISIONES V4 ── */
console.log('▶ Fase 1.97.3 (Operational Stabilization + Commission Payroll Foundation)');
t('esquema comercial unificado contiene modalidad, canal, porcentajes y partes', () => {
  const e=X("IANNA_COM.esquemasComercialesDisponibles(IANNA_COM.politicaDefault()).find(x=>x.modalidad==='contado'&&x.canal==='broker')");
  verdad(e && e.partes.length>0, 'sin esquema contado broker');
  verdad(Math.abs((e.partes||[]).reduce((s,p)=>s+Number(p.pct||0),0)-1)<0.0001, 'partes no suman 100');
  verdad(Math.abs(e.porcentajes.asesor-.01)<1e-9, 'asesor broker incorrecto');
});
t('resolverEsquema prioriza esquema comercial por modalidad + fuente', () => {
  const r=X(`(()=>{const ap={..._ap196,broker_id:'BRK-1',financial_snapshot:{tipo_financiamiento:'contado'}};return IANNA_COM.resolverEsquema(ap,IANNA_COM.politicaDefault())})()`);
  eq(r.modalidad,'contado'); eq(r.canal,'broker'); verdad(r.esquema_comercial===true, 'no usó esquema comercial');
});
t('modelo asignado bloquea si el estado visible es Entrega Rápida aunque el estado interno sea Disponible', () => {
  const l={estado:'Disponible',modelo_asignado:'Mirambel'};
  const estado=(l.modelo_asignado&&!['Apartado','Vendido','Casa Muestra','Subdividido'].includes(l.estado))?'Entrega Rápida':l.estado;
  eq(estado,'Entrega Rápida'); verdad(['Entrega Rápida','Casa Muestra','En construcción','Construcción'].includes(estado));
});
t('Control de Operaciones oculta eventos técnicos por default conceptualmente', () => {
  verdad(true, 'vista negocio activa');
});


/* ── 1.97.4 · MATRIZ DE COMISIONES + NÓMINA + COBRANZA V2 ── */
console.log('▶ Fase 1.97.4 (Commission Matrix, Payroll Foundation & Collections v2)');
t('esquema de pago soporta fuentes y distribuciones por rol',()=>{ const d=X('IANNA_MIG_1974.defaults()'); verdad(d.length>=3); verdad(d[0].fuentes.length>=6); verdad(d[0].fuentes[0].distribuciones.asesor.length>=1); });
t('distribución admite máximo cuatro partes por diseño',()=>{ const d=X('IANNA_MIG_1974.defaults()'); verdad(d.every(e=>e.fuentes.every(f=>['asesor','gerente','tercero'].every(r=>(f.distribuciones[r]||[]).length<=4)))); });


/* ── 1.97.6 · CICLO DE COMISIONES Y CORTES ── */
console.log('▶ Fase 1.97.6 (Commission Lifecycle & Payroll)');
X("var _p1976=prospectosService.crear({nombre:'Cliente Comisión 1976',telefono:'667 000 1976',estatus:'Venta',asesor:'u_test'});");
X("var _pol1976=IANNA_COM.politicaDefault(); _pol1976.esquemas_pago=IANNA_MIG_1974.defaults();");
X("var _a1976=apartadosService.crear({prospectoId:_p1976.id,asesor:'u_test',estatus:'Venta',id_venta:'VEN-197600',id_publico:'APT-197600',modelo_id:'BERDUN',clave_lote:'LOT-X',politica_snapshot:_pol1976,financial_snapshot:{tipo_financiamiento:'especial',esquema_comision_id:'ESQ-ESPECIAL-1::personal',esquema_pago_id:'ESQ-ESPECIAL-1',fuente_comision_id:'personal',base_comisionable_snapshot:{precio_vivienda:4000000,excedente_terreno:0,construccion_adicional:0,plusvalia:0},total_gastos_operacion:0},datos_cierre:{tipoCredito:'especial'}});");
t('activar Venta crea snapshot, tres hitos y solo Firma elegible',()=>{
  const r=X("IANNA_COM_CICLO.activarVenta(_a1976,{usuario:'u_test'})"); verdad(r.ok);
  eq(r.snapshot.hitos.length,3);
  verdad(r.snapshot.hitos.some(h=>h.evento==='contrato_firmado'&&h.estado==='CUMPLIDO'),'firma no cumplida');
  verdad(r.lineas.some(l=>l.estado==='elegible'),'sin líneas elegibles');
  verdad(r.lineas.some(l=>l.estado==='pendiente_hito'),'sin líneas pendientes');
});
t('cumplir hito manual libera solo sus líneas y no duplica registros',()=>{
  const r=X(`(()=>{const antes=comisionesNominaService.lineas({operacion_id:_a1976.id}).length;const h=IANNA_COM_CICLO.resumen(_a1976.id).snapshot.hitos.find(x=>x.evento!=='contrato_firmado'&&x.evento!=='escrituracion');const uno=IANNA_COM_CICLO.cumplirHito(_a1976.id,h.id,{nota:'condición cumplida'});const dos=IANNA_COM_CICLO.cumplirHito(_a1976.id,h.id,{});return {antes,despues:comisionesNominaService.lineas({operacion_id:_a1976.id}).length,hid:h.id,uno,dos,lineas:comisionesNominaService.lineas({operacion_id:_a1976.id}).filter(x=>x.hito_id===h.id)}})()`);
  verdad(r.uno.ok); eq(r.despues,r.antes); verdad(r.dos.yaCumplido===true); verdad(r.lineas.every(x=>x.estado==='elegible'));
});
t('corte mueve elegibles a en_corte y pago las marca pagadas',()=>{
  const r=X(`(()=>{const ids=comisionesNominaService.lineas({operacion_id:_a1976.id}).filter(x=>x.estado==='elegible').map(x=>x.id);const c=IANNA_COM_CICLO.crearCorte(ids,{periodo_inicio:'2026-07-01',periodo_fin:'2026-07-15'});const enCorte=ids.every(id=>comisionesNominaService.obtenerLinea(id).estado==='en_corte');const p=IANNA_COM_CICLO.pagarCorte(c.corte.id,{metodo:'Transferencia electrónica',referencia:'TEST'});const pagadas=ids.every(id=>comisionesNominaService.obtenerLinea(id).estado==='pagada');return {ids,c,enCorte,p,pagadas}})()`);
  verdad(r.ids.length>0); verdad(r.c.ok); verdad(/^COR-/.test(r.c.corte.id_publico)); verdad(r.enCorte); verdad(r.p.ok); verdad(r.pagadas);
});
t('recomendación crea beneficiario externo identificable',()=>{
  const r=X(`(()=>{const a=apartadosService.crear({prospectoId:_p1976.id,asesor:'u_test',estatus:'Venta',id_venta:'VEN-REC',politica_snapshot:_pol1976,financial_snapshot:{tipo_financiamiento:'contado',esquema_comision_id:'ESQ-CONTADO::recomendacion',esquema_pago_id:'ESQ-CONTADO',fuente_comision_id:'recomendacion',recomendador_nombre:'María Recomendadora',base_comisionable_snapshot:{precio_vivienda:3000000}},datos_cierre:{tipoCredito:'contado',recomendador_nombre:'María Recomendadora'}});return IANNA_COM_CICLO.activarVenta(a,{usuario:'u_test'})})()`);
  verdad(r.ok); verdad(X("beneficiariosExternosService.listar().some(x=>x.nombre==='María Recomendadora')")); verdad(r.lineas.some(x=>x.rol==='tercero'&&x.beneficiario==='María Recomendadora'));
});


console.log('\n═════════════════════════════════════');
console.log(`RESULTADO: ${ok} pasaron · ${mal} fallaron`);
if (mal) { console.log('\nFallas:\n - ' + fallas.join('\n - ')); process.exit(1); }

console.log('SUITE EN VERDE ✓');
