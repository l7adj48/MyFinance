/* IndexedDB متعدد المخازن. قاعدة حرجة: المعاملة تُغلق نفسها حين لا تبقى طلبات معلّقة،
   وأي await على غير طلب IDB داخلها يقتلها ويترك نصف عملية.
   لذلك: كل الحساب قبل فتح المعاملة، وداخلها put/add فقط، وأول طلب يُصدر متزامناً.
   رسالة النجاح لا تُعرض إلا بعد oncomplete. */
export const DB_NAME="mizanati-db",DB_VERSION=3;
export const STORES={
 transactions:{keyPath:"id",indexes:[["occurredOn","occurredOn"],["type","type"],["status","status"],["opId","opId",{unique:true}],["goalId","goalId"]]},
 journalEntries:{keyPath:"id",indexes:[["txId","txId"],["occurredOn","occurredOn"],["kind","kind"]]},
 journalLines:{keyPath:"id",indexes:[["entryId","entryId"],["txId","txId"],["account","account"],["occurredOn","occurredOn"],["categoryId","categoryId"]]},
 goals:{keyPath:"id",indexes:[["status","status"]]},
 savingsEvents:{keyPath:"id",indexes:[["goalId","goalId"],["occurredOn","occurredOn"],["opId","opId",{unique:true}],["kind","kind"]]},
 budgets:{keyPath:"id",indexes:[["periodStart","periodStart"],["categoryId","categoryId"]]},
 auditLog:{keyPath:"id",indexes:[["at","at"],["entityId","entityId"],["action","action"]]},
 meta:{keyPath:"key"}};
export class DBError extends Error{constructor(c,m,cause){super(m);this.name="DBError";this.code=c;this.cause=cause}}
let _db=null,_opening=null;
export function openDatabase(name=DB_NAME,version=DB_VERSION){
 if(_db&&_db.name===name)return Promise.resolve(_db);
 if(_opening)return _opening;
 _opening=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(new DBError("NO_INDEXEDDB","المتصفح لا يدعم IndexedDB"));return}
  const r=indexedDB.open(name,version);
  r.onupgradeneeded=()=>{const db=r.result,tx=r.transaction;
   for(const[n,def]of Object.entries(STORES)){
    const st=db.objectStoreNames.contains(n)?tx.objectStore(n):db.createObjectStore(n,{keyPath:def.keyPath});
    for(const[i,kp,o]of(def.indexes||[]))if(!st.indexNames.contains(i))st.createIndex(i,kp,o||{unique:false})}};
  r.onsuccess=()=>{const db=r.result;_db=db;_opening=null;
   db.onversionchange=()=>{db.close();_db=null;globalThis.dispatchEvent?.(new CustomEvent("mizanati:db-blocked"))};
   db.onclose=()=>{_db=null};resolve(db)};
  r.onerror=()=>{_opening=null;reject(new DBError("OPEN_FAILED","فشل فتح قاعدة البيانات",r.error))};
  r.onblocked=()=>{_opening=null;reject(new DBError("OPEN_BLOCKED","تبويب آخر يمنع ترقية القاعدة. أغلق التبويبات الأخرى."))}});
 return _opening}
export function closeDatabase(){if(_db){_db.close();_db=null}_opening=null}
const rq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
export async function writeAtomic(storeNames,fn){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  let tx;
  try{tx=db.transaction(storeNames,"readwrite")}
  catch(e){reject(new DBError("TX_FAILED","تعذّر فتح المعاملة",e));return}
  let out;
  const api={put:(s,v)=>rq(tx.objectStore(s).put(v)),add:(s,v)=>rq(tx.objectStore(s).add(v)),
   get:(s,k)=>rq(tx.objectStore(s).get(k)),del:(s,k)=>rq(tx.objectStore(s).delete(k)),
   clear:s=>rq(tx.objectStore(s).clear()),index:(s,i,k)=>rq(tx.objectStore(s).index(i).getAll(k))};
  tx.oncomplete=()=>resolve(out);
  tx.onerror=()=>reject(new DBError("TX_ERROR","فشلت المعاملة — لم يُحفظ شيء",tx.error));
  tx.onabort=()=>reject(new DBError("TX_ABORT","أُجهضت المعاملة — لم يُحفظ شيء",tx.error));
  let p;
  try{p=fn(api)}catch(e){try{tx.abort()}catch{}reject(e);return}
  Promise.resolve(p).then(r=>{out=r},e=>{try{tx.abort()}catch{}reject(e)})})}
export async function persistOperation(b){
 const{transaction,entry,lines,savingsEvents=[],audit=[],goalUpdates=[]}=b;
 return writeAtomic(["transactions","journalEntries","journalLines","auditLog","savingsEvents","goals"],async api=>{
  const ex=await api.get("transactions",transaction.id);
  if(ex)return{duplicate:true,txId:ex.id};
  const byOp=await api.index("transactions","opId",transaction.opId);
  if(byOp&&byOp.length)return{duplicate:true,txId:byOp[0].id};
  await api.add("transactions",transaction);await api.add("journalEntries",entry);
  for(const l of lines)await api.add("journalLines",l);
  for(const e of savingsEvents)await api.add("savingsEvents",e);
  for(const g of goalUpdates)await api.put("goals",g);
  for(const a of audit)await api.add("auditLog",a);
  return{duplicate:false,txId:transaction.id}})}
export async function loadLedger(){
 const db=await openDatabase();
 const names=["transactions","journalEntries","journalLines","goals","savingsEvents","budgets","auditLog","meta"];
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(names,"readonly"),o={};
  for(const n of names){const r=tx.objectStore(n).getAll();r.onsuccess=()=>{o[n]=r.result}}
  tx.oncomplete=()=>resolve({meta:(o.meta||[]).reduce((a,m)=>{a[m.key]=m.value;return a},{}),
   transactions:o.transactions||[],entries:o.journalEntries||[],lines:o.journalLines||[],
   goals:o.goals||[],savingsEvents:o.savingsEvents||[],budgets:o.budgets||[],audit:o.auditLog||[]});
  tx.onerror=()=>reject(new DBError("LOAD_FAILED","فشل تحميل الدفتر",tx.error))})}
export async function replaceLedger(lg){
 const names=["transactions","journalEntries","journalLines","goals","savingsEvents","budgets","auditLog","meta"];
 return writeAtomic(names,async api=>{
  for(const n of names)await api.clear(n);
  for(const t of lg.transactions)await api.add("transactions",t);
  for(const e of lg.entries)await api.add("journalEntries",e);
  for(const l of lg.lines)await api.add("journalLines",l);
  for(const g of lg.goals)await api.add("goals",g);
  for(const e of lg.savingsEvents)await api.add("savingsEvents",e);
  for(const b of lg.budgets)await api.add("budgets",b);
  for(const a of lg.audit)await api.add("auditLog",a);
  for(const[key,value]of Object.entries(lg.meta||{}))await api.put("meta",{key,value});
  return{restored:true,transactions:lg.transactions.length}})}
export async function readRange(store,index,from,to){
 const db=await openDatabase();
 return new Promise((res,rej)=>{const r=db.transaction(store,"readonly").objectStore(store)
  .index(index).getAll(IDBKeyRange.bound(from,to));r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function requestPersistence(){
 if(!navigator.storage?.persist)return{supported:false,persisted:false};
 if(await navigator.storage.persisted?.())return{supported:true,persisted:true};
 return{supported:true,persisted:!!(await navigator.storage.persist())}}
export async function storageEstimate(){
 if(!navigator.storage?.estimate)return null;
 const e=await navigator.storage.estimate();
 return{usage:e.usage,quota:e.quota,ratio:e.quota?e.usage/e.quota:0}}
