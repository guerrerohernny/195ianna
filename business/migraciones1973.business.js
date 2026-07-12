/* IANNA CRM 1.97.3 — migración: esquemas comerciales unificados y filtros operativos */
window.IANNA_MIG_1973=(function(){
  function run(){
    try{
      if(DS.db.migracion_1973) return false;
      const pols=DS.db.politicas_comision||[];
      if(typeof IANNA_COM!=='undefined'){
        const actual=IANNA_COM.politicaActual();
        const comerciales=IANNA_COM.esquemasComercialesDisponibles(actual);
        if(!actual.esquemas_comerciales||!actual.esquemas_comerciales.length){ actual.esquemas_comerciales=comerciales; }
        if(pols.length){
          pols[0]={...actual};
        }else{
          DS.db.politicas_comision=[actual];
        }
      }
      DS.db.migracion_1973={fecha:new Date().toISOString(),schema_version:'1.97.3',motivo:'Comisiones v4: esquema comercial unificado; control de operaciones negocio/técnico; layout/nav reset.'};
      DS._save(DS.db);
      return true;
    }catch(e){ console.error('[1.97.3] migración',e); return false; }
  }
  return {run};
})();
