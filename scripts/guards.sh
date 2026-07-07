#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
# IANNA CRM — scripts/guards.sh
# GUARDAS ARQUITECTÓNICAS (Fase 1.95 · Bloque 12)
# ────────────────────────────────────────────────────────────────
# Verifican en cada build que la arquitectura estabilizada no se
# rompa. Cualquier violación = exit 1 (falla el pipeline).
# Uso:  bash scripts/guards.sh   (desde la raíz del repo)
# ════════════════════════════════════════════════════════════════
set -u
cd "$(dirname "$0")/.."
FALLAS=0

check() { # check "descripción" "patrón" rutas...
  local desc="$1"; local pat="$2"; shift 2
  local hits
  hits=$(grep -rnE "$pat" "$@" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    echo "❌ GUARDA VIOLADA: $desc"
    echo "$hits" | head -10
    FALLAS=$((FALLAS+1))
  else
    echo "✅ $desc"
  fi
}

echo "═══ GUARDAS ARQUITECTÓNICAS IANNA 1.95 ═══"

# G1 · Puerta única de datos: los módulos no escriben en DS directamente
check "G1 Módulos sin DS.create/update/delete/saveParams (escriben vía Services)" \
      "DS\.(create|update|delete|saveParams)\(" modules/

# G2 · Sin mutación directa del estado (DS.db solo se lee; DS._save solo en la capa de datos)
check "G2 Módulos sin DS._save ni mutación directa de DS.db" \
      "DS\._save|DS\.db\.[a-z_]+ *=[^=]|DS\.db\.[a-z_]+\.push\(|DS\.db\.[a-z_]+\.splice\(|DS\.db\.[a-z_]+\[[a-zA-Z_]+\] *=" modules/ components/

# G3 · localStorage SOLO dentro del DataStore
check "G3 localStorage solo en services/dataStore.service.js" \
      "localStorage\.(get|set|remove)Item" modules/ components/ business/ utils/ config/

# G4 · Autorización semántica: cero comparaciones de rol dispersas
check "G4 Cero CU.rol===/!== fuera del Autorizador" \
      "CU\.rol[!=]==" modules/ components/ services/ utils/

# G5 · Comisiones SOLO del Motor de Comisiones
check "G5 Cero fórmula de comisión fuera de IANNA_COM (pct de comisión inline)" \
      "comision_(asesor|gerente|asesor_broker)_pct" modules/ components/

# G6 · Dinero SOLO del ledger: cero sumas de saldo desde ap.pagos[]
check "G6 Cero suma de montos desde pagos[] en módulos (el saldo sale de IANNA_FIN)" \
      "pagos(\.filter\([^)]*\))?\.reduce\(\(?s" modules/

# G7 · Formato SOLO del Motor de Formatos (dinero)
check "G7 Cero formateo manual de dinero en módulos (toLocaleString es-MX / '\$'+)" \
      "toLocaleString\('es-MX'\)|'\\\$' *\+" modules/ components/

# G8 · La Máquina de Estados es la única autoridad: nadie escribe estatus operacionales
check "G8 Cero asignación literal de estatus 'Venta' a prospectos fuera del motor" \
      "prospectosService\.(actualizar|crear)\([^)]*estatus: *'Venta'" modules/ business/pipeline.business.js

# G9 · El motor de operaciones no conoce la UI
check "G9 ops-engine sin referencias a flujos de UI (editarApartado/generarCierre/…)" \
      "editarApartado\(|generarCierre\(|convertirVenta\(|abrirCobranzaVenta\(|cancelarApartadoModal\(|setCierreLock\(" business/ops-engine.business.js

echo "═════════════════════════════════════════"
if [ "$FALLAS" -gt 0 ]; then
  echo "RESULTADO: $FALLAS guarda(s) violada(s) — BUILD RECHAZADO"
  exit 1
fi
echo "RESULTADO: todas las guardas en verde ✓"
