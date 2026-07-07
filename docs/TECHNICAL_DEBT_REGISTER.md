# IANNA CRM — TECHNICAL DEBT REGISTER

**Prefase 1.95.** Registro completo de deuda técnica detectada por auditoría de código. Cada ítem con evidencia `archivo:línea`. Prioridad: P0 (bloqueante para cerrar Fase 1) · P1 (alta) · P2 (media/baja).

| Prioridad | Área | Descripción | Evidencia | Impacto | Riesgo | Fase recomendada |
|---|---|---|---|---|---|---|
| P0 | Integridad de datos | `'Venta'`/`'Apartado'` son estatus asignables de Prospecto; se fijan por escritura directa | `badges.components.js:8`; `prospectos.module.js:100,234`; `importar.module.js:66` | Ventas fantasma sin Operación/ledger/comisión; mezcla Persona↔Operación | Muy alto | 1.95 · Etapa 2 |
| P0 | Persistencia | 274 escrituras directas `DS.*` en 19 módulos; 0 uso de `*Service` | 19 módulos (ver MIGRATION_MATRIX) | Reglas del motor evadibles; base para todo lo demás | Muy alto | 1.95 · Etapa 1 |
| P0 | Máquina de estados | Kanban y ficha cambian estado sin la máquina; sync de Oportunidad best-effort `try/catch` | `prospectos.module.js:127`; llamada a `IANNA_OPO` en `try/catch` | Estados divergentes entre pipeline y ficha | Alto | 1.95 · Etapa 2 |
| P0 | Comisiones | Fórmula heredada en 2 módulos (no usa `IANNA_COM` ni snapshot) | `ingresos.module.js:29-52`; `dashboard.module.js:99` | Cifras dobles al versionar política | Alto | 1.95 · Etapa 4 |
| P0 | Financiero (SSoT) | Saldo leído de `ap.pagos[]` en vez del ledger; doble escritura | `cobranza.module.js:12,14,79,94` | Saldo mostrado ≠ verdad del ledger | Alto | 1.95 · Etapa 4 |
| P0 | Documentos/Folios | Pagarés imprimen el folio de carátula, no el congelado por pagaré | `documentos.module.js:681` vs `apartados.module.js:431` | Folio fiscal incorrecto en documento legal | Alto | 1.95 · Etapa 5 |
| P0 | Autorización | 57 comparaciones `rol==` dispersas; sin trazabilidad | ~12 módulos + `auth.module.js` | Autorización no auditable; frágil ante nuevos roles | Alto | 1.95 · Etapa 3 |
| P1 | Layering | `business/` invoca UI de módulos; función de modal dentro de business | `ops-engine.business.js:30-35,158-162`; `cancelaciones.business.js:9,96` | Acoplamiento circular UI↔business; difícil de probar | Medio | 1.95 · Etapa 2/3 |
| P1 | Formatos | `mxn()` legado de uso masivo, paralelo a `IANNA_FMT.MXN` | `utils/utils.js:14` (+ usos en documentos, cobranza…) | Formato inconsistente | Medio | 1.95 · Etapa 5 |
| P1 | Formatos | Formateo manual disperso (`toLocaleString`/`toFixed(2)`/`'$'+`) | `auditoria`, `apartados`×2, `parametros`×2, `cierre`, `prospectos` | Inconsistencia de presentación | Bajo | 1.95 · Etapa 5 |
| P1 | Inventario | Protección de lote activo existe en `IANNA_MOTOR` pero no demostrada en las 57 rutas de escritura | `motor.business.js` (guard) vs `inventario.module.js` | Posible edición directa de lote Vendido/Apartado | Medio | 1.95 · Etapa 1/2 |
| P1 | Reimpresión | `imprimirPagares` asume `p.fecha` como `Date`; truena al reimprimir desde snapshot (string) | `documentos.module.js:~690` | Reimpresión rota (contradice "reimprimible") | Medio | 1.95 · Etapa 5 |
| P2 | Modal Operaciones | `closeM` + apertura de otro modal en el mismo tick; grid `1fr 1fr` desborda; `catalogoPara` descarta ops sin nombre | `ops-engine.business.js:145-175,264` | Defectos visuales/flujo | Medio | 1.95 · Etapa 5 |
| P2 | Persistencia | 2 módulos usan `localStorage` propio en vez de `DS` | `whatsapp.module.js` (`va_wa_config`); `configuracion.module.js` (`va_sb_*`) | Datos fuera de la puerta única | Bajo | 1.95 · Etapa 1 |
| P2 | Modelo (latente) | Oportunidad guarda id de *empresa* en campo `proyectoId` | `oportunidades.business.js:67,86` | Confusión empresa/proyecto al llegar Fase 2 | Bajo | 1.95 · Etapa 2 (limpieza) |
| P2 | Documentación | Conteo de pruebas inconsistente entre docs (54 vs 67) | `ROADMAP.md` vs `ARCHITECTURE.md` | Confusión de estado real | Bajo | 1.95 · doc |
| P2 | Responsive | `99-responsive.css` "scaffolded", responsive real pendiente | `ARCHITECTURE.md` (pendientes) | UX móvil incompleta | Bajo | Post-1.95 / Fase 4 |
| P2 | Acoplamiento UI | 56 llamadas módulo→módulo (`renderX`, `populateSelects`) | `modules/` (grep) | Refresco frágil; se ordena vía `IANNA_SYNC` | Bajo | 1.95 · Etapa 2 |

**Causa raíz común:** construir la arquitectura nueva sin retirar la vieja ni migrar consumidores. La Fase 1.95 ataca la causa, no solo los síntomas.
