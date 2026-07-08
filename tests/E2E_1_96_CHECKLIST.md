# IANNA CRM 1.96 — Checklist E2E en navegador real

Ejecutar sobre deployment de staging con datos de prueba. Registrar captura y resultado por caso.

## 1. Identidad y ubicación
- Crear Prospecto y confirmar `PRO-`.
- Convertir mediante flujo de venta y confirmar `CLI-`.
- Verificar que no aparece `007-2026`.
- Confirmar lote en Inventario, Apartados, Cierre, Cotizador y documentos como `M0000-L0000`.

## 2. Comisión
- Venta con vivienda + excedente + construcción adicional + plusvalía + descuento.
- Confirmar que gastos de operación no entran a la base cuando están excluidos.
- Confirmar mismo valor comercial en Apartados y Cierre.
- Activar comisión especial Contado y verificar porcentaje.
- Probar distribuciones: 100; 20/80; 20/50/30.
- Intentar guardar distribución que no suma 100%: debe bloquear.

## 3. Crédito tradicional
- Elegir BBVA.
- Capturar 60% y confirmar monto = 60% del Valor Total de la Vivienda antes de gastos y descuento.
- Modificar monto y confirmar recálculo del porcentaje.

## 4. COFINAVIT
- Seleccionar COFINAVIT.
- Debe aparecer Monto INFONAVIT.
- Capturar componente público y verificar complemento bancario.
- Intentar componente público mayor al crédito: debe bloquear.

## 5. FOVISSSTE PARA TODOS
- Seleccionar FOVISSSTE PARA TODOS.
- Debe aparecer Monto FOVISSSTE.
- Verificar complemento bancario automático.

## 6. Crédito IMSS
- Seleccionar Crédito IMSS.
- Debe comportarse como tradicional, sin campo de componente público.

## 7. Contado
- Seleccionar Contado.
- Crédito debe quedar 0% / $0.
- Gastos sugeridos iniciales: solo Avalúo y Escrituración / Gastos notariales.
- Editar un gasto, eliminar otro y agregar un gasto manual.
- Confirmar que el parámetro global no cambia.

## 8. Pago adicional
- Capturar pago adicional y forma de pago.
- Guardar cierre.
- Confirmar MOV y REC únicos.
- Reabrir y guardar sin cambios: no duplicar movimiento ni folio.
- Corregir monto: debe compensar el movimiento anterior y registrar el nuevo.
- Abrir recibo y confirmar concepto PAGO ADICIONAL y forma de pago.

## 9. Solo Terreno
- Seleccionar Solo Terreno.
- Confirmar precio = superficie exacta (3 decimales) × tarifa de Parámetros + plusvalía.
- Cambiar tarifa en Parámetros y probar nueva operación; una venta histórica no debe cambiar.

## 10. Persona
- Persona sin historia: eliminar.
- Persona con historia, sin operación activa: archivar.
- Persona con Apartado/Contrato/Venta activa: bloqueo con mensaje explicativo.

## 11. Modal Operaciones
- Abrir en desktop, tablet y iPhone.
- Sin superposición, overflow horizontal ni backdrop bloqueado.
- Cerrar y abrir operación secundaria; volver al sistema sin scroll-lock residual.

## 12. Totales financieros
- Pasar cursor sobre Valor Total de la Vivienda, Total Gastos, Valor Total de la Operación y Desembolso.
- Texto y fondo deben conservar contraste.
