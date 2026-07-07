# IANNA CRM — ARCHITECTURE REVIEW

**Prefase 1.95 · Architecture Review Package**
**Rol del revisor:** Chief Software Architect / Software Auditor / Consultor de Producto Inmobiliario.
**Alcance:** auditoría del proyecto tras Fase 1.9 (código completo recibido). Toda afirmación está respaldada por evidencia `archivo:línea`.
**Estado:** documento oficial. No se ha escrito ni modificado código.

Documentos hermanos de este paquete: `TECHNICAL_DEBT_REGISTER.md`, `DECISIONS.md`, `DEPENDENCY_MAP.md`, `MIGRATION_MATRIX.md`, `RISK_REGISTER.md`, `PHASE_1_95_MASTER_PLAN.md`.

---

## 1. Resumen ejecutivo

IANNA CRM tiene una arquitectura de motores correctamente diseñada y **prácticamente sin consumir**. El núcleo (financiero, comisiones, folios, estados, operaciones, formatos) está implementado con rigor y es coherente con `DOMAIN_MODEL.md`. Pero los 20 módulos siguen operando como el monolito original: escriben datos directamente, calculan dinero con fórmulas propias, cambian estados sin validación e imprimen documentos por rutas viejas.

**Conviven dos arquitecturas:** la documentada (motores) y la que corre en producción (módulos). La magnitud es medible: **274 escrituras directas a `DS.*` en 19 módulos y 0 usos de la capa de servicios**; **57 comparaciones `rol==`** sin autorización trazable; **2 módulos con fórmula de comisión heredada**; un ledger que convive con arreglos financieros embebidos; un formateador legado (`mxn()`) de uso masivo; y una **dependencia invertida** (la capa `business/` llama funciones de UI de los módulos).

El hallazgo más grave: el Kanban, la ficha y la importación pueden fijar el estatus `'Venta'` de un Prospecto con una escritura directa, **fabricando una venta que no existe** (sin Operación, ledger, comisión ni documentos), lo que rompe la separación fundacional Persona↔Operación.

La corrección es de **conexión, no de reconstrucción**: los motores existen y son correctos; falta forzar que la aplicación los use y **eliminar las rutas viejas al hacerlo**, blindado con guardas de CI que impidan la recaída. Ese es el propósito exacto de la Fase 1.95.

**Veredicto de preparación:** ver §10. En resumen: **la arquitectura de destino está lista; el código actual NO lo está** — y por eso la Fase 1.95 es necesaria y está bien delimitada.

---

## 2. Fortalezas

- **Motores correctos y coherentes con el modelo.** `IANNA_FIN` (ledger append-only, `financiero.business.js`), `IANNA_COM` (política versionada con snapshot y base comisionable, `comisiones.business.js`), `IANNA_FOLIOS` (folio único con salto de colisiones, `folios.business.js`), `IANNA_IDS` (consecutivos permanentes, `ids.business.js`), `IANNA_ESTADOS` (12 estados, `estados.business.js`), `IANNA_OPS`/`catalogoPara` (`ops-engine.business.js`).
- **Puerta de datos única real.** `DS` (`dataStore.service.js`) centraliza `find/create/update/delete`; esto hace *viable* cerrar la brecha sin reinventar la persistencia.
- **Patrón de migración probado.** `IANNA_IDS.migrar()` es idempotente (guard `migracion_ids_v1`) y auditado — molde correcto para futuras migraciones.
- **Un formato ya unificado.** `numToLetras` delega a `IANNA_FMT.NUM_A_LETRAS` (`formatos.util.js:191`).
- **Prefijos de identidad preparados.** `EMP-`, `PRY-` ya reservados en `IANNA_IDS.PREFIJOS` para Fase 2.

---

## 3. Debilidades

- **Capa de servicios = código muerto.** 274 `DS.*` directas; 0 `*Service` usados (§ MIGRATION_MATRIX).
- **Estado sin autoridad única.** 4 rutas de cambio de estado de Prospecto; ninguna pasa por un motor único.
- **Dinero en dos verdades.** Comisión heredada en `ingresos`/`dashboard`; saldo leído de `ap.pagos[]` en vez del ledger.
- **Documentos por ruta vieja.** Pagarés imprimen el folio de carátula, no el congelado.
- **Formato mixto.** `mxn()` legado + formateo manual en 6 módulos.
- **Capas entrelazadas.** `business/` invoca UI (`renderX`, `editarApartado`, …); función de modal (`openCancelarVenta`) definida dentro de `business/`.
- **Responsive incompleto.** `99-responsive.css` sigue "scaffolded" (pendiente explícito en `ARCHITECTURE.md`).

---

## 4. Deuda técnica

Registro completo y priorizado en `TECHNICAL_DEBT_REGISTER.md`. Resumen: la deuda dominante es la **no-adopción de la capa de servicios y de los motores** por parte de los módulos. Todo lo demás (comisiones, folios, formatos, modal) son síntomas de la misma causa raíz: *rutas viejas nunca retiradas al construir las nuevas*.

---

## 5. Riesgos

Detalle con impacto y probabilidad en `RISK_REGISTER.md`. Los cuatro riesgos vivos: (1) ventas fantasma por Kanban/ficha/importación; (2) cifras dobles al versionar política; (3) folios de pagaré fiscalmente incorrectos; (4) reglas del motor evadibles por la puerta trasera mientras existan escrituras directas.

---

## 6. Violaciones arquitectónicas

1. **Single Source of Truth roto (financiero).** Ledger vs `ap.pagos[]`; lectura desde el arreglo (`cobranza.module.js:12,14`).
2. **"Ningún módulo es dueño de la información" roto.** 274 escrituras directas.
3. **Máquina de estados evitable.** Kanban/ficha escriben estatus sin ella.
4. **Persona↔Operación mezcladas.** `'Venta'` y `'Apartado'` como estatus de Prospecto (`badges.components.js:8`).
5. **Dependencia invertida de capas.** `business/` → UI de módulos (`ops-engine.business.js:30-35,158-162`; `cancelaciones.business.js:96`).
6. **Comisión fuera del motor versionado.** `ingresos.module.js:29-52`, `dashboard.module.js:99`.
7. **Autorización no trazable.** 57 `rol==` dispersos, sin política ni justificación.
8. **Contradicción documental.** Fase 1.9 se declara "completada" con afirmaciones falsas en código (kanban↔ficha "jamás divergen"; pagarés "reimprimibles"). Conteo de pruebas inconsistente (ROADMAP: 54; ARCHITECTURE: 67).

---

## 7. Módulos críticos

`prospectos.module.js` (venta fantasma, 4 rutas de estado), `apartados.module.js` (72 `DS.*`, corazón operativo), `inventario.module.js` (57 `DS.*`, protección no demostrable), `ingresos.module.js` + `dashboard.module.js` (comisión heredada), `cobranza.module.js` (doble fuente), `documentos.module.js` (folio de pagaré), `importar.module.js` (acepta 'Venta').

## 8. Motores críticos

`IANNA_OPS` (debe volverse orquestador único real, hoy entrelazado con UI), `IANNA_FIN` (debe ser la única fuente de saldo), `IANNA_COM` (debe ser el único cálculo de comisión), `IANNA_FOLIOS` (correcto; el problema está aguas abajo en impresión), `IANNA_ESTADOS` (debe volverse autoridad ineludible de transición). Nuevo motor requerido: **`AUTORIZADOR`**.

---

## 9. Recomendaciones y orden de implementación

Cerrar Fase 1 con cinco etapas secuenciales, cada una **retirando su ruta vieja** y protegida por guardas de CI. Orden y detalle en `PHASE_1_95_MASTER_PLAN.md`:

1. Puerta única de datos (`DS.*` → Services).
2. Estado unificado (kanban ≡ ficha ≡ agenda ≡ edición; eliminar 'Venta'/'Apartado' asignables).
3. Autorizador central (retirar los 57 `rol==`).
4. Dinero por un solo motor (`IANNA_COM` + `IANNA_FIN`).
5. Documentos y formato por un solo motor (folio de pagaré + `IANNA_FMT` + modal).

No se toca multiempresa. Solo se siembra `schema_version` y se diseña el Autorizador forward-compatible para Fase 2.

---

## 10. ¿La arquitectura está lista para iniciar la Fase 1.95?

**Sí para arrancar la Fase 1.95 — no para saltarla.** La *arquitectura de destino* (motores + servicios + máquina de estados + autorizador) es correcta y suficiente para el producto; no requiere rediseño previo. Pero el *código actual* no cumple los principios permanentes (dos arquitecturas coexisten), y por eso la Fase 1.95 debe ejecutarse antes de cualquier funcionalidad nueva o de Fase 2.

**Condición de arranque:** aprobar este paquete y comenzar por la **Etapa 1** (puerta única de datos), porque es el prerrequisito mecánico de todas las demás — sin ella no se puede *garantizar* que las reglas del motor no se evadan. No hay nada que "corregir antes" de la Etapa 1: la Etapa 1 *es* lo primero a corregir.
