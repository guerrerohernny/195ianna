/* IANNA CRM 1.97.2 — migración idempotente de comisiones v3 y UI */
window.IANNA_MIG_1972=(function(){
  const FLAG='mig_1_97_2';
  function run(){
    if(DS.db.meta?.[FLAG]) return {ok:true,ya:true};
    const def=IANNA_COM.politicaDefault();
    const all=[];
    if(DS.db.politicas_comerciales?.actual) all.push(DS.db.politicas_comerciales.actual);
    (DS.db.politicas_comerciales?.historial||[]).forEach(p=>all.push(p));
    all.forEach(p=>{
      if(!Array.isArray(p.esquemas_captacion)||!p.esquemas_captacion.length) p.esquemas_captacion=JSON.parse(JSON.stringify(def.esquemas_captacion));
      if(!Array.isArray(p.distribuciones_temporales)||!p.distribuciones_temporales.length) p.distribuciones_temporales=JSON.parse(JSON.stringify(def.distribuciones_temporales));
    });
    if(!DS.db.meta) DS.db.meta={};
    DS.db.meta[FLAG]=new Date().toISOString();
    DS._save(DS.db);
    return {ok:true,ya:false};
  }
  return {run};
})();
