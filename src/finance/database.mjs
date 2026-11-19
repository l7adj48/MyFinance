/**
 * IndexedDB persistence for the accounting kernel.
 * A transaction and its ledger rows are committed atomically.
 */
const DB_NAME="myfinance-ledger";
const DB_VERSION=1;
const requestResult=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
export function openFinanceDB(){
  if(!globalThis.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable in this browser"));
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains("transactions")){const s=db.createObjectStore("transactions",{keyPath:"id"});s.createIndex("occurredAt","occurredAt");}
      if(!db.objectStoreNames.contains("entries")){const s=db.createObjectStore("entries",{keyPath:"id"});s.createIndex("transactionId","transactionId");s.createIndex("account","account");}
      if(!db.objectStoreNames.contains("meta"))db.createObjectStore("meta",{keyPath:"key"});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(new Error("Database upgrade is blocked by another open tab"));
  });
}
export async function postAtomically(db,transaction){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(["transactions","entries"],"readwrite");
    const transactions=tx.objectStore("transactions"),entries=tx.objectStore("entries");
    const add=transactions.add(transaction);
    add.onerror=()=>{try{tx.abort()}catch{}};
    transaction.entries.forEach((e,index)=>entries.add({id:transaction.id+":"+index,transactionId:transaction.id,...e}));
    tx.oncomplete=()=>resolve(transaction);
    tx.onerror=()=>reject(tx.error||new Error("Atomic ledger write failed"));
    tx.onabort=()=>reject(tx.error||new Error("Ledger write aborted; no partial data was committed"));
  });
}
export async function readLedger(db){
  const tx=db.transaction(["transactions"],"readonly");
  const result=await requestResult(tx.objectStore("transactions").getAll());
  return result.sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)||a.createdAt.localeCompare(b.createdAt));
}
export async function closeFinanceDB(db){db?.close();}
