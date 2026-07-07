/* ════════════════════════════════════════════════════════════════
   IANNA CRM — business/pipeline.business.js
   PIPELINE COMERCIAL — FLUJO ÚNICO DE ESTATUS DE PROSPECTO
   (Fase 1.95 · Etapa 2)
   ────────────────────────────────────────────────────────────────
   Única ruta autorizada para cambiar el estatus CRM de un Prospecto.
   Kanban, Ficha, edición e importación SOLICITAN aquí; nadie escribe
   estatus directamente.

   Reglas fundacionales (DOMAIN_MODEL — Persona ↔ Operación):
   · 'Apartado' y 'Venta' NO son estatus asignables: son estados
     DERIVADOS de una Operación real. Se obtienen ejecutando la
     operación formal (crear apartado / contrato firmado), nunca
     escribiendo el campo.
   · Una Persona cuyo estatus es 'Venta' no "retrocede" arrastrando
     una tarjeta: su Operación se cancela formalmente, o se abre una
     NUEVA Oportunidad para una nueva compra (el historial se conserva).
   ════════════════════════════════════════════════════════════════ */
window.IANNA_PIPELINE = (function(){

  function _crm(){ return (typeof ESTATUS_CRM!=='undefined') ? ESTATUS_CRM : ['Nuevo','Contactado','Cita agendada','Visitó desarrollo','Seguimiento']; }
  function _operacion(){ return (typeof ESTATUS_OPERACION!=='undefined') ? ESTATUS_OPERACION : ['Apartado','Venta']; }
  function _inactivos(){ return (typeof ESTATUS_INACTIVOS!=='undefined') ? ESTATUS_INACTIVOS : []; }

  function esOperacional(est){ return _operacion().includes(est); }
  function esValidoCRM(est){ return _crm().includes(est) || _inactivos().includes(est); }

  /* ── ÚNICA RUTA DE CAMBIO DE ESTATUS ─────────────────────────── */
  function solicitarEstatus(pid, nuevoEst, origen){
    const p = prospectosService.obtener(pid);
    if(!p) return { ok:false, error:'Prospecto no encontrado.' };
    const anterior = p.estatus;
    if(anterior === nuevoEst) return { ok:true, sinCambio:true, anterior, nuevo:nuevoEst };

    // 1) El destino no puede ser un estado operacional: eso lo produce una Operación.
    if(esOperacional(nuevoEst)){
      return { ok:false, requiereOperacion:nuevoEst, error:
        nuevoEst==='Apartado'
          ? 'El estatus "Apartado" resulta de crear un apartado formal (⚙ Operaciones → Nuevo apartado), no de un cambio manual.'
          : 'El estatus "Venta" resulta de la operación "Contrato firmado" sobre un apartado. La Máquina de Estados no permite fabricar una venta moviendo una tarjeta.' };
    }
    // 2) El origen operacional no se abandona manualmente: la Operación manda.
    if(esOperacional(anterior)){
      return { ok:false, protegidoPorOperacion:true, error:
        anterior==='Venta'
          ? 'Una venta concluida no puede retroceder desde el pipeline. Para revertirla usa ⚙ Operaciones → Cancelar venta; para una nueva compra del mismo cliente se abre una NUEVA Oportunidad conservando el historial.'
          : 'Este prospecto tiene un apartado activo: su estatus lo gobierna la Operación. Usa ⚙ Operaciones (p. ej. Cancelar apartado) para modificarlo.' };
    }
    // 3) Solo estatus CRM (o inactivos) reconocidos.
    if(!esValidoCRM(nuevoEst)) return { ok:false, error:`Estatus no reconocido: "${nuevoEst}".` };

    // 4) Ejecutar: escritura única + traza + sincronización de la Oportunidad.
    prospectosService.actualizar(pid, { estatus:nuevoEst });
    seguimientosService.crear({ prospectoId:pid, tipo:'Nota interna',
      nota:`${origen||'Pipeline'}: ${anterior} → ${nuevoEst}`,
      fecha:new Date().toISOString(), usuario:(typeof CU!=='undefined'&&CU)?CU.id:null, estatusCambio:nuevoEst });
    try{ IANNA_MOTOR.auditar('prospectos', pid, 'CAMBIO_ESTATUS', {estatus:anterior}, {estatus:nuevoEst, origen:origen||'Pipeline'}, 'Cambio de estatus vía Pipeline Comercial (flujo único)'); }catch(e){}

    const resultado = { ok:true, anterior, nuevo:nuevoEst };
    try{
      const s = IANNA_OPO.sincronizarDesdeProspecto(pid, nuevoEst);
      if(s && s.ok===false) resultado.advertencia = 'Oportunidad: '+s.error;
    }catch(e){ console.error('[PIPELINE] sincronizar Oportunidad', e); resultado.advertencia='La Oportunidad no pudo sincronizarse: '+e.message; }
    return resultado;
  }

  /* ── DERIVACIÓN OPERACIONAL ─────────────────────────────────────
     La ÚNICA vía por la que un estatus se deriva de una Operación real
     (crear apartado → 'Apartado', contrato firmado → 'Venta',
     cancelación → regreso a un estatus CRM). La invocan exclusivamente
     los ejecutores del Motor de Operaciones; jamás un gesto de UI. */
  function derivarEstatusOperacional(pid, nuevoEst, ctx){
    const p = prospectosService.obtener(pid);
    if(!p) return { ok:false, error:'Prospecto no encontrado.' };
    const anterior = p.estatus;
    if(anterior===nuevoEst) return { ok:true, sinCambio:true };
    prospectosService.actualizar(pid, { estatus:nuevoEst });
    seguimientosService.crear({ prospectoId:pid, tipo:'Nota interna',
      nota:`Operación${ctx&&ctx.operacion?' '+ctx.operacion:''}: ${anterior} → ${nuevoEst}`,
      fecha:new Date().toISOString(), usuario:(typeof CU!=='undefined'&&CU)?CU.id:null, estatusCambio:nuevoEst });
    try{ IANNA_MOTOR.auditar('prospectos', pid, 'ESTATUS_DERIVADO_OPERACION', {estatus:anterior}, {estatus:nuevoEst, operacionId:(ctx&&ctx.operacionId)||null, operacion:(ctx&&ctx.operacion)||null}, 'Estatus derivado de una Operación real (Motor de Operaciones)'); }catch(e){}
    try{ IANNA_OPO.sincronizarDesdeProspecto(pid, nuevoEst); }catch(e){ console.error('[PIPELINE] sincronizar Oportunidad', e); }
    return { ok:true, anterior, nuevo:nuevoEst };
  }

  /* Nueva Oportunidad para un Cliente con operación previa cerrada
     (Bloque 3: nueva compra conserva el historial anterior). */
  function nuevaOportunidad(pid, motivo){
    try{
      const o = IANNA_OPO.crear({ personaId:pid, origen:'Pipeline', nota:motivo||'Nueva intención de compra (cliente existente)' });
      try{ IANNA_MOTOR.auditar('oportunidades', (o&&o.id)||pid, 'NUEVA_OPORTUNIDAD', {}, {personaId:pid}, motivo||'Nueva Oportunidad para cliente con operación previa'); }catch(e){}
      return { ok:true, oportunidad:o };
    }catch(e){ return { ok:false, error:e.message }; }
  }

  return { solicitarEstatus, derivarEstatusOperacional, nuevaOportunidad, esOperacional, esValidoCRM };
})();
