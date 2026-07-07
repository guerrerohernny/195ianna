# IANNA CRM — DEPENDENCY MAP

Mapa de dependencias basado en evidencia de código. Objetivo: detectar dependencias en sentido incorrecto.

---

## 1. Dependencia objetivo (la que debería existir)

```
        UI (index.html, handlers onclick)
                    │
                    ▼
             Modules (presentan / solicitan)
                    │
                    ▼
             Business (motores: reglas de negocio)
                    │
                    ▼
             Services (*Service: fachadas por entidad)
                    │
                    ▼
             DataStore (DS)
                    │
                    ▼
             Storage (localStorage → Supabase)
```

Regla: cada capa depende **solo hacia abajo**. Los módulos nunca se llaman entre sí; se comunican por servicios y por `IANNA_SYNC`.

---

## 2. Dependencia real (la que existe hoy)

```
        UI (handlers onclick)
                    │
                    ▼
             Modules ───────────────┐  (274 llamadas DS.* directas: saltan Services)
                    │               │
                    ▼               ▼
             Business (motores)   DataStore (DS)   ← acceso directo, capa Services puenteada
                    │  ▲            │
   (dependencia     │  │            ▼
    INVERTIDA)      │  │        Storage (localStorage)
                    ▼  │
             Modules (UI) ◄─┘  ← business/ llama renderX(), editarApartado(), etc.

        Services (*Service) ── 0 consumidores (código muerto)

        2 módulos ──► localStorage propio (va_wa_config, va_sb_*)  ← saltan DS
```

**Anomalías detectadas:**
- **A1 — Services puenteada.** Modules → DS directo (274 usos); Services no se consume. Evidencia: 0 `*Service.` en `modules/`.
- **A2 — Dependencia invertida.** Business → UI de Modules. Evidencia: `ops-engine.business.js:30-35` (`renderInventario/Apartados/Dashboard`), `:158-162` (`editarApartado`, `generarCierre`, `convertirVenta`, `cancelarApartadoModal`, `abrirCobranzaVenta`, `cierreTab`, `setCierreLock`); `cancelaciones.business.js:96` (`renderApartados/Inventario/Dashboard/Ingresos`).
- **A3 — UI dentro de Business.** `openCancelarVenta` (función de modal) definida en `cancelaciones.business.js:9`.
- **A4 — Storage lateral.** `whatsapp.module.js` (`va_wa_config`), `configuracion.module.js` (`va_sb_url`, `va_sb_key`) saltan `DS`.
- **A5 — Acoplamiento UI↔UI.** 56 llamadas módulo→módulo (`renderX`, `populateSelects`).

---

## 3. Mapa por módulo (dependencias salientes principales)

| Módulo | DS.* directas | Motores que usa | Llama UI de otros módulos | Notas |
|---|---|---|---|---|
| apartados | 72 | OPS, FIN, COM, FOLIOS, IDS, MOTOR, OPO | render*, fillAsesor | Corazón; genera pagarés/venta |
| inventario | 57 | MOTOR (parcial) | render* | Protección no demostrable |
| prospectos | 26 | OPO (best-effort) | filterProsp, openApartadoFlow | 4 rutas de estado |
| parametros | 23 | COM | — | Edita política versionada |
| dashboard | 16 | (ninguno para $) | — | Comisión inline `:99` |
| cotizador | 12 | FIN/FMT (parcial) | — | Corrida financiera |
| cierre | 11 | FOLIOS(peek) | documentos | Formateo manual |
| whatsapp | 10 | — | — | localStorage propio |
| cobranza | 8 | FIN (escribe), pero lee `pagos[]` | — | Doble fuente |
| configuracion | 8 | HEALTH | — | localStorage propio |
| cierre-acciones | 7 | OPS | cierre | — |
| ingresos | 6 | (ninguno para $) | — | Comisión heredada |
| importar | 5 | — | render* | Acepta 'Venta' |
| brokers | 5 | — | — | — |
| reportes | 4 | (lecturas) | — | Debe leer del ledger |
| documentos | 1 | FOLIOS/FMT (parcial) | — | Pagaré usa folio de carátula |
| perfil | 1 | — | — | Escribe estatus directo |
| auth | 1 | HEALTH | populateSelects, navTo | Login lee usuarios directo |
| auditoria | 1 | — | — | Formateo manual |

| Motor (business) | Depende de | Anomalía |
|---|---|---|
| ops-engine (IANNA_OPS, SYNC, HISTORIAL) | DS, ESTADOS, MOTOR + **UI de módulos** | A2 |
| cancelaciones | DS, FIN, FOLIOS + **UI de módulos** | A2, A3 |
| financiero (IANNA_FIN) | DS, MOTOR(audit) | OK |
| comisiones (IANNA_COM) | DS | OK |
| oportunidades (IANNA_OPO) | DS, MOTOR | campo `proyectoId` mal poblado |
| folios / ids / estados / motor / healthcheck | DS | OK |

---

## 4. Correcciones de dependencia previstas en Fase 1.95

- A1 → Etapa 1: Modules → Services → DS.
- A2/A3 → Etapa 2/3: extraer las funciones de UI fuera de `business/`; el motor no llama `renderX` sino que emite eventos que `IANNA_SYNC` traduce a refrescos, sin que business conozca la UI.
- A4 → Etapa 1: absorber llaves laterales en `DS`.
- A5 → Etapa 2: refresco centralizado por `IANNA_SYNC`, no módulo→módulo.
