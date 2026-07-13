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
      distribuciones_cobro: {
        credito: { id:'DCO-CREDITO', nombre:'Crédito hipotecario', tipo:'credito', partes:[ { parte:'firma', nombre:'Firma', evento:'contrato_firmado', pct:0.5 }, { parte:'escritura', nombre:'Escritura', evento:'escrituracion', pct:0.5 } ] },
        contado: { id:'DCO-CONTADO', nombre:'Contado', tipo:'contado', partes:[ { parte:'firma', nombre:'Firma', evento:'contrato_firmado', pct:0.5 }, { parte:'escritura', nombre:'Escritura', evento:'escrituracion', pct:0.5 } ] },
        especiales: []
      },
      // Fase 1.97.2 — política matricial: primero fuente de captación, luego distribución temporal del cobro.
      esquemas_captacion: [
        {id:'CAP-DIRECTO',nombre:'Personal del asesor',canal:'directo',fuente:'Personal del asesor (redes, prospección en frío, canal propio)',porcentajes:{asesor:0.02,gerente:0.005,broker:0,tercero:0},tercero_tipo:''},
        {id:'CAP-BROKER',nombre:'Bróker',canal:'broker',fuente:'Bróker',porcentajes:{asesor:0.01,gerente:0.005,broker:0.02,tercero:0.02},tercero_tipo:'Bróker'},
        {id:'CAP-RECOMENDACION',nombre:'Recomendación de cliente',canal:'recomendacion',fuente:'Recomendación de cliente',porcentajes:{asesor:0.02,gerente:0.005,broker:0,tercero:0.005},tercero_tipo:'Recomendador'},
        {id:'CAP-CORPORATIVO',nombre:'Corporativo / casa',canal:'corporativo',fuente:'Corporativo (casa)',porcentajes:{asesor:0.01,gerente:0.005,broker:0,tercero:0},tercero_tipo:'Casa'},
        {id:'CAP-GUARDIA',nombre:'Guardia',canal:'guardia',fuente:'Guardia',porcentajes:{asesor:0.015,gerente:0.005,broker:0,tercero:0},tercero_tipo:''}
      ],
      distribuciones_temporales: [
        {id:'DTC-CREDITO',nombre:'Crédito hipotecario',modalidad:'credito',partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:0.20},{parte:'autorizacion',nombre:'Autorización de crédito',evento:'credito_autorizado',pct:0.30},{parte:'escritura',nombre:'Escritura',evento:'escrituracion',pct:0.50}]},
        {id:'DTC-CONTADO',nombre:'Contado',modalidad:'contado',partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:0.50},{parte:'escritura',nombre:'Escritura',evento:'escrituracion',pct:0.50}]}
      ],
      // Compatibilidad con 1.97.1: se conserva, pero el motor prefiere esquemas_captacion + distribuciones_temporales.
      esquemas_comision: [
        {id:'EC-CRED-DIR',nombre:'Crédito hipotecario — Venta directa',modalidad:'credito',canal:'directo',porcentajes:{asesor:0.02,gerente:0.005,broker:0},partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:0.5},{parte:'escritura',nombre:'Escritura',evento:'escrituracion',pct:0.5}]},
        {id:'EC-CRED-BRK',nombre:'Crédito hipotecario — Broker',modalidad:'credito',canal:'broker',porcentajes:{asesor:0.01,gerente:0.005,broker:0.02},partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:0.5},{parte:'escritura',nombre:'Escritura',evento:'escrituracion',pct:0.5}]},
        {id:'EC-CONT-DIR',nombre:'Contado — Venta directa',modalidad:'contado',canal:'directo',porcentajes:{asesor:0.025,gerente:0.005,broker:0},partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:0.5},{parte:'escritura',nombre:'Escritura',evento:'escrituracion',pct:0.5}]},
        {id:'EC-CONT-BRK',nombre:'Contado — Broker',modalidad:'contado',canal:'broker',porcentajes:{asesor:0.01,gerente:0.005,broker:0.02},partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:0.5},{parte:'escritura',nombre:'Escritura',evento:'escrituracion',pct:0.5}]}
      ],
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
      // Contrato normalizado 1.97: tolera snapshots 1.96 y devuelve SIEMPRE las llaves canónicas.
      return {
        precio_vivienda:Number(x.precio_vivienda ?? x.vivienda ?? 0),
        excedente_terreno:Number(x.excedente_terreno ?? x.excedente ?? 0),
        plusvalia:Number(x.plusvalia||0),
        fraccion_fusionada:Number(x.fraccion_fusionada||0),
        lote_adicional:Number(x.lote_adicional||0),
        construccion_adicional:Number(x.construccion_adicional||0),
        adicional:Number(x.adicional||0),
        gastos_operacion:Number(ap.financial_snapshot.total_gastos_operacion||0),
        bruto:Number(x.bruto ?? x.valor_total_vivienda ?? x.total_bruto ?? 0)
      };
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

  function distribucionesDisponibles(politica){
    const p=politica||politicaActual();
    const d=p.distribuciones_cobro||{};
    return [d.credito,d.contado,...(d.especiales||[])].filter(Boolean);
  }

  function resolverDistribucion(ap,politica){
    const p=politica||politicaActual();
    const id=ap?.financial_snapshot?.distribucion_comision_id||ap?.datos_cierre?.distribucion_comision_id||'';
    const todas=distribucionesDisponibles(p);
    if(id){ const found=todas.find(x=>x.id===id); if(found) return found; }
    // Compatibilidad: snapshots históricos 1.96 podían congelar únicamente distribucion_asesor.
    if(ap?.politica_snapshot && Array.isArray(p.distribucion_asesor) && p.distribucion_asesor.length){
      return {id:'LEGACY-SNAPSHOT',nombre:'Distribución congelada histórica',tipo:'legacy',partes:p.distribucion_asesor};
    }
    const tipo=String(ap?.financial_snapshot?.tipo_financiamiento||ap?.datos_cierre?.tipoCredito||'').toLowerCase();
    if(tipo==='contado'&&p.distribuciones_cobro?.contado) return p.distribuciones_cobro.contado;
    if(p.distribuciones_cobro?.credito) return p.distribuciones_cobro.credito;
    return {id:'LEGACY',nombre:'Distribución vigente',tipo:'legacy',partes:p.distribucion_asesor||[]};
  }

  function canalOperacion(ap){
    const o=ap?.oportunidadId&&typeof IANNA_OPO!=='undefined'?IANNA_OPO.porId(ap.oportunidadId):null;
    const brokerId=ap?.broker_id||o?.broker_id||null;
    const origen=String(o?.origen||o?.fuente||ap?.fuente||'').toLowerCase();
    if(brokerId||origen.includes('broker')||origen.includes('bróker')) return 'broker';
    if(origen.includes('recom')) return 'recomendacion';
    if(origen.includes('corp')||origen.includes('casa')) return 'corporativo';
    if(origen.includes('guardia')) return 'guardia';
    return 'directo';
  }
  function modalidadOperacion(ap){
    const t=String(ap?.financial_snapshot?.tipo_financiamiento||ap?.datos_cierre?.tipoCredito||'credito').toLowerCase();
    return t==='contado'?'contado':t;
  }
  function _splitSeleccion(id){
    const v=String(id||'');
    if(v.includes('|')){ const [cap,dist]=v.split('|'); return {cap,dist}; }
    if(v.includes('::')){ const [cap,dist]=v.split('::'); return {cap,dist}; }
    return {cap:'',dist:v};
  }
  function esquemasCaptacionDisponibles(politica){
    const p=politica||politicaActual();
    return Array.isArray(p.esquemas_captacion)&&p.esquemas_captacion.length ? p.esquemas_captacion : politicaDefault().esquemas_captacion;
  }
  function distribucionesTemporalesDisponibles(politica){
    const p=politica||politicaActual();
    return Array.isArray(p.distribuciones_temporales)&&p.distribuciones_temporales.length ? p.distribuciones_temporales : politicaDefault().distribuciones_temporales;
  }
  // 1.97.3 — Esquema Comercial unificado: modalidad + fuente + porcentajes + distribución.
  function _normalizarPctPartes(partes){
    return (partes||[]).map(x=>({parte:x.parte||('parte_'+Math.random().toString(36).slice(2,6)),nombre:x.nombre||x.parte||'Parte',evento:x.evento||x.parte||'manual',pct:Number(x.pct||0)}));
  }
  function esquemasComercialesDisponibles(politica){
    const p=politica||politicaActual();
    // 1.97.4: el esquema padre contiene fuentes; se aplana solo para el motor/cierre.
    if(Array.isArray(p.esquemas_pago)&&p.esquemas_pago.length){
      const out=[];
      p.esquemas_pago.filter(e=>e.activo!==false).forEach(e=>(e.fuentes||[]).filter(f=>f.activo!==false).forEach(f=>out.push({
        id:`${e.id}::${f.id}`,esquema_id:e.id,fuente_id:f.id,nombre:`${e.nombre} — ${f.nombre}`,
        modalidad:e.modalidad||'especial',canal:f.canal||f.id||'directo',fuente:f.nombre||f.id,
        porcentajes:{asesor:Number(f.porcentajes?.asesor||0),gerente:Number(f.porcentajes?.gerente||0),broker:Number(f.porcentajes?.broker||f.porcentajes?.tercero||0),tercero:Number(f.porcentajes?.tercero||f.porcentajes?.broker||0)},
        tercero_tipo:f.tercero_tipo||'',distribuciones:f.distribuciones||{},partes:(f.distribuciones?.asesor||[])
      })));
      return out;
    }
    if(Array.isArray(p.esquemas_comerciales)&&p.esquemas_comerciales.length) return p.esquemas_comerciales;
    const caps=esquemasCaptacionDisponibles(p);
    const dists=distribucionesTemporalesDisponibles(p);
    const out=[];
    caps.forEach(c=>{
      dists.forEach(d=>{
        if(!['credito','contado','especial'].includes(d.modalidad||'')) return;
        out.push({
          id:`ECOM-${String(d.modalidad||'especial').toUpperCase()}-${String(c.canal||c.id||'directo').toUpperCase()}`,
          nombre:`${d.nombre||d.modalidad} — ${c.nombre||c.fuente}`,
          modalidad:d.modalidad||'especial',
          canal:c.canal||'directo',
          fuente:c.fuente||c.nombre||'',
          porcentajes:{asesor:Number(c.porcentajes?.asesor||0),gerente:Number(c.porcentajes?.gerente||0),broker:Number(c.porcentajes?.broker||c.porcentajes?.tercero||0),tercero:Number(c.porcentajes?.tercero||c.porcentajes?.broker||0)},
          tercero_tipo:c.tercero_tipo||'',
          partes:_normalizarPctPartes(d.partes||[])
        });
      });
    });
    return out;
  }
  function resolverEsquemaCaptacion(ap,politica){
    const p=politica||politicaActual();
    const selected=_splitSeleccion(ap?.financial_snapshot?.esquema_comision_id||ap?.datos_cierre?.esquema_comision_id||'');
    const arr=esquemasCaptacionDisponibles(p);
    if(selected.cap){ const byId=arr.find(x=>x.id===selected.cap); if(byId) return byId; }
    const canal=canalOperacion(ap);
    return arr.find(x=>x.canal===canal)||arr.find(x=>x.canal==='directo')||arr[0]||null;
  }
  function resolverDistribucionTemporal(ap,politica){
    const p=politica||politicaActual();
    const selected=_splitSeleccion(ap?.financial_snapshot?.esquema_comision_id||ap?.datos_cierre?.esquema_comision_id||ap?.financial_snapshot?.distribucion_temporal_id||'');
    const arr=distribucionesTemporalesDisponibles(p);
    if(selected.dist){ const byId=arr.find(x=>x.id===selected.dist); if(byId) return byId; }
    const mod=modalidadOperacion(ap);
    return arr.find(x=>x.modalidad===mod)||arr.find(x=>x.modalidad==='credito')||arr[0]||null;
  }
  function resolverEsquema(ap,politica){
    const p=politica||politicaActual();
    const idSel=ap?.financial_snapshot?.esquema_comision_id||ap?.datos_cierre?.esquema_comision_id||'';
    const comerciales=esquemasComercialesDisponibles(p);
    if(comerciales.length){
      const mod=modalidadOperacion(ap), canal=canalOperacion(ap);
      const direct=comerciales.find(x=>x.id===idSel);
      const matched=direct||comerciales.find(x=>x.modalidad===mod&&x.canal===canal)||comerciales.find(x=>x.modalidad===mod&&x.canal==='directo')||comerciales[0];
      if(matched){
        return {
          id:matched.id,nombre:matched.nombre,modalidad:matched.modalidad,canal:matched.canal,fuente:matched.fuente||'',
          porcentajes:{asesor:Number(matched.porcentajes?.asesor||0),gerente:Number(matched.porcentajes?.gerente||0),broker:Number(matched.porcentajes?.broker||matched.porcentajes?.tercero||0),tercero:Number(matched.porcentajes?.tercero||matched.porcentajes?.broker||0)},
          tercero_tipo:matched.tercero_tipo||'',distribuciones:matched.distribuciones||{},partes:_normalizarPctPartes(matched.partes||[]), esquema_comercial:true
        };
      }
    }
    const cap=resolverEsquemaCaptacion(ap,p);
    const dist=resolverDistribucionTemporal(ap,p);
    if(cap&&dist){
      return {
        id: `${cap.id}|${dist.id}`,
        nombre: `${cap.nombre} · ${dist.nombre}`,
        modalidad: dist.modalidad,
        canal: cap.canal,
        porcentajes: {asesor:Number(cap.porcentajes?.asesor||0),gerente:Number(cap.porcentajes?.gerente||0),broker:Number(cap.porcentajes?.broker||cap.porcentajes?.tercero||0),tercero:Number(cap.porcentajes?.tercero||0)},
        tercero_tipo: cap.tercero_tipo||'',
        captacion_id: cap.id,
        distribucion_temporal_id: dist.id,
        partes: dist.partes||[]
      };
    }
    // Fallback 1.97.1
    const id=ap?.financial_snapshot?.esquema_comision_id||ap?.datos_cierre?.esquema_comision_id||'';
    const arr=p.esquemas_comision||[]; if(id){const f=arr.find(x=>x.id===id);if(f)return f;}
    const mod=modalidadOperacion(ap), canal=canalOperacion(ap);
    return arr.find(x=>x.modalidad===mod&&x.canal===canal)||arr.find(x=>x.modalidad===mod&&x.canal==='cualquiera')||null;
  }
  function comisionBeneficiario(ap,rol){
    const politica=ap.politica_snapshot||politicaActual(); const {base,politica_version}=baseComisionable(ap); const esquema=resolverEsquema(ap,politica);
    let pct=0, partes=[];
    if(esquema){pct=Number(esquema.porcentajes?.[rol]||0);partes=(esquema.distribuciones?.[rol]||esquema.distribuciones?.tercero||esquema.partes||[]);}
    else if(rol==='asesor') return null;
    else if(rol==='gerente'){pct=Number(politica.porcentajes?.gerente||0);partes=politica.distribucion_gerente||[];}
    else if(rol==='broker'){pct=Number(politica.porcentajes?.broker||0);partes=resolverDistribucion(ap,politica).partes||[];}
    const total=base*pct;
    return {rol,base,porcentaje:pct,total,partes:partes.map(p=>{const pv=p.pct_venta!=null?Number(p.pct_venta):null;const rel=pv!=null?(pct?pv/pct:0):Number(p.pct||0);return {parte:p.parte,nombre:p.nombre||p.parte,evento:p.evento||p.parte,pct:rel,pct_venta:pv,monto:pv!=null?base*pv:total*rel}}),politica_version,esquema_id:esquema?.id||null,esquema_nombre:esquema?.nombre||null,canal:canalOperacion(ap),modalidad:modalidadOperacion(ap),es_broker:canalOperacion(ap)==='broker'};
  }

  // Comisión completa del asesor. Devuelve el desglose por partes de la distribución.
  function comisionAsesor(ap){
    const politica=ap.politica_snapshot||politicaActual(); const esBroker=canalOperacion(ap)==='broker'; const tipoFin=modalidadOperacion(ap); const reglaContado=politica.reglas_especiales?.contado;
    const v2=comisionBeneficiario(ap,'asesor');
    if(v2){
      if(!esBroker&&tipoFin==='contado'&&reglaContado?.activa){ v2.porcentaje=Number(reglaContado.porcentaje_asesor||0); v2.total=v2.base*v2.porcentaje; v2.regla_especial_aplicada='contado'; }
      // Compatibilidad de snapshots 1.96/1.97: una distribución asesor congelada explícitamente manda si el cierre aún no seleccionó esquema v2.
      if(ap.politica_snapshot && !ap?.financial_snapshot?.esquema_comision_id && Array.isArray(politica.distribucion_asesor) && politica.distribucion_asesor.length){
        v2.partes=politica.distribucion_asesor.map(p=>({parte:p.parte,nombre:p.nombre||p.parte,evento:p.evento||p.parte,pct:Number(p.pct||0),monto:v2.total*Number(p.pct||0)}));
      }else{
        v2.partes=(v2.partes||[]).map(p=>({...p,monto:p.pct_venta!=null?v2.base*Number(p.pct_venta):v2.total*Number(p.pct||0)}));
      }
      return v2;
    }
    const {base,politica_version}=baseComisionable(ap); const pct=(!esBroker&&tipoFin==='contado'&&reglaContado?.activa)?Number(reglaContado.porcentaje_asesor||0):(esBroker?politica.porcentajes.asesor_broker:politica.porcentajes.asesor_directo); const total=base*pct; const dist=resolverDistribucion(ap,politica);
    return {rol:'asesor',beneficiario_id:ap.asesor,base,porcentaje:pct,total,partes:(dist.partes||[]).map(p=>({parte:p.parte,nombre:p.nombre||p.parte,evento:p.evento||p.parte,pct:Number(p.pct||0),monto:total*Number(p.pct||0)})),politica_version,es_broker:esBroker,regla_especial_aplicada:(!esBroker&&tipoFin==='contado'&&reglaContado?.activa)?'contado':null};
  }

  // Comisión del gerente sobre esta operación.
  function comisionGerente(ap){ return comisionBeneficiario(ap,'gerente'); }
  function comisionBroker(ap){ const c=comisionBeneficiario(ap,'broker'); return (c&&c.total>0)?c:{rol:'broker',base:0,porcentaje:0,total:0,partes:[],es_broker:canalOperacion(ap)==='broker'}; }

  // Registra las comisiones devengadas en el ledger financiero (una entrada por parte).
  // Se llama automáticamente al ejecutar la operación "contrato_firmado".
  function devengarComisiones(ap){
    if(!ap || ap.estatus !== 'Venta') return { asesor:null, gerente:null };
    const politica_version = (ap.politica_snapshot||{}).version || politicaActual().version;
    const asesor = comisionAsesor(ap);
    const gerente = comisionGerente(ap);
    const broker = comisionBroker(ap);
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
    (broker.partes||[]).forEach(p=>IANNA_FIN.registrarMovimiento({tipo:'comision_broker',operacionId:ap.id,personaId:ap.prospectoId,monto:p.monto,concepto:`Comisión broker — parte ${p.parte} (${IANNA_FMT.PCT(p.pct)})`,documento:ap.id_venta||ap.id_publico,politica_version,motivo:`Devengo broker según esquema ${broker.esquema_nombre||''}`}));
    return { asesor, gerente, broker };
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
    conceptos, baseComisionable, distribucionesDisponibles, resolverDistribucion, canalOperacion, modalidadOperacion, esquemasCaptacionDisponibles, distribucionesTemporalesDisponibles, resolverEsquemaCaptacion, resolverDistribucionTemporal, esquemasComercialesDisponibles, resolverEsquema, comisionBeneficiario, comisionAsesor, comisionGerente, comisionBroker,
    // Devengo y penalización
    devengarComisiones, calcularPenalizacion,
  };
})();
