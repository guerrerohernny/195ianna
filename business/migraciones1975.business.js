/* IANNA CRM 1.97.5 — estabilización raíz */
window.IANNA_MIG_1975=(function(){
  function run(){
    try{
      if(DS.db.migracion_1975) return false;
      const pol=IANNA_COM.politicaActual();
      (pol.esquemas_pago||[]).forEach(e=>(e.fuentes||[]).forEach(f=>['asesor','gerente','tercero'].forEach(rol=>{
        const total=Number(f.porcentajes?.[rol]||0), arr=f.distribuciones?.[rol]||[];
        arr.forEach(x=>{ if(x.pct_venta==null) x.pct_venta=Number(x.pct||0)*total; });
      })));
      (DS.db.prospectos||[]).forEach(p=>{
        const n=(DS.db.apartados||[]).filter(a=>a.prospectoId===p.id&&a.estatus==='Venta').length;
        if(n){ p.tiene_ventas_historicas=true; p.ventas_historicas_count=n; }
      });
      DS.db.migracion_1975={fecha:new Date().toISOString(),schema_version:'1.97.5',motivo:'Layout único, contado sin crédito, esquemas sin legacy, datos maestros y ventas históricas persistentes.'};
      DS._save(DS.db); return true;
    }catch(e){ console.error('[1.97.5]',e); return false; }
  }
  return {run};
})();
