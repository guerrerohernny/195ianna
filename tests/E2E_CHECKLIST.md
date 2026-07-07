# IANNA CRM — Checklist E2E · Fase 1.95 (Kernel Stabilization)

> **Nota de honestidad técnica:** las pruebas de motores (41 casos) y las guardas
> arquitectónicas (9) se ejecutaron automatizadas y están en verde (ver
> `docs/RELEASE_1_95.md`). Las pruebas **end-to-end de navegador** no pueden
> ejecutarse en el entorno de build (no hay navegador); este guion es el E2E
> manual oficial a correr en Chrome tras el deploy. Tiempo estimado: 25 min.

## Preparación
- [ ] Abrir el sitio desplegado. En consola: sin errores rojos al cargar.
- [ ] Verificar arranque: en consola `DS.db._ext.__migrado_v195 === true`.
- [ ] Si había datos previos con pagos: `IANNA_FIN.ledgerCompleto().length > 0`
      (la reconciliación histórica corrió) y en Auditoría aparece
      `RECONCILIACION_HISTORICA`.

## A · Rol ASESOR
1. [ ] Login como asesor. Etiqueta de rol: "Asesor Comercial".
2. [ ] Prospectos: solo ve los suyos. Nuevo Prospecto: el select de estatus
       NO ofrece "Apartado" ni "Venta".
3. [ ] Kanban: arrastrar una tarjeta a **Venta** → se bloquea con explicación
       (la venta nace de "Contrato firmado"). La tarjeta regresa a su columna.
4. [ ] Kanban: arrastrar a **Apartado** → abre el flujo formal de apartado
       (cancelar el modal = la tarjeta no se mueve).
5. [ ] Kanban: arrastrar a **Cita agendada** → modal de cita; confirmar crea
       recordatorio y en la ficha aparece la traza "Kanban: X → Cita agendada".
6. [ ] Ficha del prospecto: los botones de estatus solo muestran estados CRM +
       inactivos; el botón 🗑 eliminar NO aparece.
7. [ ] Apartados: en un apartado existente, el campo de fecha está bloqueado
       (solo gerente).

## B · Rol GERENTE
8. [ ] Login como gerente. Ve prospectos/apartados de todo el equipo.
9. [ ] Crear apartado completo (prospecto + lote disponible + enganche).
       El lote pasa a "Apartado" en inventario y el prospecto a la columna
       Apartado. En la ficha: "Apartado — definido por la Operación".
10. [ ] Ficha del prospecto con apartado: intentar cambiar estatus manual →
        botones deshabilitados con explicación.
11. [ ] ⚙ Operaciones sobre el apartado → "Contrato firmado — Registrar venta".
        Cerrar venta. Verificar: lote "Vendido", prospecto "Venta",
        comisiones devengadas en el ledger (`IANNA_FIN.movimientosDe(<aid>)`).
12. [ ] Documentos → Pagarés: **cada pagaré muestra SU folio** (consecutivos
        distintos) + su id REC-. Reimprimir: los MISMOS folios (no consume).
13. [ ] En un cierre en curso (antes de firmar): Pagarés = "VISTA PREVIA — SIN
        FOLIO" en cada uno.
14. [ ] Cobranza: registrar un pago. El KPI "Aportado" incluye el pago; en
        consola `IANNA_FIN.ingresosNetosOperacion(<aid>)` coincide con el KPI.
        Pago en Efectivo actualiza la barra LFPIORPI.
15. [ ] Kanban: intentar arrastrar la tarjeta en "Venta" a otra columna →
        bloqueado con mensaje de cancelación formal / nueva Oportunidad.
16. [ ] ⚙ Operaciones → Cancelar venta (destino Disponible). El ledger muestra
        movimientos COMPENSATORIOS (nada se borra); el lote regresa a
        Disponible; Ingresos ya no cuenta esa venta.
17. [ ] Modal ⚙ Operaciones: al elegir una operación, el modal cierra limpio y
        el flujo abre sin backdrop atorado (defecto 1.9 corregido).
18. [ ] Ingresos: los montos de comisión coinciden con
        `IANNA_COM.comisionAsesor(v).total` en consola (misma cifra el
        dashboard "Mis ingresos").
19. [ ] Inventario: editar un lote "Apartado/Vendido" → bloqueado por el Motor
        con la razón (operación activa que protege al lote).
20. [ ] Parámetros: se ve la barra de categorías (Empresa · Comercial ·
        Precios e Inventario · Financiero · Integraciones · Sistema); cada
        pestaña muestra su contenido; 💾 Guardar funciona; la pestaña Sistema
        muestra "1.95" y la política vigente.

## C · Rol ADMINISTRADOR
21. [ ] Login admin. Etiqueta: "Administrador" (antes decía "Gerente de
        Ventas" — corrección documentada).
22. [ ] Configuración → guardar credenciales Supabase → en consola
        `DS.getExt('va_sb_url')` las devuelve y `localStorage.getItem('va_sb_url')`
        es `null` (viven en la puerta única).
23. [ ] WhatsApp: guardar configuración → `DS.getExt('va_wa_config')`.
24. [ ] Importar Excel con una fila estatus "Venta" → se importa como "Nuevo"
        (estados operacionales no son importables).
25. [ ] Auditoría: existen entradas `CAMBIO_ESTATUS`, `ESTATUS_DERIVADO_OPERACION`,
        `LEDGER_APPEND` y (si se denegó algo) `AUTORIZACION_DENEGADA`.

## D · Regresión rápida
26. [ ] Cotizador genera PDF con montos idénticos a 1.9 (mxn sin decimales).
27. [ ] Recargar la página: todo persiste; sin dobles asientos en el ledger
        (la reconciliación es idempotente).
