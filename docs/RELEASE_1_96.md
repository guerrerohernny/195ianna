# IANNA CRM — Release 1.96

## Business Rules & UX Hardening

**Objetivo:** cerrar las reglas comerciales, financieras, documentales y de UX del piloto PALIZ / Valle de Aragón antes de iniciar la Fase 2 Multiempresa.

## Alcance implementado

### Identidad y nomenclatura
- `CLI-nnnnnn` es el identificador oficial de Cliente; la migración 1.96 elimina `num_cliente` heredado.
- Cada lote conserva `LOT-nnnnnn` como ID permanente y muestra la clave física `M0000-L0000`.
- La migración de identidad es idempotente y auditada.

### Valor comercial y Solo Terreno
- `IANNA_VALOR` es la fuente única de la composición comercial: vivienda, excedente, fracción fusionada, lote adicional, construcción adicional y plusvalía.
- Solo Terreno calcula superficie exacta × `precio_m2_solo` de Parámetros + plusvalía.
- Apartados, Cierre y Comisiones consumen la misma composición comercial.

### Comisiones
- Base comisionable configurable por conceptos.
- El descuento reduce la base cuando la política lo indica.
- Regla especial configurable para Contado.
- Distribución dinámica de N partes para asesor y gerente; la UI exige 100%.
- La operación congela base, política, porcentaje, regla especial y distribución.

### Financiamiento y cierre
- Porcentaje de crédito basado en Valor Total de la Vivienda antes de gastos y descuento.
- Sincronización bidireccional `% ⇄ monto`.
- Instituciones cargadas desde Parámetros.
- Tipos: tradicional, mixto y contado.
- COFINAVIT: componente público INFONAVIT + complemento bancario automático.
- FOVISSSTE PARA TODOS: componente público FOVISSSTE + complemento bancario automático.
- Crédito IMSS se comporta como financiamiento tradicional.
- Contado fuerza crédito cero.

### Gastos de operación
- Se precargan desde Parámetros.
- Pueden editarse, eliminarse y agregarse únicamente para la operación actual.
- Los cambios conservan monto calculado, monto aplicado, usuario y fecha de modificación.
- Contado precarga solamente Avalúo y Escrituración / Gastos notariales.
- Parámetros permite definir aplicabilidad por Crédito y Contado.

### Pago adicional
- El pago adicional genera folio de recibo idempotente y movimiento en el ledger.
- Si el importe se corrige, el movimiento anterior se compensa y se registra el nuevo monto; el ledger nunca se muta.
- La forma de pago queda asociada al movimiento y al recibo.

### Persona
- Sin historial: eliminación física autorizada.
- Con historial y sin operación activa: archivar expediente.
- Con operación activa: no eliminar, archivar ni inactivar.

### UX
- Modal de Operaciones migrado al componente oficial de modal y grid responsive.
- Filas resumen financieras usan clases semánticas para conservar contraste en hover.
- Nomenclatura física de lotes normalizada en las vistas principales.

## Archivos nuevos
- `business/operacion-financiera.business.js`
- `business/migraciones196.business.js`
- `docs/RELEASE_1_96.md`
- `tests/E2E_1_96_CHECKLIST.md`
- `templates/Plantilla_Inventario_IANNA_1_96.xlsx`

## Verificación ejecutada

- `node tests/run-tests.js`: **55 pasaron, 0 fallaron**.
- `bash scripts/guards.sh`: **9/9 guardas en verde**.
- `node --check`: **todos los archivos JavaScript sin error de sintaxis**.
- Validación estática de `index.html`: sin IDs HTML duplicados y sin referencias locales faltantes.
- Smoke HTTP del sitio estático: `index.html` servido correctamente por servidor local.

## Limitación de verificación

El entorno disponible bloqueó la navegación local de Chromium con una política administrativa, por lo que **no se declara E2E visual real como ejecutado**. Se entrega `tests/E2E_1_96_CHECKLIST.md` para validación manual/Chrome después del deploy de staging.

## Preparación para Fase 2

Esta release no implementa Multiempresa. PALIZ y Valle de Aragón siguen siendo la instalación piloto. La siguiente fase podrá migrarlos, sin recaptura, a:

- `EMP-000001` — Desarrolladora PALIZ
- `PRY-000001` — Valle de Aragón

La conversión de constantes de empresa/proyecto a entidades configurables pertenece a Fase 2.

## Clean Bootstrap & Import System

Por decisión de producto, la instalación piloto 1.96 hace un corte limpio antes de Multiempresa:

### Se conserva
- usuarios, roles y accesos;
- Parámetros y política comercial;
- modelos y precios;
- instituciones financieras;
- gastos configurables;
- integraciones y configuración maestra.

### Se reinicia en cero una sola vez
- inventario;
- prospectos y clientes transaccionales;
- oportunidades y operaciones;
- apartados, ventas, contratos y cancelaciones;
- pagos, recibos, pagarés, documentos y ledger;
- comisiones, seguimientos, agenda/cotizaciones transaccionales y auditoría de datos de prueba.

El bootstrap es idempotente y se ejecuta una sola vez por instalación mediante `bootstrap_limpio_196`.

### Importación oficial de inventario
Se agregó `Administración → Inventario → Importar inventario` con:
- descarga de plantilla XLSX;
- validación previa completa;
- reporte de errores por fila;
- rechazo de ubicaciones duplicadas;
- asignación automática de `LOT-000001`;
- generación automática de `M0000-L0000`;
- importación de superficie con 3 decimales, excedente, estado, modelo planeado, plusvalía, tipo de ubicación, cliente histórico opcional y observaciones;
- campo **Domicilio** obligatorio, persistido como `dir_oficial` para que el Cierre y Documentos lo consuman sin necesidad de mostrarlo en la tabla general del Inventario;
- estado `Vendido histórico` para bloquear inventario vendido antes de IANNA sin fabricar una Operación, un Contrato o movimientos financieros falsos.

El Excel es únicamente un mecanismo de entrada. Después de importar, IANNA asigna identidades, valida reglas y se convierte en la única fuente de verdad.

### Importación de Personas
Se mantiene el importador de Prospectos con plantilla oficial. `PRO-` se asigna automáticamente y los Clientes solo obtienen `CLI-` mediante el flujo de negocio correspondiente.
