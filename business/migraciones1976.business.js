/* IANNA CRM 1.97.6 — ciclo de comisiones, hitos y cortes reales */
window.IANNA_MIG_1976=(function(){
  function run(){
    try{
      if(DS.db.migracion_1976) return false;
      DS.db.comisiones_nomina=DS.db.comisiones_nomina||[];
      DS.db.cortes_comision=DS.db.cortes_comision||[];
      DS.db.beneficiarios_externos=DS.db.beneficiarios_externos||[];
      let ventas=0,lineas=0;
      (DS.db.apartados||[]).filter(a=>a.estatus==='Venta').forEach(a=>{
        const antes=(DS.db.comisiones_nomina||[]).length;
        const r=IANNA_COM_CICLO.activarVenta(a,{migracion:true,usuario:'system'});
        if(r&&r.ok!==false){ventas++;lineas+=(DS.db.comisiones_nomina||[]).length-antes;}
      });
      (DS.db.comisiones_nomina||[]).forEach(l=>{
        if(!l.estado) l.estado=IANNA_COM_CICLO.ESTADOS_LINEA.PENDIENTE;
        if(!l.origen) l.origen='legacy_1974';
      });
      DS.db.migracion_1976={fecha:new Date().toISOString(),schema_version:'1.97.6',ventas_preparadas:ventas,lineas_creadas:lineas,motivo:'Snapshot de comisión por Venta, hitos de devengo, líneas elegibles y cortes de comisión.'};
      DS._save(DS.db); return true;
    }catch(e){console.error('[1.97.6] migración',e);return false;}
  }
  return {run};
})();
