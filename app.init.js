/* ════════════════════════════════════════════════════════════════
   IANNA CRM — app.init.js
   Inicialización de la aplicación (bindings de login).
   Fase 1 (refactor): código movido intacto desde el archivo original.
   Fase 1.8: migración inicial de IDs permanentes (una sola vez).
   ════════════════════════════════════════════════════════════════ */

// Migración inicial de identificadores permanentes (Fase 1.8) — corre una sola vez.
try{ DS.aplicarBootstrapLimpio196(); }catch(e){ console.error('Bootstrap limpio 1.96',e); }
try{ if(typeof IANNA_IDS!=='undefined'){ IANNA_IDS.migrar(); if(IANNA_IDS.migrar196) IANNA_IDS.migrar196(); } }catch(e){ console.error('Migración IDs',e); }
// ── Fase 1.95: puerta única de datos y ledger como única fuente de saldo ──
try{ DS.migrarLlavesLegadas(); }catch(e){ console.error('Migración llaves',e); }
try{ if(typeof IANNA_FIN!=='undefined') IANNA_FIN.reconciliarHistorico(); }catch(e){ console.error('Reconciliación ledger',e); }
try{ if(typeof IANNA_MIG_196!=='undefined') IANNA_MIG_196.run(); }catch(e){ console.error('Migración 1.96',e); }

// ── BIND LOGIN EVENTS (safe: all functions already defined above) ──
document.addEventListener('DOMContentLoaded', function() {
  var btnLogin = document.getElementById('btn-login-submit');
  if(btnLogin) btnLogin.addEventListener('click', function(){ doLogin(); });
  var passInput = document.getElementById('li-pass');
  if(passInput) passInput.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
});
// Fallback: also bind immediately in case DOMContentLoaded already fired
(function(){
  var btnLogin = document.getElementById('btn-login-submit');
  if(btnLogin) btnLogin.addEventListener('click', function(){ doLogin(); });
})();


try{ if(typeof IANNA_MIG_197!=='undefined') IANNA_MIG_197.run(); }catch(e){ console.error('[1.97] migración',e); }

try{ if(typeof IANNA_MIG_1971!=='undefined') IANNA_MIG_1971.run(); }catch(e){ console.error('[1.97.1] migración',e); }

try{ if(typeof IANNA_MIG_1972!=='undefined') IANNA_MIG_1972.run(); }catch(e){ console.error('[1.97.2] migración',e); }

try{ if(typeof IANNA_MIG_1973!=='undefined') IANNA_MIG_1973.run(); }catch(e){ console.error('[1.97.3] migración',e); }

try{ if(typeof IANNA_MIG_1974!=='undefined') IANNA_MIG_1974.run(); }catch(e){ console.error('[1.97.4] migración',e); }

try{ if(typeof IANNA_MIG_1975!=='undefined') IANNA_MIG_1975.run(); }catch(e){ console.error('[1.97.5] migración',e); }
try{ if(typeof IANNA_MIG_1976!=='undefined') IANNA_MIG_1976.run(); }catch(e){ console.error('[1.97.6] migración',e); }
