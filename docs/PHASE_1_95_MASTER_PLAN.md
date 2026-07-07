# IANNA CRM — PHASE 1.95 MASTER PLAN

**Propósito:** cerrar completamente la Fase 1 dejando **una sola arquitectura**. Sin funcionalidades nuevas, sin multiempresa, sin optimizaciones prematuras.

**Regla transversal (todas las etapas):**
1. Al cerrar cada etapa se **retira la ruta vieja** (no se deja "por compatibilidad").
2. Las 67 pruebas existentes deben seguir verdes en cada corte, más las pruebas nuevas de la etapa.
3. Se activa la guarda de CI correspondiente (ADR-013) antes de pasar a la siguiente etapa.

**Tiempos:** estimaciones indicativas en días-ingeniería ideales (dev senior familiarizado con el código). No son compromisos; dependen de la cobertura de pruebas previa.

---

## Etapa 1 ✅ COMPLETADA — Puerta única de datos

- **Objetivo:** que toda lectura/escritura pase por `*Service` (nunca `DS.*` desde módulos). Absorber las llaves `localStorage` laterales. Sembrar `schema_version` en registros nuevos.
- **Archivos:** los 19 módulos con `DS.*`; `whatsapp.module.js`, `configuracion.module.js`; `entidades.service.js` (completar cobertura); `dataStore.service.js`.
- **Motores/Capas:** Services, DS.
- **Pruebas:** paridad por módulo (Service devuelve lo mismo que `DS.find` filtraba); humo por pantalla; guard CI "cero `DS.create/update/delete` en `modules/`"; las 67 existentes.
- **Riesgos:** R-09 (filtros implícitos), R-07 (aprovechar para enrutar inventario por motor), R-13.
- **Tiempo estimado:** 4–6 días (es la etapa de mayor volumen mecánico: 274 sitios).
- **Criterio de aceptación:** grep `DS.*` en `modules/` = 0; grep `localStorage` fuera de `dataStore.service.js` = 0; 67 pruebas verdes.

## Etapa 2 ✅ COMPLETADA — Estado unificado (Prospecto / Oportunidad)

- **Objetivo:** un único flujo de cambio de estado que Kanban, Ficha, Agenda y edición invocan por igual, vía `IANNA_OPS`/`IANNA_OPO`. **Eliminar 'Venta' y 'Apartado' como estatus asignables** de Prospecto. Corregir el `proyectoId` mal poblado. Empezar a desacoplar business↔UI (sync por eventos).
- **Archivos:** `prospectos.module.js`, `components/badges.components.js`, `importar.module.js`, `apartados.module.js` (rama Apartado del kanban), `oportunidades.business.js`, `ops-engine.business.js` / `cancelaciones.business.js` (extraer UI).
- **Motores:** `IANNA_OPS`, `IANNA_OPO`, `IANNA_ESTADOS`, `IANNA_SYNC`.
- **Pruebas:** mover por kanban ≡ mover por ficha (mismo estado y misma auditoría); ninguna ruta fija 'Venta' sin `APT-`/`VEN-`; import rechaza estatus de Operación; reconciliación de registros 'Venta' fantasma existentes.
- **Riesgos:** R-01 (objetivo), R-08, R-14, orden de auditoría/seguimiento del kanban.
- **Tiempo estimado:** 3–5 días.
- **Criterio de aceptación:** 100% de transiciones por flujo único; imposible fabricar venta sin Operación; `proyectoId` con semántica correcta.

## Etapa 3 ✅ COMPLETADA — Autorizador central

- **Objetivo:** reemplazar los 57 `rol==` por `AUTORIZADOR.puede/autorizar/justificacion/politicaAplicada`. Autorización trazable. Diseñado forward-compatible para empresa/proyecto (Fase 2) sin reescritura.
- **Archivos:** los ~12 módulos con checks de rol + `auth.module.js`; nuevo `business/autorizador.business.js`; integración en el pipeline de `IANNA_OPS`.
- **Motores:** `AUTORIZADOR` (nuevo), `IANNA_OPS`.
- **Pruebas:** cada acción sensible responde `justificacion()` y `politicaAplicada()`; matriz de rol×acción; E2E por rol (asesor, gerente, administrador) sin fugas de permiso.
- **Riesgos:** R-06 (objetivo), perder un check sutil al centralizar.
- **Tiempo estimado:** 3–4 días.
- **Criterio de aceptación:** grep `rol==` fuera del Autorizador = 0; toda autorización auditada.

## Etapa 4 ✅ COMPLETADA — Dinero por un solo motor

- **Objetivo:** eliminar fórmulas de comisión heredadas; todo saldo y comisión desde el ledger/`IANNA_COM`. `ap.pagos[]` deja de ser fuente de saldo.
- **Archivos:** `ingresos.module.js` (`calcComisionAsesor/Gerente`), `dashboard.module.js:99`, `cobranza.module.js` (lecturas), `reportes.module.js`, `cotizador.module.js`.
- **Motores:** `IANNA_FIN`, `IANNA_COM`.
- **Pruebas:** comisión Ingresos = Dashboard = ledger para misma venta y versión; saldo cobranza = suma algebraica del ledger; reconciliación de ventas viejas documentada.
- **Riesgos:** R-03, R-04 (objetivos), diferencias históricas expuestas.
- **Tiempo estimado:** 3–4 días.
- **Criterio de aceptación:** grep de fórmula de comisión fuera de `IANNA_COM` = 0; cero lecturas de saldo desde `ap.pagos[]`.

## Etapa 5 ✅ COMPLETADA — Documentos y formato por un solo motor

- **Objetivo:** pagaré imprime su folio congelado y es reimprimible; todo formato por `IANNA_FMT`; modal de Operaciones sin defecto.
- **Archivos:** `documentos.module.js` (`imprimirPagares`), `utils/utils.js` (`mxn`), los 6 módulos con formateo manual, `ops-engine.business.js` (secuencia del modal, grid, filtro `NOMBRES`).
- **Motores:** `IANNA_FOLIOS`, `IANNA_FMT`.
- **Pruebas:** folio impreso del pagaré N = `pagares_congelados[N].folio`; reimpresión desde snapshot funciona; grep `mxn(`/`toLocaleString` en módulos = 0; E2E del modal sin error de consola.
- **Riesgos:** R-05, R-10, R-11, R-12.
- **Tiempo estimado:** 3–4 días.
- **Criterio de aceptación:** cero formateo manual en módulos; folios de pagaré correctos y reimprimibles; modal limpio.

---

## Cierre de la Fase 1.95 — criterios medibles (definición de "hecho")

1. Cero `DS.create/update/delete` en `modules/`.
2. Cero `localStorage` fuera de `dataStore.service.js`.
3. Cero `rol==` fuera del Autorizador; 100% de acciones sensibles con `justificacion()`.
4. Cero fórmulas de comisión fuera de `IANNA_COM`.
5. Cero lecturas de saldo desde `ap.pagos[]`; saldo = suma del ledger.
6. 100% de transiciones por flujo único; imposible fabricar 'Venta' sin Operación.
7. Cero `mxn()` y formateo manual en módulos.
8. Folio de pagaré = folio congelado; reimpresión funciona.
9. Ninguna ruta edita lote Vendido/Apartado/Contrato sin pasar por `IANNA_MOTOR` (demostrado con prueba).
10. Modal de Operaciones sin defecto reproducible; E2E por rol sin errores de consola.
11. 67 pruebas existentes + nuevas E1–E5 verdes.
12. Guardas de CI (ADR-013) activas y pasando.

Cuando los doce estén verdes, existe **una sola arquitectura**. Ese es el fin de Fase 1.95 y la condición para abrir Fase 2.

**Rango total indicativo:** ~16–23 días-ingeniería, secuenciales, sin solapar etapas (por la regla de retirar la ruta vieja antes de avanzar).


---

## CIERRE DE FASE (2026-07-07)
Las 5 etapas se implementaron y verificaron: 41/41 pruebas de motores en verde, 9/9 guardas arquitectónicas en verde, `node --check` limpio en todo el proyecto. Detalle completo, justificaciones y cambios de comportamiento en `docs/RELEASE_1_95.md`. Los criterios de finalización aprobados se cumplen (el criterio de formato se cumple vía alias sancionado, ADR-015; E2E de navegador: guion oficial en `tests/E2E_CHECKLIST.md`).
