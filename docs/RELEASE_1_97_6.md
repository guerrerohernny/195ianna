# IANNA CRM 1.97.6 — Commission Lifecycle & Payroll

## Objetivo

Conectar definitivamente el esquema congelado de cada Venta con hitos de devengo, líneas elegibles, cortes administrativos y pago de comisiones.

## Cambios principales

- Nuevo motor `IANNA_COM_CICLO` en `business/comisiones-lifecycle.business.js`.
- Firma de contrato como primer hito automático al confirmar la Venta.
- Hitos posteriores administrados desde `Venta → Comisiones` por Gerente/Administrador.
- Líneas de comisión con estados `pendiente_hito`, `elegible`, `en_corte` y `pagada`.
- Cortes `COR-` con selección de líneas, agrupación por beneficiario, confirmación de pago, método y referencia.
- Beneficiarios externos `BEN-` para recomendadores; brókers conservan su identidad registrada.
- El Cierre congela `comision_snapshot` al validar el contrato.
- Mis Ingresos muestra comisión generada, pendiente de hito, elegible, en corte y pagada.
- Migración idempotente 1.97.6 para Ventas existentes; libera únicamente el hito Firma.

## Archivos nuevos

- `business/comisiones-lifecycle.business.js`
- `business/migraciones1976.business.js`
- `docs/RELEASE_1_97_6.md`
- `tests/E2E_1_97_6_CHECKLIST.md`

## Archivos principales modificados

- `business/cierre-lifecycle.business.js`
- `business/comisiones.business.js`
- `business/ids.business.js`
- `business/autorizador.business.js`
- `services/dataStore.service.js`
- `services/entidades.service.js`
- `modules/cierre.module.js`
- `modules/operaciones-ui.module.js`
- `modules/ingresos.module.js`
- `app.init.js`
- `index.html`
- `tests/run-tests.js`

## Verificación reproducible

- `node tests/run-tests.js`: 76 aprobadas, 0 fallidas.
- `bash scripts/guards.sh`: 9/9 guardas aprobadas.
- `node --check`: todos los archivos JavaScript sin errores de sintaxis.
- HTML: cero IDs duplicados y cero referencias locales de scripts faltantes.

## Limitación declarada

No se completó un E2E visual autenticado dentro del entorno de construcción. El checklist incluido debe ejecutarse en Chrome sobre el deployment de staging antes de promover a producción.
