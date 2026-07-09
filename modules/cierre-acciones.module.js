/* ════════════════════════════════════════════════════════════════
   IANNA CRM — modules/cierre-acciones.module.js
   Acciones del cierre: guardar, contrato firmado→venta, apertura de documentos, expediente en ficha.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
function registrarPagoAdicionalCierre(){
  if(!_cierreData) return null;
  const monto=Number(_cierreData.pagoAdic||0); if(monto<=0) return null;
  return {monto,metodo:$('c-forma-pago')?.value||'Transferencia electrónica',estado:'PENDIENTE_VALIDACION'};
}

// Contrato firmado: guarda el cierre completo, registra los documentos en el expediente y convierte a VENTA
function generarBorradorCierre(){
  if(!_cierreData)return;
  if(!guardarCierreCompleto(true))return;
  const ap=apartadosService.obtener(_cierreData.ap.id);
  const r=IANNA_CIERRE.guardarBorrador(ap.id,{datos_cierre:getClienteData(),doc_snapshot:construirSnapshotCierre(),financial_snapshot:_cierreData.financialSnapshot||null});
  if(!r.ok){toast(r.error,'err');return;} toast('Borrador generado. Pendiente de revisión gerencial.','ok',5000); updateCierreWorkflowUI();
}
function validarContratoCierre(){
  if(!_cierreData)return;
  if(!AUTORIZADOR.puede('validar_contrato')){toast('Solo Gerencia puede validar el contrato','err');return;}
  if(!guardarCierreCompleto(true))return;
  const ap=apartadosService.obtener(_cierreData.ap.id); if(IANNA_CIERRE.estado(ap)==='PREPARACION') IANNA_CIERRE.guardarBorrador(ap.id,{datos_cierre:getClienteData(),doc_snapshot:construirSnapshotCierre(),financial_snapshot:_cierreData.financialSnapshot||null});
  const r=IANNA_CIERRE.validar(ap.id,{pagares:_cierreData.pagares,pago_adicional:_cierreData.pagoAdic,forma_pago_adicional:$('c-forma-pago')?.value||'',doc_snapshot:construirSnapshotCierre(),financial_snapshot:_cierreData.financialSnapshot||null,datos_cierre:getClienteData(),politica_snapshot:IANNA_COM.snapshotDePolitica(ap)});
  if(!r.ok){toast(r.error||r.justificacion,'err');return;}
  if(r.recibo) registrarDocumento(ap.id,'imprimirReciboPagoAdicional','Recibo de Pago Adicional');
  toast('Contrato validado. Folios asignados y paquete disponible para firma.','ok',6000); updateCierreWorkflowUI();
}
function descargarPaqueteFirma(){
  if(!_cierreData)return; const ap=apartadosService.obtener(_cierreData.ap.id);
  if(IANNA_CIERRE.estado(ap)!==IANNA_CIERRE.ESTADOS.VALIDADO){toast('El contrato debe ser validado por Gerencia antes de descargar el paquete para firma','warn',6000);return;}
  descargarCierreZIP();
}
function confirmarFirmaCierre(){
  if(!_cierreData)return; const apId=_cierreData.ap.id;
  const r=IANNA_CIERRE.confirmarFirma(apId); if(!r.ok){toast(r.error||r.justificacion,'err');return;}
  apartadosService.actualizar(apId,{cierre_generado:true});
  convertirVenta(apId); const ap2=apartadosService.obtener(apId);
  if(ap2&&ap2.estatus==='Venta'){toast('Firma confirmada. Venta registrada y cobranza activada.','ok',6000);closeM('m-cierre');}
}
function registrarVentaCierre(){ return confirmarFirmaCierre(); }
function updateCierreWorkflowUI(){
  if(!_cierreData)return; const ap=apartadosService.obtener(_cierreData.ap.id); const st=IANNA_CIERRE.estado(ap);
  const vb=$('btn-validar-contrato'), pb=$('btn-paquete-firma'), fb=$('btn-descargar-cierre');
  if(vb) vb.style.display=AUTORIZADOR.puede('validar_contrato')&&['BORRADOR','CORRECCION'].includes(st)?'':'none';
  if(pb) pb.style.display=st===IANNA_CIERRE.ESTADOS.VALIDADO?'':'none';
  if(fb) fb.style.display=AUTORIZADOR.puede('confirmar_firma')&&st===IANNA_CIERRE.ESTADOS.VALIDADO?'':'none';
}

// Guardar todo el cierre (datos del cliente + snapshot) sin abrir documentos
function guardarCierreCompleto(silencioso){
  if(!_cierreData) return false;
  const nombre=$('c-nombre').value.trim();
  if(!nombre){ toast('Captura el nombre del cliente en la pestaña 1','err'); cierreTab(0); return false; }
  const vf=validarFinanciamientoCierre(); if(!vf.ok){ toast(vf.error,'err',6500); cierreTab(1); return false; }
  calcCierre();
  const snap=construirSnapshotCierre();
  const esVentaCorr=(DS.findOne('apartados',_cierreData.ap.id)?.estatus==='Venta');
  const antesCorr=esVentaCorr?(DS.findOne('apartados',_cierreData.ap.id).datos_cierre||{}):null;
  apartadosService.actualizar(_cierreData.ap.id,{ datos_cierre:getClienteData(), doc_snapshot:snap, financial_snapshot:_cierreData.financialSnapshot||null });
  if(esVentaCorr) IANNA_MOTOR.auditar('apartados',_cierreData.ap.id,'CORRECCION_ADMINISTRATIVA',{datos_cierre:antesCorr},{datos_cierre:getClienteData()},'Guardado sobre venta cerrada (edición habilitada)');
  if(!silencioso) toast('Datos del cierre guardados ✓','ok');
  return true;
}

// Abrir un documento desde la ventana del cierre (guarda datos + snapshot + registra, luego abre)
function abrirDocCierre(fn){
  if(!_cierreData){ toast('Abre un cierre primero','err'); return; }
  const nombre=$('c-nombre').value.trim();
  if(!nombre){ toast('Captura el nombre del cliente en la pestaña 1','err'); cierreTab(0); return; }
  const curp=$('c-curp').value.trim();
  if(fn!=='imprimirReciboApartado'&&!curp){ toast('Captura el CURP del cliente','err'); cierreTab(0); return; }
  if(fn==='imprimirPagares'&&!(_cierreData.pagares&&_cierreData.pagares.length)){ toast('Esta operación no tiene pagarés (contado)','warn'); return; }
  calcCierre();
  const snap=construirSnapshotCierre();
  apartadosService.actualizar(_cierreData.ap.id,{ datos_cierre:getClienteData(), doc_snapshot:snap, financial_snapshot:_cierreData.financialSnapshot||null, cierre_generado:true });
  _cierreData.ap.cierre_generado=true;
  registrarDocumento(_cierreData.ap.id, fn, DOC_LABELS[fn]);
  try{ window[fn](); }catch(e){ console.error('Error generando',fn,e); toast('Error al generar el documento','err'); return; }
  renderApartados();
}

// Sección "📁 Documentos" en la ficha del prospecto
function renderDocsProspecto(pid){
  const cont=$('det-docs-card'); if(!cont) return;
  const aps=DS.find('apartados').filter(a=>a.prospectoId===pid&&(a.documentos||[]).length);
  if(!aps.length){ cont.style.display='none'; cont.innerHTML=''; return; }
  cont.style.display='block';
  cont.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📁 Documentos</div>'+
    aps.map(a=>{
      const docs=(a.documentos||[]).slice().sort((x,y)=>new Date(y.fecha)-new Date(x.fecha));
      return `<div style="margin-bottom:8px">
        <div style="font-size:11px;color:var(--t3);margin-bottom:6px">${ubicacionLote(a.clave_lote)} · ${a.estatus}${a.folio_recibo?' · Folio '+String(a.folio_recibo).padStart(8,'0'):''}</div>
        ${docs.map(d=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd2)">
          <div style="min-width:0"><div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📄 ${d.label}</div><div style="font-size:10.5px;color:var(--t3)">${fD(d.fecha)}</div></div>
          <button class="btn btn-out btn-xs" style="flex-shrink:0" onclick="abrirDocumentoGuardado('${a.id}','${d.fn}','${d.pagoId||''}')">⬇ Abrir</button>
        </div>`).join('')}
      </div>`;
    }).join('');
}

// Cola de documentos pendientes por generar — se abren uno a la vez con clic real
// del usuario, para que el navegador nunca los bloquee como ventanas emergentes.
