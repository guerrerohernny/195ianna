# E2E IANNA CRM 1.97.6 — Commission Lifecycle & Payroll

Ejecutar en Chrome sobre staging con datos de prueba aislados.

## A. Validación y snapshot

1. Crear Apartado y completar Cierre con un esquema que tenga Firma + Autorización + Escritura.
2. Elegir fuente Bróker y seleccionar un bróker registrado.
3. Validar contrato como Gerente.
4. Confirmar que el resumen de comisión coincide con esquema, fuente, porcentajes y partes.
5. Cambiar posteriormente Parámetros y comprobar que la Venta conserva su snapshot.

## B. Conversión a Venta

6. Confirmar firma.
7. Abrir `Operaciones → Comisiones de la Venta`.
8. Confirmar que Firma aparece cumplida automáticamente.
9. Confirmar que Autorización y Escritura permanecen pendientes.
10. Confirmar que solo las líneas de Firma están Elegibles.

## C. Hitos manuales

11. Como Asesor, comprobar que no puede marcar hitos.
12. Como Gerente, marcar Autorización como cumplida con fecha y nota.
13. Confirmar que solo las líneas vinculadas a Autorización pasan a Elegible.
14. Repetir la acción y comprobar idempotencia: no duplica líneas.
15. Reabrir el hito antes de incluirlo en corte y comprobar que regresa a pendiente.

## D. Corte / nómina

16. Entrar a Mis Ingresos como Gerente/Admin.
17. Seleccionar líneas elegibles de varios beneficiarios.
18. Crear `COR-` con periodo.
19. Confirmar que las líneas pasan a En corte y se agrupan por beneficiario.
20. Marcar el corte como pagado con método y referencia.
21. Confirmar que todas sus líneas quedan Pagadas.
22. Comprobar que un corte pagado no puede cancelarse directamente.

## E. Recomendación

23. Crear una Venta con fuente Recomendación y nombre del recomendador.
24. Confirmar que se genera un `BEN-` identificable.
25. Cumplir el hito correspondiente y comprobar que el recomendador aparece agrupado en el corte.

## F. Regresión

26. Confirmar que Ventas anteriores siguen visibles por Oportunidad.
27. Confirmar que Cotizador, WhatsApp, Perfil, Brokers, Configuración y Auditoría se visualizan correctamente.
28. Revisar consola: cero errores JavaScript durante todo el flujo.
