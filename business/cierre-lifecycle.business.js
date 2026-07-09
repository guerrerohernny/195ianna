/* IANNA CRM — Fase 1.97 · Ciclo de vida documental del cierre */
window.IANNA_CIERRE = (function(){
  const ESTADOS={ PREPARACION:'PREPARACION', BORRADOR:'BORRADOR', CORRECCION:'CORRECCION', VALIDADO:'VALIDADO_PENDIENTE_FIRMA', FIRMADO:'FIRMADO', CANCELADO:'PAQUETE_CANCELADO' };
  function obtener(aid){ return apartadosService.obtener(aid); }
  function estado(ap){ return ap?.cierre_estado||ESTADOS.PREPARACION; }
  function puedeEditar(ap){ return [ESTADOS.PREPARACION,ESTADOS.BORRADOR,ESTADOS.CORRECCION].includes(estado(ap)); }
  function guardarBorrador(aid,datos){
    const ap=obtener(aid); if(!ap) return {ok:false,error:'Apartado inexistente'};
    if(!puedeEditar(ap)) return {ok:false,error:'El cierre está validado y congelado'};
    apartadosService.actualizar(aid,{...datos,cierre_estado:ESTADOS.BORRADOR,borrador_generado_en:new Date().toISOString(),borrador_por:CU?.id||'system'});
    return {ok:true,estado:ESTADOS.BORRADOR};
  }
  function regresarCorreccion(aid,motivo){
    const auth=AUTORIZADOR.autorizar('validar_contrato',{registroId:aid}); if(!auth.ok)return auth;
    if(!String(motivo||'').trim()) return {ok:false,error:'El motivo de corrección es obligatorio'};
    apartadosService.actualizar(aid,{cierre_estado:ESTADOS.CORRECCION,correccion_motivo:String(motivo).trim(),correccion_fecha:new Date().toISOString(),correccion_por:CU.id});
    return {ok:true,estado:ESTADOS.CORRECCION};
  }
  function emitirPagares(ap,pagares){
    if(ap.pagares_congelados?.length) return ap.pagares_congelados;
    return (pagares||[]).map((p,i)=>({
      n:p.n||i+1,total:(pagares||[]).length,fecha:p.fecha instanceof Date?p.fecha.toISOString():p.fecha,monto:Number(p.monto||0),
      folio:IANNA_FOLIOS.emitirUnaVez('pagare',`${ap.id}:PAGARE:${i+1}`), id_publico:IANNA_IDS.asignar('recibo'), estado_documental:'EMITIDO_PENDIENTE_FIRMA'
    }));
  }
  function emitirReciboAdicional(ap,monto,metodo){
    if(Number(monto||0)<=0) return null;
    if(ap.recibo_pago_adicional_pendiente) return ap.recibo_pago_adicional_pendiente;
    return { folio:IANNA_FOLIOS.emitirUnaVez('recibo_pago_adicional',`PAGO-ADICIONAL:${ap.id}`), id_publico:IANNA_IDS.asignar('recibo'), monto:Number(monto), metodo:metodo||'Transferencia electrónica', estado:'EMITIDO_PENDIENTE_CONFIRMACION' };
  }
  function validar(aid,ctx){
    const auth=AUTORIZADOR.autorizar('validar_contrato',{registroId:aid}); if(!auth.ok)return auth;
    const ap=obtener(aid); if(!ap) return {ok:false,error:'Apartado inexistente'};
    if(![ESTADOS.BORRADOR,ESTADOS.CORRECCION].includes(estado(ap))) return {ok:false,error:'Primero genera un borrador'};
    const pags=emitirPagares(ap,ctx.pagares||[]);
    const rec=emitirReciboAdicional(ap,ctx.pago_adicional,ctx.forma_pago_adicional);
    const ahora=new Date().toISOString();
    apartadosService.actualizar(aid,{
      cierre_estado:ESTADOS.VALIDADO, validado_en:ahora, validado_por:CU.id,
      doc_snapshot:ctx.doc_snapshot, financial_snapshot:ctx.financial_snapshot, datos_cierre:ctx.datos_cierre,
      politica_snapshot:ctx.politica_snapshot||IANNA_COM.snapshotDePolitica(ap), pagares_congelados:pags,
      recibo_pago_adicional_pendiente:rec, cierre_generado:true
    });
    return {ok:true,estado:ESTADOS.VALIDADO,pagares:pags,recibo:rec};
  }
  function confirmarPagoAdicional(aid){
    const ap=obtener(aid); const rec=ap?.recibo_pago_adicional_pendiente;
    if(!rec||rec.estado==='CONFIRMADO') return {ok:true,yaConfirmado:true};
    const r=IANNA_FIN.ajustarIngresoDocumentado({operacionId:ap.id,personaId:ap.prospectoId,monto:rec.monto,metodo:rec.metodo,documento:IANNA_FMT.FOLIO(rec.folio),concepto:'Pago adicional',politica_version:(ap.politica_snapshot||{}).version||IANNA_COM.politicaActual().version,motivo:'Pago adicional confirmado al firmar contrato'});
    rec.estado='CONFIRMADO'; rec.confirmado_en=new Date().toISOString(); rec.confirmado_por=CU.id;
    apartadosService.actualizar(aid,{recibo_pago_adicional_pendiente:rec,recibo_pago_adicional:rec.folio});
    return {ok:true,movimiento:r.movimiento,recibo:rec};
  }
  function confirmarFirma(aid){
    const auth=AUTORIZADOR.autorizar('confirmar_firma',{registroId:aid}); if(!auth.ok)return auth;
    const ap=obtener(aid); if(!ap)return {ok:false,error:'Apartado inexistente'};
    if(estado(ap)!==ESTADOS.VALIDADO)return {ok:false,error:'El contrato debe estar validado antes de confirmar firma'};
    confirmarPagoAdicional(aid);
    apartadosService.actualizar(aid,{cierre_estado:ESTADOS.FIRMADO,firma_confirmada_en:new Date().toISOString(),firma_confirmada_por:CU.id});
    return {ok:true,estado:ESTADOS.FIRMADO};
  }
  function cancelarPaquete(aid,motivo){
    const auth=AUTORIZADOR.autorizar('validar_contrato',{registroId:aid}); if(!auth.ok)return auth;
    const ap=obtener(aid); if(!ap)return {ok:false,error:'Apartado inexistente'};
    if(estado(ap)!==ESTADOS.VALIDADO)return {ok:false,error:'Solo puede cancelarse un paquete validado pendiente de firma'};
    const pagares=(ap.pagares_congelados||[]).map(p=>({...p,estado_documental:'CANCELADO',cancelado_en:new Date().toISOString(),cancelado_por:CU.id,motivo_cancelacion:motivo||'No se concretó la firma'}));
    const rec=ap.recibo_pago_adicional_pendiente?{...ap.recibo_pago_adicional_pendiente,estado:'CANCELADO',cancelado_en:new Date().toISOString(),motivo_cancelacion:motivo||'No se concretó la firma'}:null;
    apartadosService.actualizar(aid,{cierre_estado:ESTADOS.CANCELADO,pagares_congelados:pagares,recibo_pago_adicional_pendiente:rec,paquete_cancelado_motivo:motivo||'',paquete_cancelado_en:new Date().toISOString()});
    return {ok:true,estado:ESTADOS.CANCELADO};
  }
  return {ESTADOS,estado,puedeEditar,guardarBorrador,regresarCorreccion,validar,confirmarFirma,cancelarPaquete,confirmarPagoAdicional};
})();
