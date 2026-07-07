/* ════════════════════════════════════════════════════════════════
   IANNA CRM — services/entidades.service.js
   CAPA DE SERVICIOS DE DATOS (Fase 1.95 · Etapa 1)
   ────────────────────────────────────────────────────────────────
   ÚNICA puerta de datos para los módulos. Ningún módulo llama
   DS.create/update/delete directamente (guard de CI lo verifica).
   Cambiar el backend (localStorage → Supabase, Fase 3) será
   transparente: solo esta capa y DS conocen la persistencia.
   ════════════════════════════════════════════════════════════════ */

window.prospectosService = {
  listar: (f) => DS.find('prospectos', f),
  obtener: (id) => DS.findOne('prospectos', id),
  crear: (d) => DS.create('prospectos', d),
  actualizar: (id, d) => DS.update('prospectos', id, d),
  eliminar: (id) => DS.delete('prospectos', id),
  /* Alcance por permiso: todo el equipo o solo los propios */
  visibles: () => (typeof AUTORIZADOR!=='undefined' && AUTORIZADOR.puede('ver_global'))
    ? DS.find('prospectos') : DS.find('prospectos', { asesor: (typeof CU!=='undefined'&&CU)?CU.id:'' }),
};

window.seguimientosService = {
  listar: (f) => DS.find('seguimientos', f),
  dePrspecto: (pid) => DS.find('seguimientos', { prospectoId: pid }),
  deProspecto: (pid) => DS.find('seguimientos', { prospectoId: pid }),
  crear: (d) => DS.create('seguimientos', d),
};

window.recordatoriosService = {
  listar: (f) => DS.find('recordatorios', f),
  crear: (d) => DS.create('recordatorios', d),
  actualizar: (id, d) => DS.update('recordatorios', id, d),
};

window.apartadosService = {
  listar: (f) => DS.find('apartados', f),
  obtener: (id) => DS.findOne('apartados', id),
  crear: (d) => DS.create('apartados', d),
  actualizar: (id, d) => DS.update('apartados', id, d),
  ventas: () => DS.find('apartados').filter(a => a.estatus === 'Venta'),
  activos: () => DS.find('apartados').filter(a => a.estatus === 'Activo'),
};

window.inventarioService = {
  listar: () => DS.db.inventario,
  obtener: (clave) => getLote(clave),
  vendibles: () => DS.db.inventario.filter(l => !['Apartado','Vendido','Casa Muestra','Subdividido'].includes(l.estado)),
  /* 1.95: los módulos ya no mutan DS.db.inventario — toda escritura pasa por aquí */
  actualizarPorClave: (clave, patch) => {
    const i = DS.db.inventario.findIndex(l => l.clave === String(clave));
    if (i < 0) return null;
    DS.db.inventario[i] = { ...DS.db.inventario[i], ...patch };
    DS._save(DS.db);
    return DS.db.inventario[i];
  },
  crear: (lote) => { DS.db.inventario.push(lote); DS._save(DS.db); return lote; },
  eliminarPorClave: (clave) => { DS.db.inventario = DS.db.inventario.filter(l => l.clave !== String(clave)); DS._save(DS.db); },
};

window.modelosService = {
  listar: () => DS.getModelos(),
  guardar: (mods) => { DS.db.modelos = mods; DS._save(DS.db); return mods; },
};

window.usuariosService = {
  listar: (f) => DS.find('usuarios', f),
  obtener: (id) => getUser(id),
  asesores: () => DS.find('usuarios', { rol: 'asesor', activo: true }),
  crear: (d) => DS.create('usuarios', d),
  actualizar: (id, d) => DS.update('usuarios', id, d),
  eliminar: (id) => DS.delete('usuarios', id),
};

window.brokersService = {
  listar: (f) => DS.find('brokers', f),
  obtener: (id) => DS.findOne('brokers', id),
  crear: (d) => DS.create('brokers', d),
  actualizar: (id, d) => DS.update('brokers', id, d),
};

window.cotizacionesService = {
  listar: (f) => DS.find('cotizaciones', f),
  crear: (d) => DS.create('cotizaciones', d),
};

window.conversacionesService = {
  listar: (f) => DS.find('conversaciones', f),
  crear: (d) => DS.create('conversaciones', d),
  actualizar: (id, d) => DS.update('conversaciones', id, d),
};

window.pagosService = {
  deApartado: (apId) => (DS.findOne('apartados', apId)?.pagos) || [],
  /* Los MONTOS/saldos se leen del Motor Financiero (ledger), no de aquí (Etapa 4). */
};

window.parametrosService = {
  obtener: () => getP(),
  guardar: (p) => DS.saveParams(p),
};

/* Configuración extendida (integraciones): absorbe las llaves que
   antes vivían sueltas en localStorage (va_wa_config, va_sb_*). */
window.configService = {
  obtenerExt: (clave, def) => DS.getExt(clave, def),
  guardarExt: (clave, val) => DS.setExt(clave, val),
};
