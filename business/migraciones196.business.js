/* IANNA CRM — Fase 1.96 · migraciones idempotentes de producto */
window.IANNA_MIG_196=(function(){
  function run(){
    if(DS.db.migracion_196_producto) return false;
    const respaldo={fecha:new Date().toISOString(),params:JSON.parse(JSON.stringify(getP())),politica:JSON.parse(JSON.stringify(DS.db.politicas_comerciales||null))};
    DS.db.backup_pre_196=respaldo;
    if(typeof IANNA_IDS!=='undefined'&&IANNA_IDS.migrar196) IANNA_IDS.migrar196();

    // Relaciones permanentes a LOT-, conservando claves internas sólo para compatibilidad de runtime 1.x.
    (DS.db.apartados||[]).forEach(a=>{
      const l=getLote(a.clave_lote); if(l) a.lote_id=l.id_publico;
      if(a.clave_lote_adicional){ const la=getLote(a.clave_lote_adicional); if(la) a.lote_adicional_id=la.id_publico; }
    });

    // Catálogo financiero 1.96: merge por id, sin destruir personalizaciones existentes.
    const P=getP();
    const actuales=Array.isArray(P.instituciones)?P.instituciones:[];
    const map=new Map(actuales.map(x=>[x.id,{...x}]));
    (MASTER_PARAMS.instituciones||[]).forEach(def=>map.set(def.id,{...def,...(map.get(def.id)||{})}));
    const gastosAct=Array.isArray(P.gastos_operacion)?P.gastos_operacion:[];
    const gm=new Map(gastosAct.map(x=>[x.id,{...x}]));
    (MASTER_PARAMS.gastos_operacion||[]).forEach(def=>gm.set(def.id,{...def,...(gm.get(def.id)||{})}));
    DS.saveParams({instituciones:[...map.values()],gastos_operacion:[...gm.values()]});

    // Política vigente: añade capacidades 1.96 sin recalcular cierres históricos.
    const pol=DS.db.politicas_comerciales?.actual;
    if(pol){
      pol.reglas_especiales=pol.reglas_especiales||{contado:{activa:false,porcentaje_asesor:0.025}};
      if(!pol.reglas_especiales.contado) pol.reglas_especiales.contado={activa:false,porcentaje_asesor:0.025};
      const bc=pol.base_comisionable||(pol.base_comisionable={});
      if(bc.fraccion_fusionada===undefined) bc.fraccion_fusionada=!!bc.adicional;
      if(bc.lote_adicional===undefined) bc.lote_adicional=!!bc.adicional;
      if(bc.construccion_adicional===undefined) bc.construccion_adicional=!!bc.adicional;
      (pol.distribucion_asesor||[]).forEach((x,i)=>{ if(!x.nombre)x.nombre=x.parte==='firma'?'Firma de contrato':x.parte==='escrituracion'?'Escrituración':'Parte '+(i+1); if(!x.evento)x.evento=x.parte; });
      (pol.distribucion_gerente||[]).forEach((x,i)=>{ if(!x.nombre)x.nombre=x.parte==='firma'?'Firma de contrato':x.parte==='escrituracion'?'Escrituración':'Parte '+(i+1); if(!x.evento)x.evento=x.parte; });
    }
    DS.db.migracion_196_producto={fecha:new Date().toISOString(),schema_version:'1.96'};
    DS._save(DS.db);
    try{ IANNA_MOTOR.auditar('sistema','migracion_196','MIGRACION_PRODUCTO_196',{},DS.db.migracion_196_producto,'Reglas comerciales, instituciones, nomenclatura y relaciones LOT'); }catch(e){}
    return true;
  }
  return {run};
})();
