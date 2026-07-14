/* ════════════════════════════════════════════════════════════════
   IANNA CRM — business/comisiones-lifecycle.business.js
   Fase 1.97.6 · Ciclo de vida de comisiones y cortes
   ────────────────────────────────────────────────────────────────
   Separa cuatro conceptos que antes estaban mezclados:
   1) Política congelada de comisión por Venta.
   2) Hito comercial cumplido (firma, autorización, escritura...).
   3) Línea de comisión elegible para corte.
   4) Corte / pago de nómina de comisiones.

   Regla: una comisión no se considera pagada al cumplir un hito.
   El hito únicamente vuelve ELEGIBLE la línea correspondiente.
   ════════════════════════════════════════════════════════════════ */
window.IANNA_COM_CICLO = (function(){
  const ESTADOS_LINEA={
    PENDIENTE:'pendiente_hito', ELEGIBLE:'elegible', EN_CORTE:'en_corte',
    PAGADA:'pagada', CANCELADA:'cancelada', AJUSTADA:'ajustada'
  };
  const ESTADOS_HITO={PENDIENTE:'PENDIENTE',CUMPLIDO:'CUMPLIDO',REVOCADO:'REVOCADO'};

  const ahora=()=>new Date().toISOString();
  const clon=x=>JSON.parse(JSON.stringify(x||null));
  function slug(v){return String(v||'hito').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'hito';}
  function eventoCanonico(p,i){
    const raw=String(p?.evento||p?.parte||p?.nombre||('hito_'+(i+1))).toLowerCase();
    const nom=String(p?.nombre||p?.parte||'').toLowerCase();
    if(raw.includes('contrato_firmado')||raw==='firma'||nom.includes('firma')) return 'contrato_firmado';
    if(raw.includes('escritur')||nom.includes('escritur')) return 'escrituracion';
    if(raw.includes('autoriz')||nom.includes('autoriz')) return 'credito_autorizado';
    if(raw==='manual') return slug(p?.parte||p?.nombre||('condicion_'+(i+1)));
    return slug(raw);
  }
  function nombreHito(p,i){
    const ev=eventoCanonico(p,i);
    if(ev==='contrato_firmado') return 'Firma de contrato';
    if(ev==='escrituracion') return 'Escrituración';
    if(ev==='credito_autorizado') return 'Autorización de crédito';
    return p?.nombre||p?.parte||('Condición '+(i+1));
  }
  function usuarioGerente(){
    const us=usuariosService?.listar?.()||DS.find('usuarios');
    return us.find(u=>u.activo!==false&&u.rol==='gerente')||us.find(u=>u.activo!==false&&u.rol==='administrador')||null;
  }
  function beneficiarioExterno(nombre,tipo){
    const nm=String(nombre||'').trim(); if(!nm) return null;
    return beneficiariosExternosService.obtenerOCrear(nm,tipo||'Externo');
  }
  function beneficiarioRol(ap,rol,esquema){
    if(rol==='asesor'){
      const u=getUser(ap.asesor)||{};
      return {id:ap.asesor||u.id||'',id_publico:u.id_publico||'',nombre:u.nombre||'Asesor',tipo:'usuario',rol:'asesor'};
    }
    if(rol==='gerente'){
      const u=usuarioGerente()||{};
      return {id:u.id||'',id_publico:u.id_publico||'',nombre:u.nombre||getP().gerente||'Gerencia',tipo:'usuario',rol:'gerente'};
    }
    const canal=String(esquema?.canal||'');
    if(canal==='broker'){
      const id=ap?.financial_snapshot?.broker_comision_id||ap?.datos_cierre?.broker_comision_id||ap?.broker_id||'';
      const b=id?brokersService.obtener(id):null;
      return b?{id:b.id,id_publico:b.id_publico||'',nombre:b.nombre||'Bróker',tipo:'broker',rol:'tercero'}:null;
    }
    if(canal==='recomendacion'){
      const nombre=ap?.financial_snapshot?.recomendador_nombre||ap?.datos_cierre?.recomendador_nombre||'';
      const ext=beneficiarioExterno(nombre,'Recomendador');
      return ext?{id:ext.id,id_publico:ext.id_publico||'',nombre:ext.nombre,tipo:'beneficiario_externo',rol:'tercero'}:null;
    }
    if(Number(esquema?.porcentajes?.tercero||0)>0){
      const ext=beneficiarioExterno(esquema?.tercero_tipo||esquema?.fuente||'Tercero',esquema?.tercero_tipo||'Tercero');
      return ext?{id:ext.id,id_publico:ext.id_publico||'',nombre:ext.nombre,tipo:'beneficiario_externo',rol:'tercero'}:null;
    }
    return null;
  }

  function construirSnapshot(ap){
    if(!ap) return {ok:false,error:'Operación inexistente'};
    const politica=ap.politica_snapshot||IANNA_COM.snapshotDePolitica(ap);
    const esquema=IANNA_COM.resolverEsquema(ap,politica);
    if(!esquema) return {ok:false,error:'La operación no tiene un esquema comercial de comisión válido'};
    const baseInfo=IANNA_COM.baseComisionable(ap), base=Number(baseInfo.base||0);
    const roles=['asesor','gerente','tercero'];
    const hitosMap=new Map(), lineas=[];
    roles.forEach(rol=>{
      const pct=Number(esquema.porcentajes?.[rol]||0);
      if(pct<=0) return;
      const beneficiario=beneficiarioRol(ap,rol,esquema);
      if(!beneficiario) return;
      const partes=(esquema.distribuciones?.[rol]||((rol==='tercero')?esquema.distribuciones?.tercero:null)||esquema.partes||[]);
      partes.forEach((p,i)=>{
        const evento=eventoCanonico(p,i), hitoId='HIT-'+slug(evento);
        if(!hitosMap.has(hitoId)) hitosMap.set(hitoId,{id:hitoId,evento,nombre:nombreHito(p,i),orden:hitosMap.size+1,estado:ESTADOS_HITO.PENDIENTE,automatico:evento==='contrato_firmado'});
        const pctVenta=p.pct_venta!=null?Number(p.pct_venta):pct*Number(p.pct||0);
        if(pctVenta<=0) return;
        lineas.push({
          clave:`${ap.id}:${rol}:${slug(p.parte||p.nombre||evento)}`,
          rol, beneficiario:clon(beneficiario), hito_id:hitoId, evento,
          parte:p.parte||slug(p.nombre||evento), parte_nombre:p.nombre||nombreHito(p,i),
          porcentaje_venta:pctVenta, base, monto:base*pctVenta,
          estado:ESTADOS_LINEA.PENDIENTE
        });
      });
    });
    return {ok:true,snapshot:{
      version:'COM-LC-v1',creado_en:ahora(),politica_version:politica.version||baseInfo.politica_version||'v1',
      esquema_id:esquema.id,esquema_nombre:esquema.nombre,modalidad:esquema.modalidad,
      fuente_id:ap?.financial_snapshot?.fuente_comision_id||ap?.datos_cierre?.fuente_comision_id||'',
      fuente_nombre:esquema.fuente||'',canal:esquema.canal||'',tercero_tipo:esquema.tercero_tipo||'',
      base_comisionable:base,porcentajes:clon(esquema.porcentajes||{}),
      hitos:[...hitosMap.values()],lineas
    }};
  }

  function guardarSnapshot(aid,snapshot){
    apartadosService.actualizar(aid,{comision_snapshot:clon(snapshot)});
    return snapshot;
  }
  function prepararVenta(ap,opts){
    opts=opts||{}; const actual=apartadosService.obtener(ap?.id)||ap;
    if(!actual) return {ok:false,error:'Operación inexistente'};
    let snapshot=actual.comision_snapshot;
    if(!snapshot){ const r=construirSnapshot(actual); if(!r.ok)return r; snapshot=guardarSnapshot(actual.id,r.snapshot); }
    const existentes=comisionesNominaService.lineas({operacion_id:actual.id});
    (snapshot.lineas||[]).forEach(l=>{
      if(existentes.some(x=>x.clave===l.clave&&x.estado!==ESTADOS_LINEA.CANCELADA)) return;
      comisionesNominaService.crearLinea({
        id_publico:IANNA_IDS.asignar('comision'),clave:l.clave,operacion_id:actual.id,
        venta_id:actual.id_venta||actual.id_publico,persona_id:actual.prospectoId,
        esquema_id:snapshot.esquema_id,esquema_nombre:snapshot.esquema_nombre,
        fuente_id:snapshot.fuente_id,fuente_nombre:snapshot.fuente_nombre,
        rol:l.rol,beneficiario_id:l.beneficiario?.id||'',beneficiario_publico:l.beneficiario?.id_publico||'',
        beneficiario:l.beneficiario?.nombre||'',beneficiario_tipo:l.beneficiario?.tipo||'',
        hito_id:l.hito_id,evento:l.evento,parte:l.parte,parte_nombre:l.parte_nombre,
        porcentaje_venta:Number(l.porcentaje_venta||0),base:Number(l.base||0),monto:Number(l.monto||0),
        estado:ESTADOS_LINEA.PENDIENTE,creado_en:ahora(),origen:opts.migracion?'migracion_1976':'ciclo_comision'
      });
    });
    return {ok:true,snapshot,lineas:comisionesNominaService.lineas({operacion_id:actual.id})};
  }

  function _actualizarHito(aid,hitoId,patch){
    const ap=apartadosService.obtener(aid); if(!ap?.comision_snapshot)return null;
    const snap=clon(ap.comision_snapshot); const h=snap.hitos.find(x=>x.id===hitoId); if(!h)return null;
    Object.assign(h,patch); guardarSnapshot(aid,snap); return h;
  }
  function cumplirHito(aid,hitoId,ctx){
    ctx=ctx||{};
    if(!ctx.sistema){const auth=AUTORIZADOR.autorizar('marcar_hito_comision',{registroId:aid});if(!auth.ok)return auth;}
    const ap=apartadosService.obtener(aid); if(!ap||ap.estatus!=='Venta')return {ok:false,error:'Los hitos de comisión pertenecen a una Venta'};
    const prep=prepararVenta(ap); if(!prep.ok)return prep;
    const h=prep.snapshot.hitos.find(x=>x.id===hitoId); if(!h)return {ok:false,error:'Hito inexistente'};
    if(h.estado===ESTADOS_HITO.CUMPLIDO)return {ok:true,yaCumplido:true,hito:h};
    const fecha=ctx.fecha||ahora();
    const actualizado=_actualizarHito(aid,hitoId,{estado:ESTADOS_HITO.CUMPLIDO,cumplido_en:fecha,cumplido_por:ctx.usuario||CU?.id||'system',nota:ctx.nota||'',evidencia:ctx.evidencia||''});
    const lineas=comisionesNominaService.lineas({operacion_id:aid}).filter(x=>x.hito_id===hitoId&&x.estado===ESTADOS_LINEA.PENDIENTE);
    lineas.forEach(x=>comisionesNominaService.actualizarLinea(x.id,{estado:ESTADOS_LINEA.ELEGIBLE,fecha_elegible:fecha,hito_cumplido_por:ctx.usuario||CU?.id||'system'}));
    try{IANNA_MOTOR.auditar('comisiones',aid,'CUMPLIR_HITO_COMISION',{hito:hitoId,estado:h.estado},{hito:hitoId,estado:ESTADOS_HITO.CUMPLIDO,lineas:lineas.length},ctx.nota||actualizado.nombre);}catch(e){}
    return {ok:true,hito:actualizado,lineas_elegibles:lineas.length};
  }
  function revocarHito(aid,hitoId,motivo){
    const auth=AUTORIZADOR.autorizar('marcar_hito_comision',{registroId:aid}); if(!auth.ok)return auth;
    if(!String(motivo||'').trim())return {ok:false,error:'El motivo es obligatorio'};
    const lineas=comisionesNominaService.lineas({operacion_id:aid}).filter(x=>x.hito_id===hitoId&&x.estado!==ESTADOS_LINEA.CANCELADA);
    if(lineas.some(x=>[ESTADOS_LINEA.EN_CORTE,ESTADOS_LINEA.PAGADA].includes(x.estado))) return {ok:false,error:'No puede revocarse: existen líneas en corte o pagadas'};
    lineas.forEach(x=>comisionesNominaService.actualizarLinea(x.id,{estado:ESTADOS_LINEA.PENDIENTE,fecha_elegible:null,revocado_en:ahora(),revocado_por:CU.id,motivo_revocacion:String(motivo).trim()}));
    const h=_actualizarHito(aid,hitoId,{estado:ESTADOS_HITO.REVOCADO,revocado_en:ahora(),revocado_por:CU.id,motivo_revocacion:String(motivo).trim()});
    try{IANNA_MOTOR.auditar('comisiones',aid,'REVOCAR_HITO_COMISION',{hito:hitoId,estado:'CUMPLIDO'},{hito:hitoId,estado:'REVOCADO'},motivo);}catch(e){}
    return {ok:true,hito:h};
  }
  function activarVenta(ap,opts){
    const prep=prepararVenta(ap,opts); if(!prep.ok)return prep;
    const firma=prep.snapshot.hitos.find(h=>h.evento==='contrato_firmado'||h.automatico);
    if(firma) cumplirHito(ap.id,firma.id,{sistema:true,usuario:opts?.usuario||CU?.id||'system',fecha:ap.fecha_firma_contrato||ahora(),nota:'Cumplido automáticamente al confirmar la firma y registrar la Venta'});
    return resumen(ap.id);
  }
  function lineasOperacion(aid){return comisionesNominaService.lineas({operacion_id:aid});}
  function resumen(aid){
    const ap=apartadosService.obtener(aid); if(!ap)return {ok:false,error:'Venta inexistente'};
    const prep=prepararVenta(ap); if(!prep.ok)return prep;
    const lineas=lineasOperacion(aid), total=xs=>xs.reduce((s,x)=>s+Number(x.monto||0),0);
    return {ok:true,ap,snapshot:apartadosService.obtener(aid).comision_snapshot,lineas,
      totales:{generado:total(lineas.filter(x=>x.estado!==ESTADOS_LINEA.CANCELADA)),pendiente_hito:total(lineas.filter(x=>x.estado===ESTADOS_LINEA.PENDIENTE)),elegible:total(lineas.filter(x=>x.estado===ESTADOS_LINEA.ELEGIBLE)),en_corte:total(lineas.filter(x=>x.estado===ESTADOS_LINEA.EN_CORTE)),pagado:total(lineas.filter(x=>x.estado===ESTADOS_LINEA.PAGADA))}};
  }

  function crearCorte(ids,datos){
    const auth=AUTORIZADOR.autorizar('gestionar_nomina_comisiones',{registroId:'nuevo-corte'}); if(!auth.ok)return auth;
    const elegibles=(ids||[]).map(id=>comisionesNominaService.obtenerLinea(id)).filter(x=>x&&x.estado===ESTADOS_LINEA.ELEGIBLE);
    if(!elegibles.length)return {ok:false,error:'Selecciona al menos una comisión elegible'};
    const corte=comisionesNominaService.crearCorte({
      id_publico:IANNA_IDS.asignar('corte_comision'),estado:'borrador',fecha:ahora(),
      periodo_inicio:datos?.periodo_inicio||'',periodo_fin:datos?.periodo_fin||'',nota:datos?.nota||'',
      lineas:elegibles.map(x=>x.id),total:elegibles.reduce((s,x)=>s+Number(x.monto||0),0),creado_por:CU.id
    });
    elegibles.forEach(x=>comisionesNominaService.actualizarLinea(x.id,{estado:ESTADOS_LINEA.EN_CORTE,corte_id:corte.id,fecha_corte:ahora()}));
    return {ok:true,corte};
  }
  function pagarCorte(id,datos){
    const auth=AUTORIZADOR.autorizar('pagar_nomina_comisiones',{registroId:id}); if(!auth.ok)return auth;
    const c=comisionesNominaService.obtenerCorte(id); if(!c)return {ok:false,error:'Corte inexistente'};
    if(c.estado==='pagado')return {ok:true,yaPagado:true,corte:c};
    const fecha=datos?.fecha||ahora();
    comisionesNominaService.actualizarCorte(id,{estado:'pagado',fecha_pago:fecha,metodo_pago:datos?.metodo||'Transferencia electrónica',referencia:datos?.referencia||'',comprobante:datos?.comprobante||'',pagado_por:CU.id});
    (c.lineas||[]).forEach(lid=>{const l=comisionesNominaService.obtenerLinea(lid);if(l&&l.estado===ESTADOS_LINEA.EN_CORTE)comisionesNominaService.actualizarLinea(lid,{estado:ESTADOS_LINEA.PAGADA,fecha_pago:fecha,pagado_por:CU.id});});
    return {ok:true,corte:comisionesNominaService.obtenerCorte(id)};
  }
  function cancelarCorte(id,motivo){
    const auth=AUTORIZADOR.autorizar('gestionar_nomina_comisiones',{registroId:id}); if(!auth.ok)return auth;
    const c=comisionesNominaService.obtenerCorte(id); if(!c)return {ok:false,error:'Corte inexistente'};
    if(c.estado==='pagado')return {ok:false,error:'Un corte pagado requiere un ajuste compensatorio; no puede cancelarse directamente'};
    (c.lineas||[]).forEach(lid=>{const l=comisionesNominaService.obtenerLinea(lid);if(l&&l.estado===ESTADOS_LINEA.EN_CORTE)comisionesNominaService.actualizarLinea(lid,{estado:ESTADOS_LINEA.ELEGIBLE,corte_id:null,fecha_corte:null});});
    comisionesNominaService.actualizarCorte(id,{estado:'cancelado',cancelado_en:ahora(),cancelado_por:CU.id,motivo_cancelacion:String(motivo||'').trim()});
    return {ok:true};
  }

  return {ESTADOS_LINEA,ESTADOS_HITO,eventoCanonico,construirSnapshot,prepararVenta,activarVenta,cumplirHito,revocarHito,lineasOperacion,resumen,crearCorte,pagarCorte,cancelarCorte};
})();
