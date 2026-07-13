# E2E IANNA CRM 1.97.5

1. Abrir cada módulo desde una posición desplazada: siempre inicia arriba y sin huecos.
2. En Cierre, navegar Cliente → Financiero → Vista previa → Financiero: cada paso inicia arriba.
3. Seleccionar Contado: crédito % y monto quedan en cero, deshabilitados y no alteran el cálculo.
4. Seleccionar Crédito/COFINAVIT: campos de crédito vuelven a habilitarse.
5. En Parámetros, abrir esquemas: no existe scroll horizontal; acordeones editables.
6. Agregar/eliminar parte: conserva posición; máximo cuatro partes.
7. Validar que las partes de cada rol suman el porcentaje total del rol, no 100%.
8. Confirmar que desapareció la edición de porcentajes legacy.
9. Guardar RFC/CURP/nacimiento en un cliente, abrir otro cierre del mismo cliente: datos precargados.
10. Cliente con venta: crear nueva oportunidad. Debe aparecer en Nuevo y la venta seguir visible en Ventas históricas y en la ficha.
11. Verificar que la Venta anterior conserva VEN-, ubicación, fecha y valor.
