# E2E IANNA 1.97.1

## Control de Operaciones
- Abrir como Gerente/Admin.
- Buscar REC-, PAG-, APT/OPE, VEN- y MOV- existentes.
- Filtrar Operaciones / Documentos / Financieros / Auditoría.

## Cierre documental
- Preparación: Guardar + Generar borrador visibles.
- Borrador: Actualizar borrador + Validar visibles para Gerente.
- Validado: no mostrar Generar borrador ni Guardar; mostrar Paquete para firma y Confirmar firma.
- Venta: no mostrar acciones de borrador.

## Pago adicional
- Capturar monto y método Tarjeta.
- Ver recibo en Vista Previa sin folio definitivo antes de validar.
- Validar: recibo muestra estado emitido pendiente.
- Confirmar firma/pago: verificar MOV- en Control de Operaciones.

## Persona con recompra
- Abrir Persona con Venta histórica.
- Crear Nueva oportunidad.
- Confirmar mismo CLI-, nueva OPO-, venta previa intacta.
- Mover la nueva oportunidad por el pipeline.

## Comisiones v2
- Crédito directo: resolver esquema directo.
- Crédito broker: Asesor 1%, Broker 2% conforme configuración.
- Contado directo: resolver esquema contado directo.
- Crear esquema especial y comprobar que aparece en Cierre.
- Verificar distribución N partes suma 100%.

## UX
- Editar Avalúo escribiendo varios dígitos sin perder foco.
- Ver 90 %, 85.45 %, 0.5 % sin relleno 90.000 %.
- Entrega Rápida / Casa Muestra: modelo bloqueado al apartar.
- COFINAVIT: ver Crédito bancario + INFONAVIT y Financiamiento total.
- FOVISSSTE Para Todos: ver Crédito bancario + FOVISSSTE y Financiamiento total.
- Botones de Cierre visibles en barra sticky al hacer scroll.
