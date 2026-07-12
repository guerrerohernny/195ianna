/* IANNA CRM 1.97.1 — Control de Operaciones */
function renderControlOperaciones(){
  const q=String($('co-search')?.value||'').trim().toLowerCase();
  const filtro=$('co-tipo')?.value||''; const mostrarTecnicos=!!$('co-tecnico')?.checked; const rows=[];
  const prosp=Object.fromEntries((DS.find('prospectos')||[]).map(p=>[p.id,p]));
  const aps=DS.find('apartados')||[];
  aps.forEach(a=>{
    const p=prosp[a.prospectoId]||{}; const ub=ubicacionLote(a.clave_lote)||'';
    const id=a.id_publico||a.id_apartado||a.id||'';
    rows.push({fecha:a.fecha_apartado||a.fecha_venta,tipoGrupo:'operacion',id,tipo:a.estatus==='Venta'?'Venta / Operación':'Apartado / Operación',cliente:p.nombre||'',ubicacion:ub,estado:a.estatus||'',importe:Number(a.valor_operacion||a.financial_snapshot?.valor_total_vivienda||0),apId:a.id,accion:'operacion'});
    (a.documentos||[]).forEach(d=>rows.push({fecha:d.fecha,tipoGrupo:'documento',id:d.id_publico||d.folio||d.documento_id||d.label||'Documento',tipo:d.label||'Documento',cliente:p.nombre||'',ubicacion:ub,estado:d.estado||'Emitido',importe:Number(d.monto||0),apId:a.id,fn:d.fn,pagoId:d.pagoId||'',accion:'documento'}));
    (a.pagares_congelados||[]).forEach(pg=>rows.push({fecha:pg.fecha_emision||pg.fecha,tipoGrupo:'documento',id:pg.id_publico||pg.folio||('PAG-'+String(pg.n||'').padStart(6,'0')),tipo:'Pagaré',cliente:p.nombre||'',ubicacion:ub,estado:pg.estado||'Emitido',importe:Number(pg.monto||0),apId:a.id,fn:'imprimirPagares',accion:'documento'}));
  });
  (DS.db.ledger||[]).forEach(m=>{const a=aps.find(x=>x.id===m.operacionId)||{};const p=prosp[m.personaId||a.prospectoId]||{}; rows.push({fecha:m.fecha,tipoGrupo:'financiero',id:m.id_publico||m.id||'',tipo:m.tipo||'Movimiento',cliente:p.nombre||'',ubicacion:ubicacionLote(a.clave_lote)||'',estado:m.estado||'Registrado',importe:Number(m.monto||0),apId:a.id,accion:'financiero'});});
  if(mostrarTecnicos || filtro==='auditoria'){
    (DS.find('auditoria')||DS.db.auditoria||[]).forEach(a=>rows.push({fecha:a.fecha,tipoGrupo:'auditoria',id:a.id_publico||a.id||'',tipo:a.accion||'Auditoría',cliente:'',ubicacion:'',estado:'Trazado',importe:0,accion:'tecnico'}));
  }
  const TIPOS_NEGOCIO=['Apartado / Operación','Venta / Operación','Pagaré','Recibo de Apartado','Recibo de Pago Adicional','Contrato','Movimiento','ingreso','pago','comision_asesor','comision_gerente','comision_broker'];
  const out=rows.filter(r=>{
    if(!mostrarTecnicos && !filtro && r.tipoGrupo==='auditoria') return false;
    if(!mostrarTecnicos && !filtro && r.id && String(r.id).startsWith('_')) return false;
    if(!mostrarTecnicos && !filtro && r.tipoGrupo==='operacion' && String(r.tipo||'').includes('Transición')) return false;
    return (!filtro||r.tipoGrupo===filtro)&&(!q||Object.values(r).some(v=>String(v??'').toLowerCase().includes(q)));
  }).sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0));
  const tb=$('co-tbody'); if(!tb)return; tb.innerHTML=out.length?out.slice(0,500).map(r=>{
    const openDoc=(r.accion==='documento'&&r.apId&&r.fn)?`<button class="btn btn-out btn-xs" onclick="abrirDocumentoGuardado('${r.apId}','${r.fn}','${r.pagoId||''}')">Abrir</button>`:'';
    const goExp=r.apId?`<button class="btn btn-navy btn-xs" onclick="abrirOperaciones('${r.apId}')">Expediente</button>`:'';
    return `<tr><td>${r.fecha?fD(r.fecha):'—'}</td><td style="font-family:monospace;font-weight:700">${r.id||'—'}</td><td>${r.tipo}</td><td>${r.cliente||'—'}</td><td>${r.ubicacion||'—'}</td><td>${r.estado||'—'}</td><td style="text-align:right">${r.importe?IANNA_FMT.MXN(r.importe):'—'}</td><td style="white-space:nowrap;display:flex;gap:4px">${openDoc}${goExp}</td></tr>`;
  }).join(''):`<tr><td colspan="8"><div class="empty"><div class="empty-i">🧾</div><p>Sin movimientos para los filtros seleccionados.</p></div></td></tr>`;
}
