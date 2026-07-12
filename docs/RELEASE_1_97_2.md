# IANNA CRM — Release 1.97.2

## UI & Commission Logic Stabilization

Esta actualización estabiliza la interfaz después de 1.97.1 y redefine el Motor de Comisiones como dos capas independientes:

1. Esquema de captación: define quién cobra y cuánto según fuente/origen.
2. Distribución temporal: define cuándo se cobra la comisión y en cuántas partes.

## Cambios principales

### Ventas como historial fijo
- La ficha de Persona/Cliente muestra Ventas como historial permanente.
- Una nueva compra crea una nueva Oportunidad sin alterar las Ventas previas.

### Navegación
- Control de Operaciones se reubica en Principal, junto a Apartados.
- Se mantiene el orden visual de módulos para evitar desplazamientos confusos.

### Apartado con modelo físico asignado
- Si una ubicación tiene modelo físico asignado y está en Entrega Rápida, Casa Muestra o En construcción, el modelo aparece precargado y bloqueado.
- El apartado no exige seleccionar modelo si ya existe modelo físico resuelto.
- Se tolera modelo asignado por nombre o por ID.

### Comisiones v3
- Se agregan esquemas de captación: Personal del asesor, Bróker, Recomendación, Corporativo y Guardia.
- Cada esquema configura porcentaje de Asesor, Gerente y Tercero.
- Se agregan distribuciones temporales separadas para Crédito, Contado y Especiales.
- El cierre combina: fuente de captación + distribución temporal.

### Control de Operaciones
- Los documentos tienen botón Abrir.
- Los movimientos relacionados permiten ir al expediente/operación.

## Validación
- 66/66 pruebas automatizadas aprobadas.
- 9/9 guardas arquitectónicas aprobadas.
- `node --check` limpio en todos los archivos JavaScript.

## Nota
Esta versión aún no incluye el rediseño de Dashboard IANNA Today. Ese bloque queda para una fase posterior.
