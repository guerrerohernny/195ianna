/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/ingresos.module.js
   Módulo Ingresos: comisiones de asesores (2%/1%) y gerente (0.5%), cobro en 2 partes.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
function renderIngresos(){
  const period = $('ing-periodo')?.value||'todo';
  const filtroAsesor = $('ing-asesor')?.value||'';
  const isAdmin = AUTORIZADOR.puede('ver_comisiones_equipo');
  const P = getP();

  // Get all ventas (apartados with estatus='Venta')
  let ventas = DS.find('apartados').filter(a=>a.estatus==='Venta');
  if(!isAdmin) ventas = ventas.filter(v=>v.asesor===CU.id);
  else if(filtroAsesor) ventas = ventas.filter(v=>v.asesor===filtroAsesor);

  // Filter by period
  const now = new Date();
  if(period==='mes') ventas = ventas.filter(v=>{
    const d = new Date(v.fecha_venta||v.fecha_apartado||'');
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  if(period==='año') ventas = ventas.filter(v=>{
    const d = new Date(v.fecha_venta||v.fecha_apartado||'');
    return d.getFullYear()===now.getFullYear();
  });

  // ── 1.95 (Etapa 4): la comisión SOLO sale del Motor de Comisiones (política versionada,
  //    base comisionable configurable, snapshot congelado en la Operación). Estos adaptadores
  //    únicamente traducen el desglose del motor al formato de esta vista. ──
  const _adaptaCom = (c, venta, quien) => {
    const mapa=venta.comision_partes_cobradas||{};
    const legacyPrefix=quien==='ger'?'comision_ger_parte':'comision_parte';
    const partes=(c.partes||[]).map((p,i)=>{
      const key=p.parte||('parte_'+(i+1));
      const legacy=i<2 ? !!venta[legacyPrefix+(i+1)+'_cobrada'] : false;
      const cobrada=mapa[quien+':'+key]===true || legacy;
      return {...p,key,cobrada};
    });
    const totalCobrado=partes.filter(x=>x.cobrada).reduce((a,x)=>a+Number(x.monto||0),0);
    return {total:c.total,partes,totalCobrado,isBroker:!!c.es_broker,pct:c.porcentaje,politica_version:c.politica_version,base:c.base};
  };
  const calcComisionAsesor  = (v) => _adaptaCom(IANNA_COM.comisionAsesor(v),v,'asesor');
  const calcComisionGerente = (v) => _adaptaCom(IANNA_COM.comisionGerente(v),v,'ger');
  // El gerente/admin ve y cobra SU comisión (0.5%); el asesor la suya (2%/1%)
  const calcComision = isAdmin ? calcComisionGerente : calcComisionAsesor;

  const ventasData = ventas.map(v=>{
    const l = getLote(v.clave_lote)||{};
    const m = getMod(v.modelo_id)||{};
    const p = DS.findOne('prospectos',v.prospectoId)||{};
    const com = calcComision(v);
    return {...v, l, m, p, com};
  });

  // Totals
  const valorComercialVenta = (v) => Number(v.financial_snapshot?.valor_total_vivienda ?? v.valor_operacion ?? IANNA_VALOR?.valorTotalVivienda?.(v) ?? 0);
  const totalFacturado = ventasData.reduce((s,v)=>s+valorComercialVenta(v),0);
  const totalGanado = ventasData.reduce((s,v)=>s+v.com.total,0);
  const totalCobrado = ventasData.reduce((s,v)=>s+v.com.totalCobrado,0);
  const totalPorCobrar = totalGanado - totalCobrado;
  // Total de comisiones de los asesores (informativo para el gerente)
  const totalComAsesores = isAdmin ? ventasData.reduce((s,v)=>s+calcComisionAsesor(v).total,0) : 0;

  // ── RENDER ─────────────────────────────────────────────────────
  const container = $('ing-cont');
  if(!container) return;
  container.innerHTML = '';

  // Header cards
  const headerHtml = `
    <div style="display:grid;grid-template-columns:${isAdmin?'1fr 1fr 1fr 1fr':'1fr 1fr 1fr'};gap:14px;margin-bottom:20px">
      <div class="card" style="background:linear-gradient(135deg,#1E3D0F,#2D5A1B);color:#fff;padding:18px 20px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;opacity:.8;margin-bottom:6px">${isAdmin?'Facturación del equipo':'Has vendido'}</div>
        <div style="font-size:26px;font-weight:800">${mxn(totalFacturado)}</div>
        <div style="font-size:11px;opacity:.7;margin-top:4px">${ventas.length} operación(es)</div>
      </div>
      <div class="card" style="background:linear-gradient(135deg,#C9963C,#d4a84b);color:#fff;padding:18px 20px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;opacity:.8;margin-bottom:6px">Has ganado ${isAdmin?'(0.5% de todas las ventas)':''}</div>
        <div style="font-size:26px;font-weight:800">${mxn(totalGanado)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;font-size:11px">
          <div style="background:rgba(255,255,255,.2);border-radius:4px;padding:4px 6px"><div style="opacity:.8">Ya cobrado</div><div style="font-weight:700">${mxn(totalCobrado)}</div></div>
          <div style="background:rgba(255,255,255,.2);border-radius:4px;padding:4px 6px"><div style="opacity:.8">Por cobrar</div><div style="font-weight:700">${mxn(totalPorCobrar)}</div></div>
        </div>
      </div>
      <div class="card" style="padding:18px 20px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:10px">Progreso de cobro</div>
        <div style="background:var(--s2);border-radius:20px;height:12px;overflow:hidden;margin-bottom:8px">
          <div style="background:linear-gradient(90deg,#2D5A1B,#C9963C);height:100%;border-radius:20px;width:${totalGanado>0?Math.round(totalCobrado/totalGanado*100):0}%;transition:width .5s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span style="color:#2D5A1B;font-weight:600">${totalGanado>0?Math.round(totalCobrado/totalGanado*100):0}% cobrado</span>
          <span style="color:var(--t3)">${mxn(totalPorCobrar)} pendiente</span>
        </div>
      </div>
      ${isAdmin?`<div class="card" style="padding:18px 20px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:10px">Comisiones de asesores</div>
        <div style="font-size:22px;font-weight:800;color:var(--navy)">${mxn(totalComAsesores)}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:4px">Según política vigente de cada operación</div>
      </div>`:''}
    </div>`;

  // Table
  const tableSubtitle = isAdmin
    ? 'Tu comisión según política versionada de cada operación'
    : 'Comisión según política versionada y distribución configurada';
  const quien = isAdmin ? 'ger' : 'asesor';
  const tableHtml = ventasData.length===0 ? `<div class="empty"><div class="empty-i">💰</div><p>Sin ventas en el período seleccionado</p></div>` : `
    <div class="card" style="overflow:hidden;padding:0">
      <div style="padding:14px 18px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between">
        <div style="font-weight:700;font-size:14px">Detalle de comisiones${isAdmin?' — Gerente':''}</div>
        <div style="font-size:12px;color:var(--t3)">${tableSubtitle}</div>
      </div>
      <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="background:var(--s2)">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--t3);font-weight:700;text-transform:uppercase">Cliente</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--t3);font-weight:700;text-transform:uppercase">Lote</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--t3);font-weight:700;text-transform:uppercase">Modelo</th>
          ${isAdmin?'<th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--t3);font-weight:700;text-transform:uppercase">Asesor</th>':''}
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:var(--t3);font-weight:700;text-transform:uppercase">${isAdmin?'Mi comisión':'Comisión'}</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--t3);font-weight:700;text-transform:uppercase">Distribución y cobro</th>
        </tr></thead>
        <tbody>
        ${ventasData.map(v=>`<tr style="border-bottom:1px solid var(--s2)">
          <td style="padding:10px 12px">
            <div style="font-weight:600">${v.p.nombre||'—'}</div>
            <div style="font-size:10.5px;color:var(--t3)">${v.fecha_venta?new Date(v.fecha_venta).toLocaleDateString('es-MX'):'—'}${v.com.isBroker?' · <span style="color:#f97316;font-size:10px">Broker</span>':''}</div>
          </td>
          <td style="padding:10px 12px">${ubicacionLote(v.clave_lote)||'—'}</td>
          <td style="padding:10px 12px">${v.m.nombre||'—'}</td>
          ${isAdmin?`<td style="padding:10px 12px;font-size:12px">${getUser(v.asesor).nombre.split(' ')[0]}</td>`:''}
          <td style="padding:10px 12px;text-align:right">
            <div style="font-weight:700">${mxn(v.com.total)}</div>
            <div style="font-size:10px;color:var(--t3)">${(v.com.pct*100).toFixed(v.com.pct<0.01?1:0)}% de ${mxn(v.com.base||0)}</div>
          </td>
          <td style="padding:10px 12px">
            <div style="display:flex;flex-direction:column;gap:5px">
              ${v.com.partes.map((pt,idx)=>`<div style="display:grid;grid-template-columns:1.2fr .55fr auto;gap:6px;align-items:center"><span style="font-size:11px">${pt.nombre||pt.parte}</span><b style="font-size:11px">${mxn(pt.monto)}</b>${pt.cobrada?'<span class="badge" style="background:#f0fdf4;color:#166534">✓ Cobrado</span>':`<button class="btn btn-gold btn-xs" onclick="cobrarComisionParte('${v.id}','${pt.key}','${quien}')">Cobrar</button>`}</div>`).join('')}
            </div>
          </td>
        </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>`;

  // Desglose por asesor (solo gerente/admin) — comisión correcta por venta (2% directa / 1% broker)
  const equipoHtml = isAdmin ? (() => {
    const asesores = DS.find('usuarios',{rol:'asesor',activo:true});
    const rows = asesores.map(a=>{
      const ventasA = DS.find('apartados').filter(v=>v.estatus==='Venta'&&v.asesor===a.id);
      const facturadoA = ventasA.reduce((s,v)=>s+valorComercialVenta(v),0);
      const comA = ventasA.reduce((s,v)=>s+calcComisionAsesor(v).total,0);
      return {a, facturadoA, comA, n:ventasA.length};
    }).filter(r=>r.facturadoA>0).sort((a,b)=>b.facturadoA-a.facturadoA);
    if(!rows.length) return '';
    return `<div class="card" style="margin-top:14px">
      <div style="font-weight:700;font-size:14px;margin-bottom:12px">Facturación por asesor</div>
      ${rows.map((r,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--s2)">
        <div style="width:24px;height:24px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${i+1}</div>
        <div style="flex:1"><div style="font-weight:600">${r.a.nombre}</div><div style="font-size:11px;color:var(--t3)">${r.n} venta(s)</div></div>
        <div style="font-weight:700;color:var(--navy)">${mxn(r.facturadoA)}</div>
        <div style="font-size:11.5px;color:#C9963C">${mxn(r.comA)} com.</div>
      </div>`).join('')}
    </div>`;
  })() : '';

  container.innerHTML = headerHtml + tableHtml + equipoHtml;
}

function cobrarComisionParte(ventaId, parteKey, quien){
  const ap=apartadosService.obtener(ventaId); if(!ap){toast('Venta no encontrada','err');return;}
  const motor=quien==='ger'?IANNA_COM.comisionGerente(ap):IANNA_COM.comisionAsesor(ap);
  const pt=(motor.partes||[]).find(x=>(x.parte||'')===parteKey); if(!pt){toast('Parte de comisión no encontrada','err');return;}
  if(!confirm(`¿Confirmar cobro de ${pt.nombre||pt.parte} por ${mxn(pt.monto)}?`)) return;
  const mapa={...(ap.comision_partes_cobradas||{})}; mapa[quien+':'+parteKey]=true;
  apartadosService.actualizar(ventaId,{comision_partes_cobradas:mapa,comision_ultima_actualizacion:new Date().toISOString()});
  try{IANNA_MOTOR.auditar('comisiones',ventaId,'COBRAR_PARTE_COMISION',{}, {quien,parte:parteKey,monto:pt.monto},'Cobro de parte de comisión');}catch(e){}
  renderIngresos(); toast('Parte de comisión marcada como cobrada ✓','ok');
}
// Compatibilidad con botones históricos
function cobrarComision(ventaId, parte, quien){
  const ap=apartadosService.obtener(ventaId); const motor=quien==='ger'?IANNA_COM.comisionGerente(ap):IANNA_COM.comisionAsesor(ap);
  const pt=(motor.partes||[])[Math.max(0,Number(parte)-1)]; if(pt) cobrarComisionParte(ventaId,pt.parte,quien);
}

