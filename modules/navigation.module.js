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
  // 1.97.5.1: el documento vuelve a ser la superficie principal de scroll.
  // Reiniciar después del render sin alterar la navegación lateral.
  const reset=()=>{
    try{ window.scrollTo({top:0,left:0,behavior:'auto'}); }catch(e){ window.scrollTo(0,0); }
    try{ document.documentElement.scrollTop=0; document.body.scrollTop=0; }catch(e){}
    try{ if(pg){pg.scrollTop=0;pg.scrollLeft=0;} }catch(e){}
  };
  reset(); requestAnimationFrame(reset); setTimeout(reset,0);
  if(window.innerWidth<768) $('sidebar').classList.remove('open');
}

