/* ════════════════════════════════════════════════════════════════
   IANNA CRM — services/dataStore.service.js
   DataStore (DS): capa única de acceso a datos (localStorage). Los módulos NO tocan localStorage directamente.
   Fase 1 (refactor): código movido intacto desde el archivo original.
   ════════════════════════════════════════════════════════════════ */
// ================================================================
// DATA STORE — Preparado para Supabase (reemplaza métodos con fetch)
// ================================================================
const DS_KEY = 'va_crm_v5_1782782740'; // v5: cache-bust forzado
const DS = {
  _db: null,
  get db() { if (!this._db) this._db = this._load(); return this._db; },
  _load() { try { const d=localStorage.getItem(DS_KEY); return d?JSON.parse(d):this._seed(); } catch(e){ return this._seed(); } },
  _save(db) { try { localStorage.setItem(DS_KEY,JSON.stringify(db)); } catch(e){} return db; },
  _seed() {
    const db = {
      usuarios:[
        {id:'u0',id_publico:'GER-000001',nombre:'Administrador PALIZ',correo:'admin@va.com',pass:'admin2026',rol:'administrador',telefono:'',activo:true,fechaAlta:new Date().toISOString(),avatar:''},
        {id:'u1',id_publico:'GER-000002',nombre:'José Rafael Patrón Osuna',correo:'gerente@va.com',pass:'1234',rol:'gerente',telefono:'667 426 5145',activo:true,fechaAlta:new Date().toISOString(),avatar:''},
        {id:'u2',id_publico:'ASE-000001',nombre:'Hernny Guerrero',correo:'asesor@va.com',pass:'1234',rol:'asesor',telefono:'',activo:true,fechaAlta:new Date().toISOString(),avatar:''},
      ],
      prospectos:[],seguimientos:[],recordatorios:[],
      inventario:[],
      apartados:[],
      params:{...MASTER_PARAMS},
      modelos:JSON.parse(JSON.stringify(MASTER_MOD)),
      brokers:[],
      beneficiarios_externos:[],
      comisiones_nomina:[],
      cortes_comision:[],
      auditoria:[],
      cotizaciones:[],
      conversaciones:[],
    };
    // Fase 1.96: bootstrap limpio. Inventario y datos transaccionales inician en cero.
    localStorage.setItem(DS_KEY,JSON.stringify(db));
    return db;
  },
  find(col,filter={}) { let d=[...(this.db[col]||[])]; Object.entries(filter).forEach(([k,v])=>{ if(v!==undefined&&v!=='') d=d.filter(r=>r[k]===v); }); return d; },
  findOne(col,id) { return (this.db[col]||[]).find(r=>r.id===id); },
  create(col,data) { data.id=data.id||uid(); if(data.schema_version===undefined) data.schema_version='1.96'; if(!this.db[col]) this.db[col]=[]; this.db[col].unshift(data); this._save(this.db); return data; },
  update(col,id,patch) { const i=(this.db[col]||[]).findIndex(r=>r.id===id); if(i<0) return null; this.db[col][i]={...this.db[col][i],...patch}; this._save(this.db); return this.db[col][i]; },
  delete(col,id) { if(!this.db[col]) return; this.db[col]=this.db[col].filter(r=>r.id!==id); this._save(this.db); },
  /* ── Fase 1.95: configuración extendida DENTRO de la puerta única ──
     Absorbe llaves que vivían sueltas en localStorage (va_wa_config, va_sb_url, va_sb_key). */
  getExt(clave,def) { const e=this.db._ext||{}; return (clave in e)?e[clave]:(def!==undefined?def:null); },
  setExt(clave,val) { if(!this.db._ext) this.db._ext={}; this.db._ext[clave]=val; this._save(this.db); return val; },
  migrarLlavesLegadas() {
    try{
      if(this.db._ext && this.db._ext.__migrado_v195) return;
      if(!this.db._ext) this.db._ext={};
      const mapa={ 'va_wa_config':(v)=>{try{return JSON.parse(v);}catch(e){return v;}}, 'va_sb_url':(v)=>v, 'va_sb_key':(v)=>v };
      Object.entries(mapa).forEach(([k,parse])=>{
        const v=localStorage.getItem(k);
        if(v!==null && this.db._ext[k]===undefined){ this.db._ext[k]=parse(v); localStorage.removeItem(k); }
      });
      this.db._ext.__migrado_v195=true; this._save(this.db);
    }catch(e){ console.error('migrarLlavesLegadas',e); }
  },
  /* ── 1.97.6 CLEAN: reset de datos para pruebas end-to-end ──
     Conserva parámetros, modelos, políticas e integraciones; elimina únicamente
     datos operativos/transaccionales y deja tres usuarios autorizados.
     Se ejecuta una sola vez por navegador al desplegar este paquete. */
  aplicarResetPruebas1976Clean() {
    const RESET_VERSION='1.97.6-clean-20260915';
    if(this.db.reset_pruebas_version===RESET_VERSION) return false;

    // Usuarios únicos acordados para la ronda limpia de pruebas.
    this.db.usuarios=[
      {id:'u0',id_publico:'GER-000001',nombre:'Administrador PALIZ',correo:'admin@va.com',pass:'admin2026',rol:'administrador',telefono:'',activo:true,fechaAlta:new Date().toISOString(),avatar:''},
      {id:'u1',id_publico:'GER-000002',nombre:'José Rafael Patrón Osuna',correo:'gerente@va.com',pass:'1234',rol:'gerente',telefono:'667 426 5145',activo:true,fechaAlta:new Date().toISOString(),avatar:''},
      {id:'u2',id_publico:'ASE-000001',nombre:'Hernny Guerrero',correo:'asesor@va.com',pass:'1234',rol:'asesor',telefono:'',activo:true,fechaAlta:new Date().toISOString(),avatar:''},
    ];

    // Datos operativos y de prueba: todo vuelve a cero.
    const colecciones=[
      'inventario','prospectos','seguimientos','recordatorios','apartados',
      'auditoria','cotizaciones','conversaciones','ledger','movimientos_financieros',
      'comisiones','comisiones_nomina','cortes_comision','beneficiarios_externos',
      'cancelaciones','oportunidades','operaciones','documentos','recibos','pagares',
      'historial_operaciones','folios_registro','brokers'
    ];
    colecciones.forEach(k=>{ this.db[k]=[]; });

    // Reinicio de consecutivos transaccionales. GER/ASE reflejan los tres usuarios.
    this.db.id_seq={
      PRO:0,CLI:0,LOT:0,VEN:0,APT:0,PAG:0,REC:0,CON:0,CAN:0,COM:0,COR:0,BEN:0,AUD:0,OPE:0,
      GER:2,ASE:1,BRK:0
    };
    this.db.folio_seq=0;

    // Elimina respaldos de datos de pruebas antiguas, sin tocar configuración vigente.
    delete this.db.backup_pre_196;

    // Mantiene las migraciones funcionales/configuraciones existentes; evita que la
    // migración de IDs vuelva a asignar IDs a los tres usuarios y genere ruido.
    this.db.migracion_ids_v1={fecha:new Date().toISOString(),asignados:0,motivo:'Reset limpio 1.97.6'};
    this.db.migracion_196_identidad={fecha:new Date().toISOString(),clientes:0,lotes:0,motivo:'Reset limpio 1.97.6'};
    this.db.reset_pruebas_version=RESET_VERSION;
    this.db.reset_pruebas_pendiente_limpieza_auditoria=true;
    this._save(this.db);
    return true;
  },
  finalizarResetPruebas1976Clean() {
    if(!this.db.reset_pruebas_pendiente_limpieza_auditoria) return false;
    // Algunas migraciones de compatibilidad pueden auditar durante el primer arranque.
    // La ronda solicitada debe iniciar con Auditoría = 0.
    this.db.auditoria=[];
    delete this.db.reset_pruebas_pendiente_limpieza_auditoria;
    this._save(this.db);
    return true;
  },

  aplicarBootstrapLimpio196() {
    if(this.db.bootstrap_limpio_196) return false;
    const antes={
      inventario:(this.db.inventario||[]).length, prospectos:(this.db.prospectos||[]).length,
      apartados:(this.db.apartados||[]).length, seguimientos:(this.db.seguimientos||[]).length,
      recordatorios:(this.db.recordatorios||[]).length, auditoria:(this.db.auditoria||[]).length,
      cotizaciones:(this.db.cotizaciones||[]).length, conversaciones:(this.db.conversaciones||[]).length,
      ledger:(this.db.ledger||[]).length, comisiones:(this.db.comisiones||[]).length,
      cancelaciones:(this.db.cancelaciones||[]).length,
    };
    // Conserva configuración maestra, usuarios, roles, modelos, brokers e integraciones.
    ['inventario','prospectos','seguimientos','recordatorios','apartados','auditoria','cotizaciones','conversaciones','ledger','movimientos_financieros','comisiones','comisiones_nomina','cortes_comision','beneficiarios_externos','cancelaciones','oportunidades','operaciones','documentos','recibos','pagares'].forEach(k=>{ this.db[k]=[]; });
    // Reinicia únicamente secuencias transaccionales; conserva ASE/GER/BRK ya asignados a maestros.
    if(!this.db.id_seq) this.db.id_seq={};
    ['PRO','CLI','LOT','VEN','APT','PAG','REC','CON','CAN','COM','COR','BEN','AUD','OPE'].forEach(k=>{ this.db.id_seq[k]=0; });
    delete this.db.migracion_ids_v1;
    delete this.db.migracion_196_identidad;
    delete this.db.migracion_196_producto;
    this.db.bootstrap_limpio_196={fecha:new Date().toISOString(),schema_version:'1.96',eliminados:antes};
    this._save(this.db);
    return true;
  },
  getParams() { return this.db.params||{...MASTER_PARAMS}; },
  saveParams(p) { this.db.params={...this.db.params,...p}; this._save(this.db); },
  getModelos() { return this.db.modelos||JSON.parse(JSON.stringify(MASTER_MOD)); },
  audit(tabla,registroId,accion,antes,despues){
    if(!this.db.auditoria) this.db.auditoria=[];
    this.db.auditoria.unshift({id:'_'+Math.random().toString(36).substr(2,9),tabla,registroId:String(registroId||''),accion,usuarioId:typeof CU!=='undefined'&&CU?CU.id:'system',usuarioNombre:typeof CU!=='undefined'&&CU?CU.nombre:'system',antes:JSON.stringify(antes||{}),despues:JSON.stringify(despues||{}),fecha:new Date().toISOString()});
    if(this.db.auditoria.length>2000) this.db.auditoria=this.db.auditoria.slice(0,2000);
    this._save(this.db);
  },
};

