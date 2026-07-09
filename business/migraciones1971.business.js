/* IANNA CRM 1.97.1 — migración idempotente de política comercial */
window.IANNA_MIG_1971=(function(){
  const FLAG='mig_1_97_1';
  function run(){
    if(DS.db.meta?.[FLAG]) return {ok:true,ya:true};
    const def=IANNA_COM.politicaDefault();
    if(DS.db.politicas_comerciales?.actual && !Array.isArray(DS.db.politicas_comerciales.actual.esquemas_comision)){
      DS.db.politicas_comerciales.actual.esquemas_comision=JSON.parse(JSON.stringify(def.esquemas_comision));
    }
    (DS.db.politicas_comerciales?.historial||[]).forEach(p=>{ if(!Array.isArray(p.esquemas_comision)) p.esquemas_comision=JSON.parse(JSON.stringify(def.esquemas_comision)); });
    if(!DS.db.meta) DS.db.meta={}; DS.db.meta[FLAG]=new Date().toISOString(); DS._save(DS.db);
    return {ok:true,ya:false};
  }
  return {run};
})();
