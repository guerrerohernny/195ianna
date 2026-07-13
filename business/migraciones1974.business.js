/* IANNA CRM 1.97.4 — esquemas matriciales de comisión, nómina base y cobranza v2 */
window.IANNA_MIG_1974=(function(){
  const FUENTES=[
    {id:'personal',nombre:'Personal del asesor',canal:'directo'},
    {id:'broker',nombre:'Bróker',canal:'broker',tercero_tipo:'Bróker'},
    {id:'digital',nombre:'Digital',canal:'digital'},
    {id:'guardia',nombre:'Guardia',canal:'guardia'},
    {id:'corporativo',nombre:'Corporativo',canal:'corporativo'},
    {id:'recomendacion',nombre:'Recomendación de cliente',canal:'recomendacion',tercero_tipo:'Recomendador'}
  ];
  function dist2(a,b){return [{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:a},{parte:'escritura',nombre:'Escritura',evento:'escriturado',pct:b}]}
  function fuente(base,modalidad){
    const m=modalidad==='contado';
    const cfg={
      personal:[m?0.025:0.02,0.005,0], broker:[m?0.015:0.01,0.005,m?0.025:0.02], digital:[m?0.02:0.015,0.005,0],
      guardia:[m?0.02:0.015,0.005,0], corporativo:[m?0.015:0.01,0.005,0], recomendacion:[m?0.025:0.02,0.005,0.005]
    }[base.id];
    const da=base.id==='broker'?(m?dist2(.333333,.666667):dist2(.5,.5)):(base.id==='recomendacion'?dist2(m?.4:.5,m?.6:.5):dist2(m?.4:.5,m?.6:.5));
    const dg=dist2(.5,.5);
    const dt=base.id==='broker'?dist2(m?.1:.125,m?.9:.875):(base.id==='recomendacion'?[{parte:'escritura',nombre:'Escritura',evento:'escriturado',pct:1}]:[]);
    return {...base,porcentajes:{asesor:cfg[0],gerente:cfg[1],tercero:cfg[2],broker:cfg[2]},distribuciones:{asesor:da,gerente:dg,tercero:dt}};
  }
  function defaults(){return [
    {id:'ESQ-CREDITO',nombre:'Crédito hipotecario',modalidad:'credito',activo:true,fuentes:FUENTES.map(f=>fuente(f,'credito'))},
    {id:'ESQ-CONTADO',nombre:'Contado',modalidad:'contado',activo:true,fuentes:FUENTES.map(f=>fuente(f,'contado'))},
    {id:'ESQ-ESPECIAL-1',nombre:'Esquema especial 1',modalidad:'especial',activo:true,fuentes:FUENTES.map(f=>({...fuente(f,'contado'),porcentajes:{asesor:f.id==='personal'?0.03:f.id==='broker'?0.02:0.02,gerente:0.0075,tercero:f.id==='broker'?0.025:f.id==='recomendacion'?0.005:0,broker:f.id==='broker'?0.025:0},distribuciones:{asesor:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:.333333},{parte:'condicion_1',nombre:'Condición 1',evento:'manual',pct:.333333},{parte:'escritura',nombre:'Escritura',evento:'escriturado',pct:.333334}],gerente:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:.333333},{parte:'condicion_1',nombre:'Condición 1',evento:'manual',pct:.333333},{parte:'escritura',nombre:'Escritura',evento:'escriturado',pct:.333334}],tercero:f.id==='broker'?dist2(.1,.9):f.id==='recomendacion'?[{parte:'escritura',nombre:'Escritura',evento:'escriturado',pct:1}]:[]}}))}
  ]}
  function run(){
    try{
      if(DS.db.migracion_1974) return false;
      const pol=typeof IANNA_COM!=='undefined'?IANNA_COM.politicaActual():null;
      if(pol && (!Array.isArray(pol.esquemas_pago)||!pol.esquemas_pago.length)){
        pol.esquemas_pago=defaults();
        const arr=DS.db.politicas_comision||[];
        if(arr.length) arr[0]={...pol}; else DS.db.politicas_comision=[pol];
      }
      DS.db.comisiones_nomina=DS.db.comisiones_nomina||[];
      DS.db.cortes_comision=DS.db.cortes_comision||[];
      DS.db.migracion_1974={fecha:new Date().toISOString(),schema_version:'1.97.4',motivo:'Esquemas de pago por modalidad/fuente/rol, nómina base, cobranza estado de cuenta y layout estable.'};
      DS._save(DS.db); return true;
    }catch(e){console.error('[1.97.4] migración',e);return false;}
  }
  return {run,defaults};
})();
