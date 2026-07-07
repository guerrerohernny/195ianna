# IANNA CRM — DECISIONS (ADR)

Registro de decisiones de arquitectura (Architecture Decision Records). Cada ADR: contexto, decisión, alternativas, consecuencias, estado. Los ADR **Aceptados** reflejan decisiones ya tomadas (fases previas o aprobadas por el product owner); los **Propuestos** requieren aprobación antes de la Fase 1.95.

Estados: `Aceptado` · `Propuesto` · `Reafirmado` (aceptado pero incumplido en código, se re-exige en 1.95) · `Reservado` (aprobado, implementación en fase posterior).

---

## ADR-001 — Ledger financiero append-only e inmutable
**Estado:** Aceptado (Fase 1.9).
**Contexto:** los movimientos financieros no pueden corregirse editando; se requiere trazabilidad tipo banco.
**Decisión:** todo movimiento es un `MOV-` permanente; los cambios se expresan con movimientos compensatorios. Implementado en `financiero.business.js`.
**Alternativas:** edición directa de registros (rechazada: pierde historia); soft-delete (insuficiente para auditoría fiscal).
**Consecuencias:** integridad histórica garantizada; obliga a que toda lectura de saldo use la suma del ledger (hoy incumplido — ver ADR-011).

## ADR-002 — La Máquina de Estados es la única autoridad de transición
**Estado:** ✅ Implementado (Fase 1.95): `IANNA_PIPELINE` es la única ruta de estatus; guarda G8.
**Contexto:** el estado de una Operación/Oportunidad debe cambiar solo por transiciones válidas y auditadas.
**Decisión:** ninguna transición de estado ocurre fuera de `IANNA_ESTADOS` vía `IANNA_OPS`.
**Alternativas:** validación por módulo (rechazada: dispersa y evadible).
**Consecuencias:** hoy el Kanban/ficha la evitan (`prospectos.module.js:127`); la Fase 1.95 la vuelve ineludible y prohíbe `'Venta'`/`'Apartado'` como estatus asignables de Prospecto.

## ADR-003 — Separación de dominios CRM / Comercial / Financiero / Administración
**Estado:** Reafirmado.
**Contexto:** cada dominio es responsable único de su información (`DOMAIN_MODEL.md`).
**Decisión:** ningún módulo cruza fronteras; consume motores.
**Alternativas:** módulos autónomos (rechazada: duplica reglas).
**Consecuencias:** hoy Comercial escribe estatus de Prospecto (CRM) e inventario (Administración), y CRM-adyacentes calculan dinero (Financiero). La 1.95 restablece las fronteras vía motores.

## ADR-004 — El Motor de Operaciones es el único orquestador
**Estado:** Reafirmado.
**Contexto:** "los módulos solicitan; el motor ejecuta" (`ARCHITECTURE.md`).
**Decisión:** toda operación crítica pasa por el pipeline de `IANNA_OPS` (validar → estados → impacto → confirmar → ejecutar → sincronizar → auditar → historial).
**Alternativas:** ejecución directa en módulos (rechazada).
**Consecuencias:** debe eliminarse la dependencia invertida actual (business→UI) para que el orquestador no dependa de la capa que orquesta.

## ADR-005 — Capa de servicios como única puerta de datos
**Estado:** ✅ Implementado (Fase 1.95): 0 escrituras DS y 0 mutaciones DS.db en módulos; guardas G1/G2/G3.
**Contexto:** los módulos deben ignorar el backend (localStorage hoy, Supabase después).
**Decisión:** los módulos acceden a datos solo vía `*Service`; solo `dataStore.service.js` toca `localStorage`.
**Alternativas:** `DS` directo (estado actual, rechazado).
**Consecuencias:** 274 `DS.*` a migrar (Etapa 1). Habilita Fase 2 (tenancy) y Fase 3 (Supabase) sin tocar módulos.

## ADR-006 — Política comercial versionada con snapshot por Operación
**Estado:** Aceptado (Fase 1.9).
**Contexto:** los cierres históricos no deben recalcularse al cambiar la política.
**Decisión:** cada Operación congela la versión de política vigente; `IANNA_COM` es el único cálculo de comisión.
**Alternativas:** parámetros globales mutables (estado heredado en `ingresos`/`dashboard`, rechazado).
**Consecuencias:** deben eliminarse las fórmulas heredadas (Etapa 4).

## ADR-007 — Folio único e irrepetible por documento oficial
**Estado:** Aceptado (Fase 1.5).
**Contexto:** recibos, pagos, cancelaciones y pagarés requieren folio único.
**Decisión:** `IANNA_FOLIOS.emitir()` es la única fuente; escanea todo y salta colisiones.
**Consecuencias:** la emisión es correcta; la **impresión** de pagarés usa una ruta vieja (ADR pendiente de cumplimiento — ver TECHNICAL_DEBT).

## ADR-008 — Identificadores permanentes, nunca reutilizados
**Estado:** Aceptado (Fase 1.8).
**Decisión:** consecutivos persistentes por prefijo en `IANNA_IDS`; el id público es aditivo (no rompe referencias).
**Consecuencias:** migración inicial idempotente y auditada como molde reutilizable.

## ADR-009 — Autorizador central y trazable
**Estado:** ✅ Implementado (Fase 1.95): `business/autorizador.business.js`, política AUT-v1, 10 acciones, fail-closed, denegaciones auditadas; guarda G4.
**Contexto:** hay 57 `rol==` dispersos; la autorización no es trazable.
**Decisión:** un motor `AUTORIZADOR` con `puede()`, `autorizar()`, `justificacion()`, `politicaAplicada()`. Toda autorización queda auditada. Diseñado forward-compatible para recibir empresa/proyecto en Fase 2 sin reescritura.
**Alternativas:** seguir con `rol==` (rechazada); librería externa de RBAC (rechazada por principio zero-dependency).
**Consecuencias:** cierra la deuda de autorización de Fase 1 y prepara la jerarquía de roles de Fase 2.

## ADR-010 — Jerarquía Plataforma → Empresa → Proyecto → Inventario
**Estado:** Reservado (Fase 2).
**Contexto:** decisión permanente del product owner; IANNA CRM Platform es la raíz, la Empresa es un tenant.
**Decisión:** documentar la jerarquía ahora; implementarla en Fase 2 (multiempresa). En 1.95 **no** se implementa tenancy.
**Consecuencias:** en 1.95 solo se siembra `schema_version` en registros nuevos como puente forward-compatible.

## ADR-011 — El ledger es la única fuente de saldo
**Estado:** ✅ Implementado (Fase 1.95): Cobranza lee `IANNA_FIN`; `reconciliarHistorico()` idempotente creó los asientos equivalentes del histórico; guarda G6.
**Contexto:** hoy el saldo se calcula desde `ap.pagos[]`, no desde el ledger.
**Decisión:** todo saldo, aportado y comisión se leen de `IANNA_FIN`. El arreglo embebido deja de ser fuente de verdad.
**Consecuencias:** posible reconciliación de diferencias preexistentes en ventas viejas (documentar, no ocultar).

## ADR-012 — Migración del Ledger: solo metadatos técnicos (condición D7)
**Estado:** Reservado (Fase 2), con condición aprobada.
**Decisión:** una futura migración podrá **agregar** a filas `MOV-` únicamente `empresa_id`, `proyecto_id`, `politica_version`, `schema_version`. **Nunca** modificará monto, signo, fecha, usuario ni operación.
**Consecuencias:** compatible con ADR-001; en 1.95 solo aplica `schema_version`.

## ADR-013 — Guardas de CI para impedir recaída arquitectónica
**Estado:** ✅ Implementado (Fase 1.95): `scripts/guards.sh`, 9 guardas en verde.
**Contexto:** Fase 1 confió en disciplina humana y acumuló 100% de deuda.
**Decisión:** el build falla si hay `DS.*` en `modules/`, `rol==` fuera del Autorizador, `mxn(`/formateo manual en módulos, cálculo de comisión fuera de `IANNA_COM`, o estatus 'Venta'/'Apartado' asignables sin Operación.
**Consecuencias:** vuelve la arquitectura mecánicamente irreversible; es la diferencia estructural entre Fase 1 y 1.95.

## ADR-014 — Estabilidad sobre agresividad; arquitectura antes que funcionalidad
**Estado:** Aceptado (principio permanente).
**Decisión:** ante conflicto, se prefiere consolidar el núcleo a agregar features. La Fase 1.95 (cierre de Fase 1) precede a cualquier funcionalidad nueva y a Fase 2.

---

## ADR-015 — `mxn()` como alias sancionado del Motor de Formatos
**Estado:** ✅ Implementado (Fase 1.95).
**Decisión:** `mxn(n)` delega en `IANNA_FMT.MXN(n,{decimales:0})` con salida byte-idéntica a 1.9, siguiendo el patrón de alias ya sancionado con `numToLetras`. Los ~100 sitios de llamada permanecen estables y TODO formato monetario proviene del motor.
**Alternativa rechazada:** reemplazar los ~100 sitios por `IANNA_FMT.MXN` directo — mismo resultado con mucho mayor riesgo de regresión.

## ADR-016 — Reconciliación histórica del Ledger (idempotente por documento)
**Estado:** ✅ Implementado (Fase 1.95).
**Decisión:** Para que el ledger sea la ÚNICA fuente de saldo, las operaciones previas a 1.9 reciben asientos de `ingreso` equivalentes (enganche → documento `ENG-<id>`, pagos → su folio), con `fecha_valor` (campo aditivo) preservando la fecha original y `metodo` preservando el cómputo LFPIORPI. Idempotencia por (operación, documento): correr N veces produce exactamente el mismo ledger. Ningún asiento existente se modifica (D7 respetado por diseño: solo se AGREGA).

## ADR-017 — `ap.pagos[]` queda como snapshot documental
**Estado:** ✅ Implementado (Fase 1.95).
**Decisión:** El arreglo `pagos[]` del apartado conserva los datos DOCUMENTALES del recibo (folio, método, concepto, fecha) para regenerar documentos; los MONTOS/saldos se leen exclusivamente del ledger (guarda G6). Eliminarlo rompería la regeneración de recibos históricos sin ganancia de integridad.

## ADR-018 — `IANNA_SYNC` es el único puente autorizado business→UI
**Estado:** ✅ Implementado (Fase 1.95).
**Decisión:** El motor jamás llama funciones de pantalla, con UNA excepción explícita: `IANNA_SYNC.refrescar([...])`, que reintenta renders con try/catch y existe para mantener módulos sincronizados tras una operación. El catálogo de operaciones ya no transporta funciones de UI (guarda G9); el mapa operación→flujo vive en `modules/operaciones-ui.module.js`. Sustitución por eventos DOM: Fase 2.

## ADR-019 — Emisión de folios idempotente por referencia (`emitirUnaVez`)
**Estado:** ✅ Implementado (Fase 1.95).
**Decisión:** `IANNA_FOLIOS.emitirUnaVez(tipo, ref)` devuelve el folio ya emitido para esa referencia o emite uno nuevo. El congelamiento de pagarés la usa (referencia `<apartadoId>:<n>`): ni un doble congelamiento accidental puede duplicar folios. `emitir()` conserva su semántica de avance (cobranza emite N folios por operación).
