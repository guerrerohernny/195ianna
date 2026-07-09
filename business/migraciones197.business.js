/* Fase 1.97 — migraciones idempotentes */
window.IANNA_MIG_197=(function(){
  function run(){
    if(DS.db._migraciones?.fase197)return {ok:true,ya:true};
    DS.db._migraciones=DS.db._migraciones||{};
    const pol=IANNA_COM.politicaActual();
    if(!pol.distribuciones_cobro){
      pol.distribuciones_cobro={
        credito:{id:'DCO-CREDITO',nombre:'Crédito hipotecario',tipo:'credito',partes:JSON.parse(JSON.stringify(pol.distribucion_asesor||[]))},
        contado:{id:'DCO-CONTADO',nombre:'Contado',tipo:'contado',partes:[{parte:'firma',nombre:'Firma',evento:'contrato_firmado',pct:.5},{parte:'escritura',nombre:'Escritura',evento:'escrituracion',pct:.5}]}, especiales:[]
      };
      DS.db.politicas_comerciales.actual=pol;
    }
    (DS.db.apartados||[]).forEach(ap=>{
      const x=ap.financial_snapshot?.base_comisionable_snapshot; if(x&&x.precio_vivienda===undefined){x.precio_vivienda=Number(x.vivienda||0);x.excedente_terreno=Number(x.excedente||0);}
      if(ap.fecha_apartado&&!ap.fecha_vencimiento&&ap.estatus==='Activo'){const d=new Date(ap.fecha_apartado+'T12:00:00');const dias=Number(ap.vigencia_dias_snapshot||getP().vigencia_apartado_dias||15);d.setDate(d.getDate()+dias);ap.vigencia_dias_snapshot=dias;ap.fecha_vencimiento=d.toISOString().slice(0,10);}
    });
    DS.db._migraciones.fase197={fecha:new Date().toISOString(),version:'1.97'}; DS._save(DS.db); return {ok:true};
  }
  return {run};
})();
