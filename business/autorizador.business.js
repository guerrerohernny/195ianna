/* ════════════════════════════════════════════════════════════════
   IANNA CRM — business/autorizador.business.js
   MOTOR AUTORIZADOR (Fase 1.95 · Etapa 3)
   ────────────────────────────────────────────────────────────────
   Única autoridad de autorización del sistema. Reemplaza todas las
   comparaciones dispersas de rol (rol==='gerente'…) por acciones
   semánticas trazables. Fail-closed: acción desconocida = denegada.

   Diseño forward-compatible (Fase 2): puede(accion, ctx) acepta un
   contexto opcional {empresaId, proyectoId} que hoy se ignora y en
   Fase 2 activará el scope multiempresa sin reescribir llamadas.
   ════════════════════════════════════════════════════════════════ */
window.AUTORIZADOR = (function(){

  const POLITICA_VERSION = 'AUT-v1';

  /* Reglas: acción semántica → roles autorizados.
     Los nombres describen QUÉ se autoriza, no QUIÉN. */
  const REGLAS = {
    // Alcance de datos: ver información de todo el equipo (no solo la propia)
    ver_global:              ['gerente','administrador'],
    // Capturar/asignar registros a nombre de otros asesores
    capturar_para_otros:     ['gerente','administrador'],
    // Eliminar/inactivar expedientes de prospectos
    eliminar_prospecto:      ['gerente','administrador'],
    // Gestión de inventario (alta/edición de lotes)
    gestionar_inventario:    ['gerente','administrador'],
    // Ajustar la fecha de un apartado ya registrado
    // (semántica heredada exacta de Fase 1.9: SOLO gerente — documentado en RELEASE_1_95)
    ajustar_fecha_apartado:  ['gerente'],
    // Ver panel/valores de comisiones del equipo completo
    ver_comisiones_equipo:   ['gerente','administrador'],
    // Cancelaciones formales de apartado/venta
    cancelar_operacion:      ['gerente','administrador'],
    // Corrección administrativa sobre venta cerrada (desbloqueo)
    correccion_administrativa:['gerente','administrador'],
    // Gestión de usuarios del sistema
    gestionar_usuarios:      ['administrador'],
    // Edición de parámetros y política comercial
    editar_parametros:       ['gerente','administrador'],
    // Validación documental: convierte borrador en paquete definitivo para firma
    validar_contrato:         ['gerente','administrador'],
    // Confirmar firma o cancelar paquete validado
    confirmar_firma:          ['gerente','administrador'],
    // Cumplimiento de hitos y cortes de comisión
    marcar_hito_comision:      ['gerente','administrador'],
    gestionar_nomina_comisiones:['gerente','administrador'],
    pagar_nomina_comisiones:   ['gerente','administrador'],
  };

  const ETIQUETAS = { administrador:'Administrador', gerente:'Gerente de Ventas', asesor:'Asesor Comercial' };

  function _rol(){ return (typeof CU!=='undefined' && CU) ? CU.rol : null; }

  /* ¿El usuario actual puede ejecutar la acción? (consulta pura, no audita) */
  function puede(accion, ctx){
    const roles = REGLAS[accion];
    if(!roles){ console.warn('[AUTORIZADOR] Acción no registrada (denegada por diseño):', accion); return false; }
    const r=_rol();
    return !!r && roles.includes(r);
    /* ctx reservado para Fase 2 (empresa/proyecto) */
  }

  /* Explicación humana de la regla aplicable a una acción */
  function justificacion(accion){
    const roles = REGLAS[accion];
    if(!roles) return `La acción "${accion}" no está registrada en la política de autorización (${POLITICA_VERSION}); por diseño se deniega.`;
    return `La acción "${accion}" está permitida para: ${roles.map(x=>ETIQUETAS[x]||x).join(', ')} (política ${POLITICA_VERSION}). Tu rol actual: ${ETIQUETAS[_rol()]||_rol()||'sin sesión'}.`;
  }

  /* Autorización con traza: audita denegaciones y permisos sensibles */
  const SENSIBLES = ['validar_contrato','confirmar_firma','eliminar_prospecto','cancelar_operacion','correccion_administrativa','gestionar_usuarios','editar_parametros','ajustar_fecha_apartado','marcar_hito_comision','gestionar_nomina_comisiones','pagar_nomina_comisiones'];
  function autorizar(accion, ctx){
    const ok = puede(accion, ctx);
    const detalle = { accion, rol:_rol(), politica:POLITICA_VERSION, contexto:ctx||null };
    try{
      if(!ok){
        IANNA_MOTOR.auditar('autorizacion', (ctx&&ctx.registroId)||accion, 'AUTORIZACION_DENEGADA', {}, detalle, justificacion(accion));
      } else if(SENSIBLES.includes(accion)){
        IANNA_MOTOR.auditar('autorizacion', (ctx&&ctx.registroId)||accion, 'AUTORIZACION_CONCEDIDA', {}, detalle, `Permiso sensible concedido (${POLITICA_VERSION})`);
      }
    }catch(e){ console.error('[AUTORIZADOR] auditoría', e); }
    if(!ok && typeof toast==='function') toast('No tienes permiso para esta acción. '+justificacion(accion),'err');
    return { ok, justificacion: justificacion(accion), politica: POLITICA_VERSION };
  }

  function politicaAplicada(){ return POLITICA_VERSION; }
  function etiquetaRol(rol){ return ETIQUETAS[rol||_rol()] || (rol||_rol()) || '—'; }

  return { puede, autorizar, justificacion, politicaAplicada, etiquetaRol, _REGLAS:REGLAS };
})();
