# E2E IANNA CRM 1.97

## 1. Flujo asesor → gerente
1. Ingresar como Asesor.
2. Abrir un Apartado activo y capturar Cliente + Financiero.
3. Generar borrador.
4. Confirmar que no se asignen folios definitivos en borrador.
5. Confirmar que Asesor no pueda validar.
6. Ingresar como Gerente, revisar y validar contrato.
7. Confirmar que los pagarés reciban folios únicos y el Apartado siga Activo.
8. Descargar paquete para firma.
9. Confirmar firma y verificar conversión a Venta, cobranza y comisión.

## 2. Pago adicional
1. Capturar pago adicional y forma de pago.
2. Generar borrador: no debe existir ingreso definitivo en Ledger.
3. Validar: debe existir recibo emitido pendiente de confirmación.
4. Descargar paquete: el recibo debe estar disponible junto a los documentos.
5. Confirmar firma: el pago debe entrar al Ledger y afectar Cobranza una sola vez.

## 3. Comisión
1. Crear venta a crédito y revisar distribución Crédito Hipotecario.
2. Crear venta de Contado y revisar distribución Contado.
3. Crear una distribución especial de tres partes, seleccionarla en Cierre y validar snapshot.
4. Verificar que la comisión ya no muestre base $0 cuando el snapshot 1.96 usa vivienda/excedente.

## 4. Apartados
1. Cambiar vigencia estándar en Parámetros.
2. Crear Apartado y comprobar fecha de vencimiento.
3. Verificar KPIs: Activos, Valor comprometido, Por vencer, Vencidos.
4. Refrendar y confirmar historial y nueva fecha sin alterar fecha original.

## 5. Datos generales
1. Capturar Nombre(s), Apellido paterno y Apellido materno.
2. Abrir Datos Generales y verificar el orden correcto de los campos.

## 6. Solo Terreno
1. Cambiar precio por m² en Parámetros.
2. Crear un Nuevo Apartado Solo Terreno.
3. Confirmar que descripción y cálculo usan el valor vigente, sin mostrar $14,500 fijo.
