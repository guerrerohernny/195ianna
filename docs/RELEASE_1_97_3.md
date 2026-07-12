# IANNA CRM — Release 1.97.3

## Operational Stabilization + Commission Payroll Foundation

Esta versión corrige regresiones detectadas en prueba real de la 1.97.2 y consolida el modelo de comisiones para que avance hacia cortes/nómina.

## Cambios principales

### 1. Persona / Cliente / Oportunidades / Ventas
- Se refuerza la lectura visual de una Persona con ventas históricas y nuevas oportunidades.
- La nueva oportunidad no borra ni mueve la venta previa.
- Se agregan badges de ventas históricas y oportunidades activas en Lista/Kanban.
- Al crear una recompra se conserva el mismo `CLI-` y se registra `OPO-` nueva.

### 2. Apartados con modelo físico asignado
- Se corrige la regresión en lotes con `modelo_asignado` cuyo estado interno sigue como `Disponible` pero su estado visible es `Entrega Rápida`.
- El selector de modelo se precarga y bloquea correctamente cuando el lote tiene modelo físico asignado.
- El Apartado ya no exige una selección manual si el modelo está resuelto por inventario.

### 3. Layout y navegación
- Al cambiar de módulo se reinicia el scroll de la página y del contenedor principal.
- Esto evita que módulos como Cotizador, WhatsApp CRM, Mi Perfil, Brokers, Configuración y Auditoría parezcan vacíos o desplazados hacia abajo.
- Se elimina un ID duplicado de Supabase URL en Configuración.

### 4. Control de Operaciones
- La vista por defecto queda orientada a negocio: documentos, operaciones, movimientos y folios relevantes.
- Los eventos técnicos/auditoría quedan ocultos salvo que se active el checkbox de eventos técnicos o se filtre por Auditoría técnica.
- Se conserva el acceso para abrir documentos y expediente.

### 5. Comisiones v4 — Esquema Comercial Unificado
- Se sustituye el modelo visual de “captación + distribución separadas” por un único Esquema Comercial.
- Cada esquema define en un solo lugar:
  - modalidad: crédito, contado o especial;
  - fuente: personal, bróker, recomendación, casa o guardia;
  - porcentaje asesor;
  - porcentaje gerente;
  - tercero y porcentaje de tercero;
  - distribución del cobro por partes.
- En el cierre, IANNA resuelve el esquema a partir de modalidad + fuente/canal.
- Este modelo prepara la siguiente evolución: cortes y nómina de comisiones.

## Verificación ejecutada

- 70 pruebas automatizadas aprobadas.
- 9/9 guardas arquitectónicas en verde.
- `node --check` limpio para todos los JavaScript.
- Sin IDs HTML duplicados.

## Pendiente deliberado

La nómina de comisiones todavía no se declara como módulo final. Esta versión deja la base conceptual y técnica para que el siguiente bloque pueda generar cortes de comisión reales desde líneas devengadas.
