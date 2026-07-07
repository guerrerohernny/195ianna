# IANNA CRM — RELEASE 1.95 · Kernel Stabilization
**Fecha:** 2026-07-07 · **Base:** Fase 1.9 · **Referencia oficial:** Architecture Review Package (docs/)

---

## 1 · Resumen técnico

La Fase 1.95 elimina la coexistencia de dos arquitecturas (la heredada del monolito
y la de motores de la 1.9) dejando **una sola vía para cada responsabilidad**:

| Responsabilidad | Única autoridad desde 1.95 |
|---|---|
| Escritura de datos | Capa de Services → DataStore (los módulos no tocan `DS.create/update/delete`, `DS.db` ni `localStorage`) |
| Cambio de estatus de Prospecto | `IANNA_PIPELINE.solicitarEstatus` (kanban ≡ ficha ≡ edición ≡ importación) |
| Estados 'Apartado'/'Venta' | DERIVADOS de una Operación real vía `IANNA_PIPELINE.derivarEstatusOperacional` (solo la invocan los ejecutores del Motor de Operaciones) |
| Autorización | `AUTORIZADOR` (acciones semánticas, fail-closed, política AUT-v1, denegaciones auditadas) |
| Saldo/efectivo de una operación | Ledger (`IANNA_FIN`); `ap.pagos[]` queda como snapshot documental |
| Comisiones | `IANNA_COM` (política versionada; se eliminaron las 2 fórmulas heredadas) |
| Formato | `IANNA_FMT` (`mxn()` es alias sancionado con salida idéntica) |
| Folios | `IANNA_FOLIOS` + `emitirUnaVez` (idempotente por referencia) + congelamiento |
| UI de operaciones | `modules/operaciones-ui.module.js` (el motor ya no conoce funciones de pantalla) |

**Comportamiento para el usuario: idéntico**, salvo correcciones de defectos
documentadas en §5.

## 2 · Defectos de causa raíz corregidos

1. **Ventas fantasma:** kanban/ficha/edición/importación podían escribir
   `estatus:'Venta'` sin Operación, sin ledger y sin folio. Ahora la Máquina de
   Estados lo impide y explica; la venta solo nace de "Contrato firmado".
2. **Venta que retrocede por arrastre:** bloqueado; la reversión es la
   cancelación formal (compensaciones en ledger) o una nueva Oportunidad.
3. **Pagarés con folio repetido:** la impresión pintaba el folio de la carátula
   en todos. Ahora imprime el folio congelado de CADA pagaré (+ id `REC-`);
   reimprimir devuelve los mismos folios; la vista previa no muestra ni consume
   folios; `emitirUnaVez` hace imposible duplicar al congelar. Además se corrigió
   el crash de `p.fecha.toLocaleDateString` con fechas serializadas.
4. **Doble fuente de saldo:** Cobranza sumaba `ap.pagos[]`; el ledger solo
   escribía. Ahora el saldo/efectivo se LEE del ledger; `reconciliarHistorico()`
   (idempotente por documento) crea asientos equivalentes para operaciones
   previas al ledger sin alterar ningún asiento existente.
5. **Comisiones divergentes:** Ingresos y Dashboard calculaban 2%/1%/0.5%
   inline ignorando la política versionada y la base comisionable. Ahora ambos
   consumen `IANNA_COM` (misma cifra en dashboard, ingresos y ledger).
6. **Orden de carga roto:** `entidades.service.js` cargaba DESPUÉS de
   `app.init.js`; se movió inmediatamente después del DataStore.
7. **Modal ⚙ con backdrop atorado y descartes silenciosos:** apertura diferida
   un frame; grid `auto-fit minmax(230px,1fr)`; el catálogo ya no filtra
   operaciones sin nombre (etiqueta derivada).
8. **Llaves sueltas en el navegador:** `va_wa_config`, `va_sb_url`, `va_sb_key`
   migran (una sola vez) al DataStore (`DS.getExt/setExt`).

## 3 · Archivos NUEVOS (7)

| Archivo | Justificación |
|---|---|
| `business/autorizador.business.js` | Motor Autorizador: 10 acciones semánticas; reemplaza 34 comparaciones de rol dispersas |
| `business/pipeline.business.js` | Pipeline Comercial: flujo único de estatus + derivación operacional + nueva Oportunidad |
| `modules/operaciones-ui.module.js` | UI del Motor de Operaciones (modal ⚙, mapa operación→flujo, captura de cancelación) — corrige dependencia invertida A2/A3 |
| `scripts/guards.sh` | 9 guardas arquitectónicas de CI (fallan el build ante regresiones) |
| `tests/run-tests.js` | Suite de motores (41 casos) en Node con sandbox de navegador |
| `tests/E2E_CHECKLIST.md` | Guion E2E manual oficial por rol (27 pasos) |
| `docs/RELEASE_1_95.md` | Este documento |

## 4 · Archivos MODIFICADOS (24) y justificación

| Archivo | Cambio |
|---|---|
| `index.html` | Orden de carga corregido; scripts nuevos; select `mp-est` sin Apartado/Venta; **Bloque 10:** Parámetros reorganizado en 6 categorías con pestañas (todos los IDs preservados) |
| `services/entidades.service.js` | Capa completa: CRUD de todas las colecciones, `visibles()` por permiso, `inventarioService.actualizarPorClave/crear/eliminarPorClave`, `modelosService`, `configService` |
| `services/dataStore.service.js` | `create` sella `schema_version:'1.95'` (siembra Fase 2); `getExt/setExt`; `migrarLlavesLegadas()` idempotente |
| `business/financiero.business.js` | Campo aditivo `fecha_valor`; `reconciliarHistorico()` idempotente por documento |
| `business/folios.business.js` | `emitirUnaVez(tipo, ref)` idempotente por referencia |
| `business/ops-engine.business.js` | Catálogo sin funciones de UI y sin descartes silenciosos; modal extraído |
| `business/cancelaciones.business.js` | `openCancelarVenta` (UI) extraído; refresco vía `IANNA_SYNC` (único puente business→UI autorizado) |
| `app.init.js` | Arranque: `DS.migrarLlavesLegadas()` + `IANNA_FIN.reconciliarHistorico()` tras `IANNA_IDS.migrar()` |
| `components/badges.components.js` | `ESTATUS_CRM` / `ESTATUS_OPERACION` separados (kanban conserva sus 7 columnas); permisos vía AUTORIZADOR |
| `modules/prospectos.module.js` | Kanban/ficha/seguimiento/edición → Pipeline; drop a Venta bloqueado con explicación; botones de ficha solo CRM; alta valida estatus; gate de eliminación |
| `modules/apartados.module.js` | Derivaciones de estatus vía Pipeline; inventario vía service; congelamiento con `emitirUnaVez`; fecha solo gerente vía AUTORIZADOR |
| `modules/cobranza.module.js` | `aportado`/`efectivo` desde `IANNA_FIN` (ledger); pagos[] solo documental |
| `modules/ingresos.module.js` | Fórmulas heredadas eliminadas → adaptadores sobre `IANNA_COM` |
| `modules/dashboard.module.js` | `calcMisIngresos` vía `IANNA_COM` |
| `modules/documentos.module.js` | `imprimirPagares` lee congelados (folio único por pagaré, preview sin folio, fechas seguras) |
| `modules/inventario.module.js` | Todas las mutaciones (edición, alta, baja, fusión, separación, reactivación) vía `inventarioService`; gate `gestionar_inventario` |
| `modules/parametros.module.js` | `paramTab()` + panel Sistema; modelos vía `modelosService`; params vía `parametrosService.guardar` |
| `modules/cierre.module.js`, `modules/cierre-acciones.module.js`, `modules/perfil.module.js`, `modules/whatsapp.module.js`, `modules/configuracion.module.js`, `modules/importar.module.js`, `modules/cotizador.module.js`, `modules/auth.module.js`, `modules/reportes.module.js`, `modules/brokers.module.js` | Migración a Services/AUTORIZADOR/configService; importación solo estatus CRM; etiquetas de rol vía `etiquetaRol` |
| `utils/utils.js` | `mxn()` delega en `IANNA_FMT.MXN(...,{decimales:0})` (salida idéntica); `moneyInputVal()` único poblador de inputs de dinero |

## 5 · Cambios de comportamiento visibles (deliberados y documentados)

1. Mover una tarjeta a **Venta** ya no "funciona": se bloquea con explicación (antes fabricaba una venta falsa).
2. Con **Apartado/Venta** activa, el estatus manual del prospecto queda bloqueado (lo gobierna la Operación).
3. Cada pagaré imprime **su propio folio** (antes: el de la carátula repetido — defecto fiscal).
4. En **perfil**, un administrador ahora ve "Administrador" (antes: "Gerente de Ventas").
5. Importar filas con estatus "Apartado/Venta" las ingresa como "Nuevo".
6. Ajustar fecha de apartado sigue siendo **solo gerente** (semántica 1.9 conservada; si se desea incluir administrador, es 1 línea en la política AUT-v1).
7. Las ventas "fantasma" pre-existentes no se borran (historial intacto); la reconciliación les crea sus asientos de ingreso equivalentes.

## 6 · Resultado de la suite automatizada (ejecutada en este build)

> Nota: el paquete 1.9 recibido **no incluía** suite automatizada; la suite de
> esta fase es la verificación oficial reproducible (`node tests/run-tests.js`).

```
RESULTADO: 41 pasaron · 0 fallaron — SUITE EN VERDE ✓
Cobertura: IANNA_FMT (7) · IANNA_IDS (2) · IANNA_FOLIOS (4) · AUTORIZADOR (6)
· IANNA_PIPELINE (7) · IANNA_FIN (6) · IANNA_COM (4) · ESTADOS/OPS (3) · DataStore (2)
```

Guardas arquitectónicas (`bash scripts/guards.sh`):

```
✅ G1 Módulos sin DS.create/update/delete/saveParams
✅ G2 Módulos sin DS._save ni mutación directa de DS.db
✅ G3 localStorage solo en dataStore.service.js
✅ G4 Cero CU.rol===/!== fuera del Autorizador
✅ G5 Cero fórmula de comisión fuera de IANNA_COM
✅ G6 Cero suma de saldo desde pagos[] en módulos
✅ G7 Cero formateo manual de dinero
✅ G8 Cero asignación literal de 'Venta' fuera del motor
✅ G9 ops-engine sin referencias a UI
RESULTADO: todas las guardas en verde ✓
```

Sintaxis: `node --check` en verde para los 47 archivos `.js` del proyecto.

## 7 · Resultado E2E

Las pruebas E2E de navegador **no son ejecutables en el entorno de build** (sin
navegador). El guion E2E oficial (27 pasos por rol) está en
`tests/E2E_CHECKLIST.md` y debe correrse en Chrome tras el deploy. Todos los
contratos que el guion verifica están cubiertos a nivel motor por la suite
automatizada.

## 8 · Despliegue

**Confirmado:** el repositorio puede reemplazarse completo en GitHub y
desplegarse en Vercel **sin pasos adicionales**: sitio 100 % estático (HTML +
JS vanilla), sin build step, sin dependencias nuevas de runtime
(`tests/` y `scripts/` solo se usan en desarrollo/CI). `vercel.json` intacto.
Las migraciones de datos (llaves legadas, reconciliación de ledger, IDs) corren
solas al primer arranque y son idempotentes.

## 9 · Deuda restante conocida (no bloqueante, registrada)

- `IANNA_SYNC` (business) referencia funciones de render de módulos: es el
  **puente autorizado** documentado (ADR-018); su sustitución por eventos DOM
  queda para Fase 2.
- Lecturas `DS.find/findOne` directas en módulos: permitidas por diseño (la
  puerta de LECTURA es DS); las escrituras están 100 % en Services.
- Inputs de porcentaje en Parámetros usan `toFixed(2)` como precisión de
  captura (no es formato de visualización).
