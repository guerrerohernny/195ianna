# IANNA CRM — MIGRATION MATRIX

Tabla completa de migración para la Fase 1.95. Ningún módulo omitido. `Estado` inicial = **✅ Completado (1.95)** (se actualizará durante la implementación).

Prioridad: P0 bloqueante · P1 alta · P2 media/baja. Riesgo: Alto / Medio / Bajo.

| Archivo | Problema | Destino (acción) | Motor destino | Prioridad | Riesgo | Estado |
|---|---|---|---|---|---|---|
| components/badges.components.js | `'Venta'`/`'Apartado'` en `ESTATUS_ACTIVOS` (asignables) | Quitar de estatus asignables de Prospecto | IANNA_ESTADOS | P0 | Alto | ✅ Completado (1.95) |
| modules/prospectos.module.js | 4 rutas de estado; kanban a 'Venta' directo (26 DS.*) | Flujo único de estado; migrar a Services | IANNA_OPS / IANNA_OPO + Services | P0 | Alto | ✅ Completado (1.95) |
| modules/importar.module.js | Acepta 'Venta' en import; 5 DS.* | Validar contra máquina; migrar | IANNA_ESTADOS + Services | P0 | Medio | ✅ Completado (1.95) |
| modules/apartados.module.js | 72 DS.*; corazón operativo | Migrar a Services + motor | Services + OPS/FIN/COM | P0 | Alto | ✅ Completado (1.95) |
| modules/inventario.module.js | 57 DS.*; protección no demostrable | Toda edición vía motor; migrar | IANNA_MOTOR + Services | P0 | Alto | ✅ Completado (1.95) |
| modules/ingresos.module.js | Fórmula de comisión heredada (6 DS.*) | Eliminar fórmula; consumir motor | IANNA_COM + IANNA_FIN | P0 | Alto | ✅ Completado (1.95) |
| modules/dashboard.module.js | Comisión inline `:99`; 16 DS.* | Eliminar inline; consumir motor | IANNA_COM + Services | P0 | Alto | ✅ Completado (1.95) |
| modules/cobranza.module.js | Doble fuente (ledger vs `pagos[]`); 8 DS.* | Leer del ledger; migrar | IANNA_FIN | P0 | Alto | ✅ Completado (1.95) |
| modules/documentos.module.js | Pagarés imprimen folio de carátula (1 DS.*) | Leer `pagares_congelados`; arreglar reimpresión | IANNA_FOLIOS + IANNA_FMT | P0 | Alto | ✅ Completado (1.95) |
| *(transversal)* | 57 comparaciones `rol==` | Centralizar autorización | AUTORIZADOR | P0 | Alto | ✅ Completado (1.95) |
| business/ops-engine.business.js | Dependencia invertida (llama UI); modal | Emitir eventos; extraer UI; arreglar secuencia modal | IANNA_OPS / IANNA_SYNC | P1 | Medio | ✅ Completado (1.95) |
| business/cancelaciones.business.js | UI dentro de business (`openCancelarVenta`); llama render* | Extraer UI a módulo; sync por eventos | IANNA_OPS / IANNA_SYNC | P1 | Medio | ✅ Completado (1.95) |
| utils/utils.js | `mxn()` legado de uso masivo | Sustituir por motor; deprecar | IANNA_FMT | P1 | Medio | ✅ Completado (1.95) |
| modules/auth.module.js | Login lee usuarios directo (1 DS.*) | Migrar; integrar autorizador | usuariosService + AUTORIZADOR | P1 | Medio | ✅ Completado (1.95) |
| modules/cierre.module.js | 11 DS.*; formateo manual | Migrar a Services + formato | Services + IANNA_FMT | P1 | Medio | ✅ Completado (1.95) |
| modules/cierre-acciones.module.js | 7 DS.* | Migrar a Services | Services + IANNA_OPS | P1 | Medio | ✅ Completado (1.95) |
| modules/parametros.module.js | 23 DS.*; edición de política | Migrar; consumir motor de comisiones | parametrosService + IANNA_COM | P1 | Medio | ✅ Completado (1.95) |
| modules/cotizador.module.js | 12 DS.*; corrida financiera | Migrar; consumir motores | Services + IANNA_FIN/FMT | P1 | Medio | ✅ Completado (1.95) |
| business/oportunidades.business.js | Campo `proyectoId` poblado con id de empresa | Corregir semántica del campo | IANNA_OPO | P2 | Bajo | ✅ Completado (1.95) |
| modules/reportes.module.js | Lecturas directas (4 DS.*) | Migrar; leer del ledger | Services + IANNA_FIN | P2 | Bajo | ✅ Completado (1.95) |
| modules/brokers.module.js | 5 DS.* | Migrar a Services | brokersService | P2 | Bajo | ✅ Completado (1.95) |
| modules/whatsapp.module.js | localStorage propio (`va_wa_config`); 10 DS.* | Absorber en DS; migrar | DS / config | P2 | Bajo | ✅ Completado (1.95) |
| modules/configuracion.module.js | localStorage propio (`va_sb_*`); 8 DS.* | Absorber en DS; migrar | DS / config | P2 | Bajo | ✅ Completado (1.95) |
| modules/perfil.module.js | Escribe estatus directo (1 DS.*) | Migrar a Services | usuariosService | P2 | Bajo | ✅ Completado (1.95) |
| modules/auditoria.module.js | Formateo manual (1 DS.*) | Sustituir formato; migrar | IANNA_FMT + Services | P2 | Bajo | ✅ Completado (1.95) |
| modules/dashboard.module.js + varios | Formateo manual disperso | Sustituir por motor | IANNA_FMT | P2 | Bajo | ✅ Completado (1.95) |
| assets/css/99-responsive.css | Responsive real pendiente | (Fuera de 1.95) | — | — | Diferido |

**Totales de referencia:** 274 `DS.*` en 19 módulos · 0 uso de Services · 57 `rol==` · 2 llaves localStorage laterales.
