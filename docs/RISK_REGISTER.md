# IANNA CRM — RISK REGISTER

Riesgos de la arquitectura actual y de la implementación de la Fase 1.95. Clasificación por severidad; cada uno con impacto y probabilidad (Alta/Media/Baja) y mitigación.

Severidad = f(Impacto, Probabilidad). Probabilidad estimada sobre el uso real actual.

---

## Críticos

**R-01 · Venta fantasma.** Kanban/ficha/importación fijan `estatus='Venta'` sin Operación, ledger, comisión ni documentos.
- Impacto: Muy alto (datos corruptos, cifras y comisiones falsas, mezcla Persona↔Operación). Probabilidad: Alta (es una acción de un arrastre).
- Evidencia: `badges.components.js:8`; `prospectos.module.js:100,234`; `importar.module.js:66`.
- Mitigación: Etapa 2 — eliminar 'Venta'/'Apartado' como estatus asignables; toda venta nace de una Operación.

**R-02 · Reglas del motor evadibles.** 274 escrituras directas permiten saltarse validaciones, protección de inventario, unicidad, auditoría.
- Impacto: Muy alto (integridad no garantizada). Probabilidad: Alta (presente en todo el uso).
- Mitigación: Etapa 1 — puerta única de datos + guard de CI (ADR-013).

---

## Altos

**R-03 · Cifras dobles de comisión.** `ingresos`/`dashboard` calculan con fórmula heredada; divergen del ledger al versionar política.
- Impacto: Alto (dos números "oficiales"). Probabilidad: Alta (al primer cambio de versión de política).
- Evidencia: `ingresos.module.js:29-52`; `dashboard.module.js:99`. Mitigación: Etapa 4.

**R-04 · Saldo distinto a la verdad del ledger.** El saldo se lee de `ap.pagos[]`, no de la suma del ledger.
- Impacto: Alto (cobranza y estados de cuenta erróneos). Probabilidad: Media (aparece si arreglo y ledger divergen).
- Evidencia: `cobranza.module.js:12,14`. Mitigación: Etapa 4 + reconciliación documentada.

**R-05 · Folio de pagaré fiscalmente incorrecto.** El documento imprime el folio de carátula en todos los pagarés.
- Impacto: Alto (documento legal con folio equivocado). Probabilidad: Alta (todo pagaré impreso).
- Evidencia: `documentos.module.js:681`. Mitigación: Etapa 5.

**R-06 · Autorización no trazable.** 57 `rol==` sin justificación ni política.
- Impacto: Alto (no se puede auditar quién pudo qué y por qué). Probabilidad: Alta. Mitigación: Etapa 3 (AUTORIZADOR).

**R-07 · Edición directa de lote protegido (no demostrada).** La protección existe en el motor pero no se garantiza en las 57 rutas de inventario.
- Impacto: Alto (romper inmutabilidad de inventario). Probabilidad: Media. Mitigación: Etapa 1/2 + prueba explícita.

---

## Medios

**R-08 · Acoplamiento invertido business↔UI.** Dificulta pruebas y hace frágil el refresco.
- Impacto: Medio. Probabilidad: Media. Evidencia: `ops-engine.business.js:30-35,158-162`; `cancelaciones.business.js:9,96`. Mitigación: Etapa 2/3.

**R-09 · Regresión al migrar `DS.*`→Services.** Un filtro implícito de un Service puede ocultar registros.
- Impacto: Medio. Probabilidad: Media. Mitigación: migración por módulo con pruebas de paridad; humo por módulo.

**R-10 · Reimpresión de pagarés rota.** `p.fecha.toLocaleDateString` sobre string del snapshot.
- Impacto: Medio. Probabilidad: Alta (al reimprimir). Mitigación: Etapa 5.

**R-11 · Defectos del modal de Operaciones.** Secuencia close→open y overflow.
- Impacto: Medio (UX/flujo). Probabilidad: Media. Mitigación: Etapa 5.

---

## Bajos

**R-12 · Formateo manual disperso.** Inconsistencia visual. Impacto: Bajo. Prob.: Media. Mitigación: Etapa 5.

**R-13 · Llaves localStorage laterales.** Datos fuera de la puerta única. Impacto: Bajo. Prob.: Baja. Mitigación: Etapa 1.

**R-14 · `proyectoId` mal poblado en Oportunidad.** Confusión al llegar Fase 2. Impacto: Bajo. Prob.: Baja. Mitigación: limpieza en Etapa 2.

**R-15 · Inconsistencia documental (54 vs 67 pruebas).** Impacto: Bajo. Prob.: N/A. Mitigación: corregir en documentación de 1.95.

---

## Riesgos de proceso (transversales a la implementación)

**R-P1 · Recaída arquitectónica.** Sin guardas, la brecha se reabre. Mitigación: ADR-013 (CI que falla el build).
**R-P2 · Alcance que se desborda a Fase 2.** Mitigación: 1.95 prohíbe features/tenancy; solo `schema_version`.
**R-P3 · Diferencias históricas al unificar fuentes.** Mitigación: reconciliar y documentar, nunca borrar (ADR-001).
