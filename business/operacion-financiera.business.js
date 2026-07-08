/* ════════════════════════════════════════════════════════════════
   IANNA CRM — business/operacion-financiera.business.js
   Fase 1.96 · Composición comercial, financiamiento y snapshots
   Una sola fuente de verdad para el valor comercial de la operación.
   ════════════════════════════════════════════════════════════════ */
window.IANNA_VALOR = (function(){
  function n(v){ v=Number(v); return Number.isFinite(v)?v:0; }
  function desglose(ap){
    if(!ap) return {vivienda:0, excedente:0, fraccion_fusionada:0, lote_adicional:0, construccion_adicional:0, plusvalia:0, total:0};
    const l=getLote(ap.clave_lote)||{};
    const m=getMod(ap.modelo_id)||{};
    const P=getP();
    const pExc=n(P.precio_m2_exc)||9000;
    const pAdic=n(P.precio_m2_lote_adicional)||13000;
    const soloTerreno=ap.modelo_id==='SOLO_TERRENO';
    const vivienda = soloTerreno ? n(l.terreno)*(n(P.precio_m2_solo)||14500) : n(m.precio);
    const excedente = soloTerreno ? 0 : n(l.excedente)*pExc;
    const fraccion_fusionada = soloTerreno ? 0 : (l.fraccion_fusionada ? n(l.fraccion_m2_adicional)*(n(l.fraccion_precio_m2)||pAdic) : 0);
    let lote_adicional=0;
    if(ap.clave_lote_adicional){ const la=getLote(ap.clave_lote_adicional); if(la) lote_adicional=n(la.terreno)*pAdic; }
    const construccion_adicional=n(ap.construccion_adicional_val);
    const plusvalia=n(l.plusvalia);
    const total=vivienda+excedente+fraccion_fusionada+lote_adicional+construccion_adicional+plusvalia;
    return {vivienda,excedente,fraccion_fusionada,lote_adicional,construccion_adicional,plusvalia,total};
  }
  function valorTotalVivienda(ap){ return desglose(ap).total; }
  function esContado(tipo){ return String(tipo||'').toLowerCase()==='contado'; }
  function instituciones(){
    const P=getP();
    return (P.instituciones||MASTER_PARAMS.instituciones||[]).filter(x=>x.activo!==false).sort((a,b)=>(a.orden||999)-(b.orden||999));
  }
  function institucion(id){ return instituciones().find(x=>x.id===id)||null; }
  function gastosSugeridos(ap, credito, tipoFin){
    const P=getP(); const base=valorTotalVivienda(ap); const contado=esContado(tipoFin);
    return (P.gastos_operacion||MASTER_PARAMS.gastos_operacion||[]).filter(g=>g.activo!==false).filter(g=>{
      if(contado) return g.aplica_contado===true || ['avaluo','gastos_notariales'].includes(g.id);
      return g.aplica_credito!==false;
    }).map(g=>{
      let monto=0;
      if(g.tipo==='fijo') monto=n(g.valor);
      else if(g.tipo==='pct_vivienda') monto=base*n(g.valor);
      else if(g.tipo==='pct_credito') monto=n(credito)*n(g.valor);
      return {...g,monto_calculado:monto,monto_aplicado:monto,origen:'parametro',modificado_manualmente:false};
    });
  }
  function deepFreeze(v){ if(v&&typeof v==='object'&&!Object.isFrozen(v)){ Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; }
  function snapshot(ap, ctx){
    const d=desglose(ap); const gastos=(ctx.gastos||[]).map(g=>JSON.parse(JSON.stringify(g)));
    return deepFreeze({
      schema_version:'1.96',
      creado_en:new Date().toISOString(),
      valor_vivienda:d.vivienda, terreno_excedente:d.excedente, fraccion_fusionada:d.fraccion_fusionada,
      lote_adicional:d.lote_adicional, construccion_adicional:d.construccion_adicional, plusvalia:d.plusvalia,
      valor_total_vivienda:d.total,
      gastos_operacion:gastos, total_gastos_operacion:gastos.reduce((s,g)=>s+n(g.monto_aplicado),0),
      valor_total_financiero:d.total+gastos.reduce((s,g)=>s+n(g.monto_aplicado),0),
      apartado:n(ctx.apartado), descuento:n(ctx.descuento), pago_adicional:n(ctx.pago_adicional),
      forma_pago_adicional:ctx.forma_pago_adicional||'', institucion_financiera_id:ctx.institucion_id||'',
      institucion_financiera_nombre:ctx.institucion_nombre||'', tipo_financiamiento:ctx.tipo_financiamiento||'',
      credito_pct:n(ctx.credito_pct), credito_monto:n(ctx.credito_monto), componente_publico_tipo:ctx.componente_publico_tipo||'',
      componente_publico_monto:n(ctx.componente_publico_monto), complemento_bancario:n(ctx.complemento_bancario),
      desembolso:n(ctx.desembolso), base_comisionable:n(ctx.base_comisionable), base_comisionable_snapshot:JSON.parse(JSON.stringify(ctx.base_snapshot||{})), politica_comision_version:ctx.politica_version||'',
      regla_especial_aplicada:ctx.regla_especial_aplicada||null, porcentaje_comision:n(ctx.porcentaje_comision),
      distribucion_comision:JSON.parse(JSON.stringify(ctx.distribucion_comision||[]))
    });
  }
  return {desglose,valorTotalVivienda,gastosSugeridos,instituciones,institucion,esContado,snapshot};
})();
