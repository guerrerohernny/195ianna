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
  // 1.97.5: MainViewport es la única superficie desplazable. Restaurar DESPUÉS del render.
  const viewport=document.getElementById('main-viewport')||document.querySelector('.main');
  const reset=()=>{ if(viewport){viewport.scrollTop=0;viewport.scrollLeft=0;} if(pg){pg.scrollTop=0;pg.scrollLeft=0;} };
  reset(); requestAnimationFrame(reset); setTimeout(reset,0);
  if(window.innerWidth<768) $('sidebar').classList.remove('open');
}

