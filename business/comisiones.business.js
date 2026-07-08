/* ════════════════════════════════════════════════════════════════
   IANNA CRM — business/comisiones.business.js
   MOTOR DE COMISIONES CON POLÍTICA VERSIONADA (Fase 1.9)
   ────────────────────────────────────────────────────────────────
   Las comisiones representan una POLÍTICA EMPRESARIAL, no una
   constante del código. Todo es configurable desde Parámetros:

   · Base comisionable (qué conceptos comisionan)
   · Descuentos (siempre reducen la base)
   · Porcentajes por rol
   · Distribución del cobro (splits configurables)
   · Penalizaciones (fijas, porcentuales, retenciones, distribución)

   Política VERSIONADA:
   · Cada versión de la política tiene número (v1, v2, v3...).
   · Cada Operación guarda snapshot completo en `politica_snapshot`.
   · Los cierres históricos NUNCA se recalculan con política nueva.
   · Una venta cerrada hace tres años se puede reconstruir siempre
     como fue: la política snapshot vive en la propia Operación.
   ════════════════════════════════════════════════════════════════ */

window.IANNA_COM = (function(){

  /* ──────────────────────────────────────────────────────────────
     POLÍTICA ACTUAL — leída de Parámetros (con defaults compatibles)
     ────────────────────────────────────────────────────────────── */

  // Versión inicial que se autoasigna al arrancar el sistema con datos previos.
  // Cambiar cualquier parámetro comercial incrementa la versión (ver `incrementarVersion`).
  const VERSION_INICIAL = 'v1';

  // Política por defecto (idéntica al comportamiento previo a la Fase 1.9,
  // así los apartados existentes que se cierren HOY producen el mismo cálculo).
  function politicaDefault(){
    return {
      version: VERSION_INICIAL,
      base_comisionable: {
        // Qué conceptos entran en la base sobre la que se calcula la comisión.
        precio_vivienda:      true,   // ✔ Modelo/vivienda
        excedente_terreno:    true,   // ✔ Excedente de terreno sobre lote base
        plusvalia:            true,   // ✔ Plusvalía
        fraccion_fusionada:    true,
        lote_adicional:       true,
        construccion_adicional:true,
        adicional:            true,   // compatibilidad histórica
        gastos_operacion:     false,  // ✘ Gastos administrativos, avalúo, notaría, escrituración — NO comisionan
      },
      aplicar_descuento: true,        // El descuento SIEMPRE reduce la base (nunca se comisiona sobre precio lista)
      porcentajes: {
        asesor_directo:  0.02,   // 2%
        asesor_broker:   0.01,   // 1% cuando hay broker
        gerente:         0.005,  // 0.5% del gerente sobre TODAS las ventas del equipo
        broker:          0.01,   // 1% al broker externo
      },
      // Distribución del cobro — configurable por empresa
      distribucion_asesor:  [ { parte:'firma', nombre:'Firma de contrato', evento:'contrato_firmado', pct:0.5 }, { parte:'escrituracion', nombre:'Escrituración', evento:'escrituracion', pct:0.5 } ],
      distribucion_gerente: [ { parte:'firma', nombre:'Firma de contrato', evento:'contrato_firmado', pct:0.5 }, { parte:'escrituracion', nombre:'Escrituración', evento:'escrituracion', pct:0.5 } ],
      reglas_especiales: { contado: { activa:false, porcentaje_asesor:0.025 } },
      // Penalizaciones (configurables — vacío por default)
      penalizaciones: {
        cancelacion_apartado: { tipo:'porcentaje', valor:0,    exhibiciones:1, retencion_comisiones:false },
        cancelacion_venta:    { tipo:'porcentaje', valor:0.10, exhibiciones:1, retencion_comisiones:false, distribucion:[] },
      },
    };
  }

  // Lee la política vigente desde Parámetros; devuelve la default si no está guardada.
  function politicaActual(){
    const P = getP();
    const guardada = (DS.db.politicas_comerciales && DS.db.politicas_comerciales.actual) || null;
    if(guardada) return guardada;
    // Compatibilidad: si el sistema aún no tiene política guardada, la construye desde Parámetros existentes
    const def = politicaDefault();
    def.porcentajes.asesor_directo = P.comision_asesor_pct        || def.porcentajes.asesor_directo;
    def.porcentajes.asesor_broker  = P.comision_asesor_broker_pct || def.porcentajes.asesor_broker;
    def.porcentajes.gerente        = P.comision_gerente_pct       || def.porcentajes.gerente;
    return def;
  }

  // Guarda una política nueva incrementando la versión. Cada cambio queda auditado.
  function guardarPolitica(politicaNueva, motivo){
    if(!DS.db.politicas_comerciales) DS.db.politicas_comerciales = { actual: null, historial: [] };
    const anterior = DS.db.politicas_comerciales.actual;
    const versionPrev = anterior ? anterior.version : 'v0';
    const numPrev = parseInt(String(versionPrev).replace(/\D/g,'')) || 0;
    politicaNueva.version = 'v' + (numPrev + 1);
    politicaNueva.fecha_activacion = new Date().toISOString();
    politicaNueva.activada_por = (typeof CU!=='undefined'&&CU) ? CU.id : 'system';
    if(anterior){
      DS.db.politicas_comerciales.historial.push({
        ...anterior,
        fecha_desactivacion: new Date().toISOString(),
      });
    }
    DS.db.politicas_comerciales.actual = politicaNueva;
    DS._save(DS.db);
    try{ IANNA_MOTOR.auditar('politicas','comercial','ACTUALIZAR_POLITICA_COMERCIAL',
      {version:versionPrev}, {version:politicaNueva.version, cambios:motivo||''}, motivo||'Actualización de política comercial'); }catch(e){}
    return politicaNueva;
  }

  // Recupera una versión específica (para reconstruir un cierre histórico).
  function politicaPorVersion(version){
    if(!DS.db.politicas_comerciales) return null;
    if(DS.db.politicas_comerciales.actual?.version === version) return DS.db.politicas_comerciales.actual;
    return (DS.db.politicas_comerciales.historial||[]).find(p => p.version === version) || null;
  }

  /* ──────────────────────────────────────────────────────────────
     SNAPSHOT DE POLÍTICA EN LA OPERACIÓN
     ────────────────────────────────────────────────────────────── */

  // Al cerrar una venta, se guarda un snapshot COMPLETO en la Operación.
  // Este snapshot es inmutable: aunque la política actual cambie, esta operación se sigue calculando así.
  function snapshotDePolitica(ap){
    // Si la operación ya tiene snapshot, se respeta (política congelada)
    if(ap && ap.politica_snapshot) return ap.politica_snapshot;
    const P = politicaActual();
    // Clonado profundo para inmutabilidad
    return JSON.parse(JSON.stringify(P));
  }

  // Congela el snapshot en la Operación (se llama en el momento del contrato firmado).
  function congelarPolitica(ap){
    if(!ap) return null;
    if(ap.politica_snapshot) return ap.politica_snapshot; // ya congelada, no se toca
    const snap = snapshotDePolitica(ap);
    DS.update('apartados', ap.id, { politica_snapshot: snap });
    return snap;
  }

  /* ──────────────────────────────────────────────────────────────
     CÁLCULO DE BASE COMISIONABLE
     ────────────────────────────────────────────────────────────── */

  // Descompone el total_operacion de una Operación en sus conceptos, para poder
  // filtrar cuáles entran en la base comisionable según la política.
  function conceptos(ap){
    if(ap && ap.financial_snapshot && ap.financial_snapshot.base_comisionable_snapshot){
      const x=ap.financial_snapshot.base_comisionable_snapshot;
      return {...x, bruto:Number(x.bruto||x.total||0), gastos_operacion:Number(ap.financial_snapshot.total_gastos_operacion||0)};
    }
    const d=(typeof IANNA_VALOR!=='undefined') ? IANNA_VALOR.desglose(ap) : {};
    const gastos=(ap?.financial_snapshot?.gastos_operacion||[]).reduce((s,g)=>s+Number(g.monto_aplicado||0),0);
    return {
      precio_vivienda:Number(d.vivienda||0), excedente_terreno:Number(d.excedente||0), plusvalia:Number(d.plusvalia||0),
      fraccion_fusionada:Number(d.fraccion_fusionada||0), lote_adicional:Number(d.lote_adicional||0),
      construccion_adicional:Number(d.construccion_adicional||0), adicional:Number(d.fraccion_fusionada||0)+Number(d.lote_adicional||0)+Number(d.construccion_adicional||0),
      gastos_operacion:gastos, bruto:Number(d.total||0)
    };
  }

  // Base comisionable según la política aplicada a esta operación.
  // Fórmula: suma de los conceptos habilitados en `base_comisionable`, MENOS el descuento si aplica.
  function baseComisionable(ap){
    const politica = ap && ap.politica_snapshot ? ap.politica_snapshot : politicaActual();
    const c = conceptos(ap);
    const bc = politica.base_comisionable;
    let base = 0;
    if(bc.precio_vivienda)   base += c.precio_vivienda;
    if(bc.excedente_terreno) base += c.excedente_terreno;
    if(bc.plusvalia)         base += c.plusvalia;
    if(bc.fraccion_fusionada) base += c.fraccion_fusionada;
    if(bc.lote_adicional) base += c.lote_adicional;
    if(bc.construccion_adicional) base += c.construccion_adicional;
    if(bc.adicional && bc.fraccion_fusionada===undefined && bc.lote_adicional===undefined && bc.construccion_adicional===undefined) base += c.adicional;
    if(bc.gastos_operacion)  base += c.gastos_operacion;
    if(politica.aplicar_descuento){
      const desc = IANNA_FIN.descuentoAplicado(ap);
      base = Math.max(0, base - desc);
    }
    return { base, politica_version: politica.version, conceptos_incluidos: bc, descuento_aplicado: politica.aplicar_descuento ? IANNA_FIN.descuentoAplicado(ap) : 0 };
  }

  /* ──────────────────────────────────────────────────────────────
     CÁLCULO DE COMISIONES
     ────────────────────────────────────────────────────────────── */

  // Comisión completa del asesor. Devuelve el desglose por partes de la distribución.
  function comisionAsesor(ap){
    const politica = ap.politica_snapshot || politicaActual();
    const { base, politica_version } = baseComisionable(ap);
    const esBroker = !!ap.broker_id;
    const tipoFin=String(ap?.financial_snapshot?.tipo_financiamiento||ap?.datos_cierre?.tipoCredito||'').toLowerCase();
    const reglaContado=politica.reglas_especiales?.contado;
    const pct = (!esBroker && tipoFin==='contado' && reglaContado?.activa) ? Number(reglaContado.porcentaje_asesor||0) : (esBroker ? politica.porcentajes.asesor_broker : politica.porcentajes.asesor_directo);
    const total = base * pct;
    const partes = (politica.distribucion_asesor||[]).map(p => ({ parte:p.parte, nombre:p.nombre||p.parte, evento:p.evento||p.parte, pct:Number(p.pct||0), monto: total*Number(p.pct||0) }));
    return { rol:'asesor', beneficiario_id: ap.asesor, base, porcentaje:pct, total, partes, politica_version, es_broker:esBroker, regla_especial_aplicada:(!esBroker&&tipoFin==='contado'&&reglaContado?.activa)?'contado':null };
  }

  // Comisión del gerente sobre esta operación.
  function comisionGerente(ap){
    const politica = ap.politica_snapshot || politicaActual();
    const { base, politica_version } = baseComisionable(ap);
    const pct = politica.porcentajes.gerente;
    const total = base * pct;
    const partes = politica.distribucion_gerente.map(p => ({ parte:p.parte, pct:p.pct, monto: total*p.pct }));
    return { rol:'gerente', base, porcentaje:pct, total, partes, politica_version };
  }

  // Registra las comisiones devengadas en el ledger financiero (una entrada por parte).
  // Se llama automáticamente al ejecutar la operación "contrato_firmado".
  function devengarComisiones(ap){
    if(!ap || ap.estatus !== 'Venta') return { asesor:null, gerente:null };
    const politica_version = (ap.politica_snapshot||{}).version || politicaActual().version;
    const asesor = comisionAsesor(ap);
    const gerente = comisionGerente(ap);
    asesor.partes.forEach(p => {
      IANNA_FIN.registrarMovimiento({
        tipo:'comision_asesor', operacionId: ap.id, personaId: ap.prospectoId,
        monto: p.monto, concepto:`Comisión asesor — parte ${p.parte} (${IANNA_FMT.PCT(p.pct)})`,
        documento: ap.id_venta || ap.id_publico, politica_version,
        motivo:`Devengo automático al firmar contrato (base ${IANNA_FMT.MXN(asesor.base)})`,
      });
    });
    gerente.partes.forEach(p => {
      IANNA_FIN.registrarMovimiento({
        tipo:'comision_gerente', operacionId: ap.id, personaId: ap.prospectoId,
        monto: p.monto, concepto:`Comisión gerente — parte ${p.parte} (${IANNA_FMT.PCT(p.pct)})`,
        documento: ap.id_venta || ap.id_publico, politica_version,
        motivo:`Devengo automático al firmar contrato (base ${IANNA_FMT.MXN(gerente.base)})`,
      });
    });
    return { asesor, gerente };
  }

  /* ──────────────────────────────────────────────────────────────
     PENALIZACIONES CONFIGURABLES
     ────────────────────────────────────────────────────────────── */

  // Calcula la penalización aplicable a una cancelación, según la política snapshot de la Operación.
  function calcularPenalizacion(ap, tipoCancelacion){
    const politica = ap.politica_snapshot || politicaActual();
    const pen = politica.penalizaciones[tipoCancelacion==='venta' ? 'cancelacion_venta' : 'cancelacion_apartado'];
    if(!pen || !pen.valor) return { monto:0, politica_version:politica.version, tipo:pen?.tipo||'porcentaje', valor:0 };
    let monto;
    if(pen.tipo==='fijo') monto = pen.valor;
    else monto = IANNA_FIN.ingresosNetosOperacion(ap.id) * pen.valor;
    return { monto:Math.max(0, monto), politica_version:politica.version, tipo:pen.tipo, valor:pen.valor, exhibiciones:pen.exhibiciones||1, distribucion:pen.distribucion||[] };
  }

  return {
    // Política
    politicaActual, guardarPolitica, politicaPorVersion, politicaDefault,
    // Snapshot en la Operación
    snapshotDePolitica, congelarPolitica,
    // Cálculos
    conceptos, baseComisionable, comisionAsesor, comisionGerente,
    // Devengo y penalización
    devengarComisiones, calcularPenalizacion,
  };
})();
