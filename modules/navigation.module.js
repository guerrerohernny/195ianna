/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/navigation.module.js
   Navegación entre módulos (router simple).
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
function navTo(page,el){
  $$('.page').forEach(p=>p.classList.remove('active'));
  $$('.nav-i').forEach(n=>n.classList.remove('active'));
  const pg=$('page-'+page); if(pg) pg.classList.add('active');
  if(el) el.classList.add('active');
  const T={dashboard:'Dashboard',prospectos:'Prospectos',inventario:'Inventario',apartados:'Apartados',ingresos:'Mis Ingresos',reportes:'Reportes',parametros:'Parámetros',perfil:'Mi Perfil',configuracion:'Configuración',brokers:'Mis Brokers',auditoria:'Auditoría','control-operaciones':'Control de Operaciones',cotizador:'Cotizador',whatsapp:'WhatsApp CRM'};
  $('tb-t').textContent=T[page]||page;
  const R={dashboard:renderDashboard,prospectos:renderProspectos,inventario:renderInventario,apartados:renderApartados,ingresos:renderIngresos,reportes:renderReportes,parametros:renderParametros,perfil:renderPerfil,configuracion:renderConfiguracion,brokers:renderBrokers,auditoria:renderAuditoria,'control-operaciones':renderControlOperaciones,cotizador:renderCotizador,whatsapp:renderWhatsApp};
  if(R[page]) R[page]();
  // 1.97.3: al cambiar de módulo reiniciar scroll para evitar módulos aparentemente vacíos/corridos.
  try{ window.scrollTo({top:0,left:0,behavior:'instant'}); }catch(e){ try{window.scrollTo(0,0);}catch(_){} }
  try{ document.querySelector('.main')?.scrollTo?.(0,0); }catch(e){}
  try{ document.querySelector('.sb-nav')?.scrollTo?.(0,0); }catch(e){}
  if(window.innerWidth<768) $('sidebar').classList.remove('open');
}

