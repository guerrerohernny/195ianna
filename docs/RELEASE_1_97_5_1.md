# IANNA CRM 1.97.5.1 — Visual Restore & Opportunity Pipeline

Parche deliberadamente acotado. No modifica comisiones, cobranza ni nómina.

## Objetivos

1. Revertir la regresión visual introducida por el viewport fijo de 1.97.5.
2. Hacer que Lista y Kanban representen Oportunidades, no el estatus único de la Persona.
3. Permitir que una misma Persona aparezca simultáneamente en Venta y en Nuevo mediante oportunidades distintas.

## Cambios

- Se restaura el flujo normal del documento para los módulos principales.
- `.main` deja de ser un contenedor `position:fixed` con `overflow:hidden` global.
- La navegación reinicia el scroll de la ventana después del render, sin alterar la barra lateral.
- Se elimina la tabla separada de Ventas históricas como sustituto del pipeline.
- Lista y Kanban se alimentan de:
  - oportunidades activas;
  - apartados activos;
  - ventas concluidas.
- Las ventas son tarjetas/filas inmutables en la columna Venta.
- Una nueva oportunidad crea otra tarjeta en Nuevo sin mover ni ocultar la Venta previa.
- Solo las oportunidades activas son arrastrables.

## Compatibilidad

El campo `Prospecto.estatus` se mantiene temporalmente como espejo de la oportunidad activa más reciente, pero ya no es la fuente para dibujar el pipeline. La fuente visual es Oportunidad/Operación.

## Verificación ejecutada

- 72/72 pruebas automatizadas.
- 9/9 guardas arquitectónicas.
- `node --check` en todos los JavaScript.
