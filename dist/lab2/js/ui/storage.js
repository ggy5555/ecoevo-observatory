// Optional, per-browser history. Never writes to legacy Observatory localStorage.
const NAME="ecoevo-lab2-experiments",STORE="history",LIMIT=20;
function openDatabase(){
  return new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error("IndexedDB를 사용할 수 없습니다."));return;}
    const req=indexedDB.open(NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error("저장소를 열지 못했습니다."));
  });
}
function requestResult(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function listHistory(){
  const db=await openDatabase();
  try{const tx=db.transaction(STORE,"readonly");const records=await requestResult(tx.objectStore(STORE).getAll());
    return records.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).map(({id,savedAt,summary})=>({id,savedAt,summary}));}
  finally{db.close();}
}
export async function loadHistory(id){
  const db=await openDatabase();
  try{const row=await requestResult(db.transaction(STORE,"readonly").objectStore(STORE).get(id));return row?.result||null;}
  finally{db.close();}
}
export async function deleteHistory(id){
  const db=await openDatabase();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}
  finally{db.close();}
}
export async function saveHistory(result,confirmPrune=()=>false){
  const id=result.plan.experimentId;
  const items=await listHistory();
  const already=items.some(item=>item.id===id);
  const oldest=!already&&items.length>=LIMIT?items.at(-1):null;
  if(oldest&&!confirmPrune(oldest))return false;
  const record={id,savedAt:new Date().toISOString(),
    summary:{type:result.plan.experimentType,conditions:result.plan.conditions,runCount:result.runs.length,status:result.status},
    result};
  const db=await openDatabase();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);
    if(oldest)store.delete(oldest.id);
    store.put(record);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });return true;}
  finally{db.close();}
}
