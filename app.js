const $=id=>document.getElementById(id);
const DEFAULT_CATS=[["vegetables","الخضر","♧"],["food","مواد غذائية","▦"],["bread","الخبز","♨"],["phone","فليكسي","▯"],["cosmetics","كوسميتيك","✧"],["home","المنزل","⌂"],["clothes","ملابس","♧"],["other","أخرى","•••"]];
const KEY="myfinance.v02";
const INCOME_TYPES=[["salary","راتب","◉"],["extra","عمل إضافي","✦"],["gift","هدية/هبة","♡"],["refund","استرجاع","↩"],["other","أخرى","•••"]];
const DB_NAME="myfinance-db",DB_VER=1,STORE="kv",KEY_MAIN="main";
const DOW_AR=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

// ── IndexedDB ─────────────────────────────────────────────
let _db=null;
function openDB(){return new Promise((res,rej)=>{if(_db)return res(_db);let r=indexedDB.open(DB_NAME,DB_VER);r.onupgradeneeded=e=>{let db=e.target.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};r.onsuccess=e=>{_db=e.target.result;res(_db)};r.onerror=e=>rej(e.target.error)})}
async function idbGet(k){let db=await openDB();return new Promise((res,rej)=>{let tx=db.transaction(STORE,"readonly"),st=tx.objectStore(STORE),rq=st.get(k);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error)})}
async function idbSet(k,v){let db=await openDB();return new Promise((res,rej)=>{let tx=db.transaction(STORE,"readwrite"),st=tx.objectStore(STORE),rq=st.put(v,k);rq.onsuccess=()=>res(true);rq.onerror=()=>rej(rq.error)})}
async function idbDel(k){let db=await openDB();return new Promise((res,rej)=>{let tx=db.transaction(STORE,"readwrite"),st=tx.objectStore(STORE),rq=st.delete(k);rq.onsuccess=()=>res(true);rq.onerror=()=>rej(rq.error)})}

// ── State ─────────────────────────────────────────────────
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function defaultState(){return {cash:0,transactions:[],products:[],allocations:[],plans:[],planRuns:[],salary:0,payday:18,categories:DEFAULT_CATS,theme:"dark"}}
function migrate(s){
  if(!s)return defaultState();
  if(!s.allocations){
    s.allocations=(s.budgets||[]).map(b=>({id:uid(),name:b.name||"تخصيص",categoryId:null,monthlyAmount:Number(b.amount)||0,weeklyAmounts:null,startDate:dateKey(),endDate:null,notes:""}));
    delete s.budgets;
  }
  if(!s.plans)s.plans=[];
  if(!s.planRuns)s.planRuns=[];
  if(!s.products)s.products=[];
  if(!s.categories)s.categories=DEFAULT_CATS;
  return s;
}
let state=defaultState(),selectedCat="vegetables",draft=[],selectedIncome="salary";
let planDraft=[],editingRunId=null,editingRunLines=[],editingAllocId=null;

async function load(){try{let s=await idbGet(KEY_MAIN);if(s)return migrate(s);let legacy=localStorage.getItem(KEY);if(legacy){let p=migrate(JSON.parse(legacy));await idbSet(KEY_MAIN,p);localStorage.removeItem(KEY);return p}}catch(e){}return defaultState()}
let _saveTimer=null;
function save(){clearTimeout(_saveTimer);_saveTimer=setTimeout(async()=>{try{await idbSet(KEY_MAIN,state)}catch(e){toast("فشل الحفظ")}},0);renderAll()}

// ── Helpers ───────────────────────────────────────────────
function money(n){return Math.round(Number(n)||0).toLocaleString("fr-FR")+" دج"}
function toast(s){let t=$("toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function localDate(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function dateKey(){return localDate(new Date())}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function addDays(dateStr,n){let d=new Date(dateStr);d.setDate(d.getDate()+n);return localDate(d)}

// ── Navigation ────────────────────────────────────────────
function nav(name){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$(name+"View").classList.add("active");document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));window.scrollTo(0,0)}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.go)));

// ── Cycle ─────────────────────────────────────────────────
function cycleStart(){let d=new Date(),day=Number(state.payday)||18,y=d.getFullYear(),m=d.getMonth();if(d.getDate()<day){m-=1;if(m<0){m=11;y-=1}}let last=new Date(y,m+1,0).getDate();return new Date(y,m,Math.min(day,last))}
function cycleEnd(){let s=cycleStart(),y=s.getFullYear(),m=s.getMonth()+1,d=s.getDate()-1;if(d<1){m-=1;if(m<0){m=11;y-=1}d=new Date(y,m+1,0).getDate()}let last=new Date(y,m+1,0).getDate();d=Math.min(d,last);return new Date(y,m,d)}
function cycleKey(){return {start:localDate(cycleStart()),end:localDate(cycleEnd())}}
function cycleTx(){let c=cycleKey();return state.transactions.filter(t=>t.date>=c.start&&t.date<=c.end)}
function monthLabel(d){return new Intl.DateTimeFormat("ar-DZ",{month:"long",year:"numeric"}).format(d)}
function currentWeekIndex(){let s=new Date(cycleKey().start),t=new Date();let diff=Math.floor((t-s)/86400000);return Math.max(0,Math.floor(diff/7))}

// ── Active allocations & consumption ──────────────────────
function activeAllocations(){let c=cycleKey();return state.allocations.filter(a=>{if(a.startDate>c.end)return false;if(a.endDate&&a.endDate<c.start)return false;return true})}
function allocationConsumption(a){
  let c=cycleKey(),monthly=0,weeks=[0,0,0,0,0,0];
  let start=new Date(c.start);
  state.transactions.forEach(t=>{
    if(t.type!=="expense")return;
    if(t.date<c.start||t.date>c.end)return;
    let cat=t.category;
    let sum=0;
    if(t.items&&t.items.length){t.items.forEach(i=>{if(a.categoryId&&i.category===a.categoryId)sum+=i.total})}
    else if(a.categoryId&&t.category===a.categoryId)sum+=t.amount;
    if(sum===0)return;
    monthly+=sum;
    let diff=Math.floor((new Date(t.date)-start)/86400000);
    let w=Math.floor(diff/7);
    if(w>=0&&w<6)weeks[w]+=sum;
  });
  return {monthlyTotal:monthly,weekTotals:weeks};
}

// ── Category chips ────────────────────────────────────────
function renderCats(){$("categoryGrid").innerHTML=state.categories.map(c=>`<button class="category ${selectedCat===c[0]?"selected":""}" data-cat="${c[0]}"><span class="cat-icon">${c[2]}</span><span>${esc(c[1])}</span></button>`).join("");document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{selectedCat=b.dataset.cat;renderCats();$("purchaseTitle").textContent="إضافة مشتريات — "+state.categories.find(c=>c[0]===selectedCat)[1]})}

// ── Purchases ─────────────────────────────────────────────
function calcDraft(){let q=Math.max(0,Number($("quantity").value)||0),p=Math.max(0,Number($("unitPrice").value)||0);$("lineTotal").textContent=money(q*p)}
["quantity","unitPrice"].forEach(id=>$(id).addEventListener("input",calcDraft));
$("productName").addEventListener("input",()=>{let p=state.products.find(x=>x.name.toLowerCase()===$("productName").value.trim().toLowerCase());if(p){$("unitPrice").value=p.price;calcDraft()}});
$("addLine").onclick=()=>{let name=$("productName").value.trim(),q=Number($("quantity").value),p=Number($("unitPrice").value);if(!name||!(q>0)||!(p>=0)){toast("أدخل اسم المنتج والكمية والسعر");return}draft.push({name,qty:q,price:p,total:Math.round(q*p*100)/100,category:selectedCat});$("productName").value="";$("quantity").value=1;$("unitPrice").value="";calcDraft();renderDraft()};
function renderDraft(){$("lineCount").textContent=draft.length+" منتجات";$("invoiceMeta").textContent=draft.length+" منتجات";$("invoiceLines").classList.toggle("empty",!draft.length);$("invoiceLines").innerHTML=draft.length?draft.map((x,i)=>`<div class="invoice-line"><div><b>${esc(x.name)}</b><small>${x.qty} × ${money(x.price)} · ${esc(state.categories.find(c=>c[0]===x.category)?.[1]||"أخرى")}</small></div><strong>${money(x.total)}</strong><button class="remove-line" data-remove="${i}">×</button></div>`).join(""):"لم تضف منتجات بعد";$("invoiceTotal").textContent=money(draft.reduce((s,x)=>s+x.total,0));$("confirmPurchase").disabled=!draft.length;document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{draft.splice(+b.dataset.remove,1);renderDraft()})}
$("confirmPurchase").onclick=()=>{if(!draft.length)return;let total=Math.round(draft.reduce((s,x)=>s+x.total,0)*100)/100;if(!confirm("تأكيد فاتورة بقيمة "+money(total)+"؟"))return;let tx={id:uid(),type:"expense",kind:"purchase",title:"مشتريات ("+draft.length+" منتجات)",amount:total,date:dateKey(),items:draft.map(x=>({...x}))};state.transactions.unshift(tx);state.cash-=total;draft=[];renderDraft();save();toast("تم تسجيل الفاتورة")};

// ── Transactions display ──────────────────────────────────
function renderTransactions(target,items){let el=$(target);el.classList.toggle("empty",!items.length);el.innerHTML=items.length?items.map(t=>{let badge="";if(t.kind==="income"&&t.incomeType){let it=INCOME_TYPES.find(x=>x[0]===t.incomeType);if(it)badge=` · ${it[2]} ${it[1]}`}return `<div class="record"><div><b>${esc(t.title)}</b><small>${t.date} · ${t.kind==="purchase"?t.planId?"مشترى (خطة)":"فاتورة مشتريات":t.type==="income"?"دخل"+badge:"مصروف"}</small></div><span class="amount ${t.type==="income"?"positive":"negative"}">${t.type==="income"?"+":"−"}${money(t.amount)}</span></div>`}).join(""):"لا توجد حركات بعد"}

// ── Income ────────────────────────────────────────────────
function renderIncomeTypes(){let el=$("incomeTypeChips");if(!el)return;el.innerHTML=INCOME_TYPES.map(t=>`<button class="income-chip ${selectedIncome===t[0]?"active":""}" data-inc="${t[0]}">${t[2]} ${t[1]}</button>`).join("");el.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{selectedIncome=b.dataset.inc;renderIncomeTypes()})}
function renderIncomeBreakdown(){let el=$("incomeBreakdown");if(!el)return;let c=cycleKey(),m=cycleTx().filter(t=>t.type==="income"),byType={};m.forEach(t=>{let k=t.incomeType||"other";byType[k]=(byType[k]||0)+t.amount});let rows=INCOME_TYPES.filter(t=>byType[t[0]]).map(t=>`<div class="src"><span>${t[2]} ${t[1]}</span><b>${money(byType[t[0]])}</b></div>`).join("");el.innerHTML=rows||'<div class="empty">لا دخل مسجّل في هذه الدورة</div>';let lab=$("cycleLabel");if(lab)lab.textContent="الدورة "+c.start+" ← "+c.end}
function recordIncome(){let amount=Math.max(0,Number($("incomeAmount").value)||0);if(!(amount>0)){toast("أدخل مبلغ الدخل");return}let src=$("incomeSource").value.trim();let tInfo=INCOME_TYPES.find(t=>t[0]===selectedIncome)||INCOME_TYPES[0];let tx={id:uid(),type:"income",kind:"income",incomeType:selectedIncome,title:src||tInfo[1],amount,date:dateKey()};state.transactions.unshift(tx);state.cash+=amount;$("incomeAmount").value="";$("incomeSource").value="";save();toast("تم تسجيل "+money(amount))}
$("recordIncome").onclick=recordIncome;

// ── Home ──────────────────────────────────────────────────
function renderHome(){let m=cycleTx(),inc=m.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),out=m.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);$("cashBalance").innerHTML=money(state.cash).replace(" دج","")+" <small>دج</small>";$("available").textContent=money(state.cash);$("incomeTotal").textContent=money(inc);$("expenseTotal").textContent=money(out);renderTransactions("recentList",state.transactions.slice(0,4));renderIncomeTypes();renderIncomeBreakdown();renderDueToday()}

// ── Allocations ───────────────────────────────────────────
function renderAllocations(){
  let c=cycleKey(),active=activeAllocations();
  let total=active.reduce((s,a)=>s+a.monthlyAmount,0),salary=Number(state.salary)||0,rem=salary-total;
  $("allocationMonth").textContent="تخصيص راتب "+monthLabel(cycleStart());
  $("allocationSalary").textContent=money(salary);
  $("allocationTotal").textContent=money(total);
  $("allocationRemaining").textContent=money(rem);
  $("allocationRemaining").className=rem<0?"negative":"";
  let list=$("allocationList");
  if(!active.length){list.classList.add("empty");list.innerHTML='<div class="empty">لم تُخصص أي مبالغ بعد</div>';return}
  list.classList.remove("empty");
  list.innerHTML=active.map(a=>{
    let cons=allocationConsumption(a),monthRem=a.monthlyAmount-cons.monthlyTotal;
    let cat=a.categoryId?state.categories.find(x=>x[0]===a.categoryId):null;
    let catName=cat?cat[1]:"غير مرتبط";
    let curW=currentWeekIndex();
    let weeklyHTML="";
    if(a.weeklyAmounts&&a.weeklyAmounts.length){
      let maxW=a.weeklyAmounts.length;
      let curW2=Math.min(curW,maxW-1);
      weeklyHTML=`<div class="week-grid">${a.weeklyAmounts.map((amt,i)=>{let used=cons.weekTotals[i]||0,left=amt-used;let cls=i===curW2?"current":"";return `<div class="week-row ${cls}"><span>الأسبوع ${i+1}${cls?" (الحالي)":""}</span><small>${money(used)} / ${money(amt)}</small><b class="${left<0?"negative":left<amt*0.2?"warn":""}">${money(left)}</b></div>`}).join("")}</div>`;
    }
    return `<article class="alloc-card"><div class="alloc-head"><div><b>${esc(a.name)}</b><small>${esc(catName)}${a.weeklyAmounts?" · "+a.weeklyAmounts.length+" أسابيع":""}</small></div><strong>${money(a.monthlyAmount)}</strong></div><div class="alloc-meta"><span>المستهلك: ${money(cons.monthlyTotal)}</span><span>المتبقي: <b class="${monthRem<0?"negative":"positive"}">${money(monthRem)}</b></span></div>${weeklyHTML}<div class="alloc-actions"><button class="text-btn" data-alloc-edit="${a.id}">تعديل</button> <button class="text-btn danger-text" data-alloc-del="${a.id}">حذف</button></div></article>`;
  }).join("");
  
  list.querySelectorAll("[data-alloc-edit]").forEach(b=>b.onclick=()=>{let a=state.allocations.find(x=>x.id===b.dataset.allocEdit);if(!a)return;editingAllocId=a.id;let sel=$("allocCat");sel.innerHTML='<option value="">بدون ربط</option>'+state.categories.map(c=>`<option value="${c[0]}"${c[0]===a.categoryId?" selected":""}>${esc(c[1])}</option>`).join("");$("addAllocForm").style.display="";$("allocName").value=a.name;$("allocMonthly").value=a.monthlyAmount;$("allocWeekly").value=a.weeklyAmounts?a.weeklyAmounts.join(", "):"";$("allocSave").textContent="حفظ التعديل";$("addAllocForm").scrollIntoView({behavior:"smooth",block:"center"});$("allocName").focus()});
}
function openAddAlloc(){editingAllocId=null;let sel=$("allocCat");sel.innerHTML='<option value="">بدون ربط</option>'+state.categories.map(c=>`<option value="${c[0]}">${esc(c[1])}</option>`).join("");$("addAllocForm").style.display="";$("allocName").value="";$("allocMonthly").value="";$("allocWeekly").value="";$("allocSave").textContent="حفظ";$("allocName").focus()}
$("addAllocBtn").onclick=()=>openAddAlloc();
$("allocCancel").onclick=()=>{editingAllocId=null;$("addAllocForm").style.display="none";$("allocSave").textContent="حفظ"};
$("allocSave").onclick=()=>{
  let name=$("allocName").value.trim(),monthly=Number($("allocMonthly").value)||0,catId=$("allocCat").value||null;
  if(!name){toast("أدخل اسم التخصيص");return}
  if(monthly<0){toast("المبلغ لا يصلح");return}
  let weeklyStr=$("allocWeekly").value.trim(),weeklyAmounts=null;
  if(weeklyStr){
    let parts=weeklyStr.split(",").map(x=>Number(x.trim())).filter(x=>x>=0);
    if(parts.length)weeklyAmounts=parts;
  }
  if(editingAllocId){
    let a=state.allocations.find(x=>x.id===editingAllocId);
    if(a){a.name=name;a.categoryId=catId;a.monthlyAmount=monthly;a.weeklyAmounts=weeklyAmounts}
    editingAllocId=null;
    $("addAllocForm").style.display="none";$("allocSave").textContent="حفظ";save();toast("تم حفظ التعديل")
  }else{
    state.allocations.push({id:uid(),name,categoryId:catId,monthlyAmount:monthly,weeklyAmounts,startDate:cycleKey().start,endDate:null,notes:""});
    $("addAllocForm").style.display="none";save();toast("تم إضافة التخصيص")
  }
};
$("saveIncome").onclick=()=>{state.salary=Math.max(0,Number($("salary").value)||0);state.payday=Math.min(31,Math.max(1,Number($("payday").value)||18));save();toast("تم حفظ إعداد الدخل")};

// ── Plans ─────────────────────────────────────────────────
function recurrenceLabel(rec,startDate){
  if(!rec)return "—";
  let d=new Date(startDate);
  if(rec.type==="daily")return "يومياً";
  if(rec.type==="weekly")return "كل "+DOW_AR[d.getDay()];
  if(rec.type==="monthly")return "يوم "+d.getDate()+" من كل شهر";
  if(rec.type==="interval")return "كل "+rec.intervalDays+" أيام";
  if(rec.type==="once")return "مرة واحدة: "+rec.date;
  if(rec.type==="customDays")return rec.weekdays.map(w=>DOW_AR[w]).join(", ");
  return "—";
}
function planTotal(plan){return (plan.lines||[]).reduce((s,l)=>s+(Number(l.qty)||0)*(Number(l.price)||0),0)}
function isDueOn(plan,d){
  let rec=plan.recurrence;if(!rec)return false;
  if(rec.type==="once")return localDate(d)===rec.date;
  if(rec.type==="daily")return true;
  if(rec.type==="weekly"){let s=new Date(plan.startDate);return d.getDay()===s.getDay()}
  if(rec.type==="monthly"){let s=new Date(plan.startDate);return d.getDate()===s.getDate()}
  if(rec.type==="customDays")return (rec.weekdays||[]).includes(d.getDay());
  if(rec.type==="interval"){let diff=Math.floor((d-new Date(plan.startDate))/86400000);return diff>=0&&diff%rec.intervalDays===0}
  return false;
}
function planDueDates(plan,fromStr,toStr){
  let dates=[],start=new Date(plan.startDate),from=new Date(fromStr),to=new Date(toStr);
  if(start<from)start=new Date(from);
  let end=plan.endDate?new Date(plan.endDate):to;
  if(end>to)end=new Date(to);
  let d=new Date(start);
  while(d<=end){if(isDueOn(plan,d))dates.push(localDate(d));d.setDate(d.getDate()+1)}
  return dates;
}
function getDueRuns(fromDate,toDate){
  let runs=[];
  state.plans.filter(p=>p.active!==false).forEach(plan=>{
    let dates=planDueDates(plan,fromDate,toDate);
    dates.forEach(dueDate=>{
      let stored=state.planRuns.find(r=>r.planId===plan.id&&r.dueDate===dueDate);
      let run=stored?{...stored,plan}:{planId:plan.id,dueDate,status:"pending",plan};
      runs.push(run);
    });
  });
  return runs.sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
}
function renderPlans(){
  let list=$("plansList");
  let active=state.plans.filter(p=>p.active!==false);
  if(!active.length){list.classList.add("empty");list.innerHTML='<div class="empty">لا خطط بعد</div>'}
  else{
    list.classList.remove("empty");
    list.innerHTML=active.map(p=>{
      let alloc=state.allocations.find(a=>a.id===p.allocationId);
      let allocName=alloc?alloc.name:"غير مرتبط";
      let rec=recurrenceLabel(p.recurrence,p.startDate);
      let total=planTotal(p);
      return `<article class="plan-card"><div class="alloc-head"><div><b>${esc(p.name)}</b><small>${rec} · ${esc(allocName)}</small></div><strong>${money(total)}</strong></div><div class="plan-lines">${(p.lines||[]).map(l=>`<small>${l.qty} × ${esc(l.name)} @ ${money(l.price)}</small>`).join("")}</div><div class="alloc-actions"><button class="text-btn" data-plan-toggle="${p.id}">تعطيل</button> <button class="text-btn danger-text" data-plan-del="${p.id}">حذف</button></div></article>`;
    }).join("");
    list.querySelectorAll("[data-plan-toggle]").forEach(b=>b.onclick=()=>{let p=state.plans.find(x=>x.id===b.dataset.planToggle);p.active=false;save();toast("تم تعطيل الخطة")});
    list.querySelectorAll("[data-plan-del]").forEach(b=>b.onclick=()=>{if(confirm("حذف الخطة؟ العمليات المؤكدة السابقة تبقى.")){state.plans=state.plans.filter(x=>x.id!==b.dataset.planDel);save()}});
  }
  renderDueRuns();
}
function renderDueRuns(){
  let today=dateKey(),week=addDays(today,7);
  let runs=getDueRuns(today,week).filter(r=>r.status==="pending");
  let el=$("dueRunsList"),cont=$("dueRunsContainer");
  if(!runs.length){cont.style.display="none";return}
  cont.style.display="";
  el.innerHTML=runs.map(r=>renderRunCard(r,false)).join("");
  bindRunActions(el);
}
function renderRunCard(run,compact){
  let plan=run.plan;
  let alloc=plan.allocationId?state.allocations.find(a=>a.id===plan.allocationId):null;
  let lines=run.actualLines||plan.lines||[];
  let total=lines.reduce((s,l)=>s+(Number(l.qty)||0)*(Number(l.price)||0),0);
  let key=plan.id+"|"+run.dueDate;
  if(editingRunId===key){
    let et=editingRunLines.reduce((s,l)=>s+(Number(l.qty)||0)*(Number(l.price)||0),0);
    return `<article class="run-card editing"><div class="alloc-head"><div><b>تعديل: ${esc(plan.name)}</b><small>${run.dueDate}</small></div></div>${editingRunLines.map((l,i)=>`<div class="run-edit-line"><span>${esc(l.name)}</span><input type="number" min="0.001" step="any" value="${l.qty}" data-edit-qty="${i}"><input type="number" min="0" step="1" value="${l.price}" data-edit-price="${i}"><strong data-edit-total="${i}">${money(l.qty*l.price)}</strong></div>`).join("")}<div class="alloc-head" style="margin-top:10px"><b>المجموع</b><strong>${money(et)}</strong></div><div class="alloc-actions"><button class="primary-btn" data-run-confirm-edit="${key}" style="flex:1">تأكيد بهذه القيم</button><button class="secondary-btn" data-run-cancel="${key}">إلغاء</button></div></article>`;
  }
  let dateLabel=run.dueDate===dateKey()?"اليوم":run.dueDate;
  return `<article class="run-card"><div class="alloc-head"><div><b>${esc(plan.name)}</b><small>${dateLabel} · ${esc(alloc?alloc.name:"—")}</small></div><strong>${money(total)}</strong></div><div class="plan-lines">${lines.map(l=>`<small>${l.qty} × ${esc(l.name)} @ ${money(l.price)}</small>`).join("")}</div><div class="alloc-actions"><button class="primary-btn" data-run-confirm="${key}" style="flex:1">تأكيد</button><button class="secondary-btn" data-run-edit="${key}">تعديل</button><button class="secondary-btn danger-text" data-run-skip="${key}">تخطي</button></div></article>`;
}
function bindRunActions(container){
  container.querySelectorAll("[data-run-confirm]").forEach(b=>b.onclick=()=>{
    let[pid,due]=b.dataset.runConfirm.split("|");
    let plan=state.plans.find(p=>p.id===pid);if(!plan)return;
    let lines=(plan.lines||[]).map(l=>({name:l.name,qty:l.qty,price:l.price,total:l.qty*l.price,category:state.allocations.find(a=>a.id===plan.allocationId)?.categoryId||null}));
    confirmRun(plan,due,lines);
  });
  container.querySelectorAll("[data-run-skip]").forEach(b=>b.onclick=()=>{
    let[pid,due]=b.dataset.runSkip.split("|");
    if(!confirm("تخطي هذه العملية؟ لن تُسجَّل كمصروف."))return;
    state.planRuns.push({id:uid(),planId:pid,dueDate:due,status:"skipped"});save();toast("تم التخطي")
  });
  container.querySelectorAll("[data-run-edit]").forEach(b=>b.onclick=()=>{
    let[pid,due]=b.dataset.runEdit.split("|");
    let plan=state.plans.find(p=>p.id===pid);if(!plan)return;
    editingRunId=pid+"|"+due;
    editingRunLines=(plan.lines||[]).map(l=>({...l}));
    renderAll();
  });
  container.querySelectorAll("[data-run-cancel]").forEach(b=>b.onclick=()=>{editingRunId=null;editingRunLines=[];renderAll()});
  container.querySelectorAll("[data-edit-qty]").forEach(inp=>inp.oninput=()=>{
    let i=+inp.dataset.editQty,v=Math.max(0,Number(inp.value)||0);
    editingRunLines[i].qty=v;
    let tEl=container.querySelector('[data-edit-total="'+i+'"]');
    if(tEl)tEl.textContent=money(v*editingRunLines[i].price);
  });
  container.querySelectorAll("[data-edit-price]").forEach(inp=>inp.oninput=()=>{
    let i=+inp.dataset.editPrice,v=Math.max(0,Number(inp.value)||0);
    editingRunLines[i].price=v;
    let tEl=container.querySelector('[data-edit-total="'+i+'"]');
    if(tEl)tEl.textContent=money(v*editingRunLines[i].qty);
  });
  container.querySelectorAll("[data-run-confirm-edit]").forEach(b=>b.onclick=()=>{
    let[pid,due]=b.dataset.runConfirmEdit.split("|");
    let plan=state.plans.find(p=>p.id===pid);if(!plan)return;
    let lines=editingRunLines.map(l=>({name:l.name,qty:Number(l.qty)||0,price:Number(l.price)||0,total:(Number(l.qty)||0)*(Number(l.price)||0),category:state.allocations.find(a=>a.id===plan.allocationId)?.categoryId||null}));
    editingRunId=null;editingRunLines=[];
    confirmRun(plan,due,lines);
  });
}
function confirmRun(plan,due,lines){
  let total=Math.round(lines.reduce((s,l)=>s+l.total,0)*100)/100;
  if(total<=0){toast("القيم غير صالحة");return}
  if(!confirm("تأكيد "+money(total)+" كمصروف فعلي؟"))return;
  let runId=uid();
  let tx={id:uid(),type:"expense",kind:"purchase",planId:plan.id,planRunId:runId,title:"خطة: "+plan.name,amount:total,date:due,items:lines};
  state.transactions.unshift(tx);
  state.cash-=total;
  state.planRuns.push({id:runId,planId:plan.id,dueDate:due,status:"confirmed",actualLines:lines,actualTotal:total,transactionId:tx.id});
  save();toast("تم تسجيل "+money(total))
}
function renderDueToday(){
  let el=$("dueTodayList");if(!el)return;
  let today=dateKey();
  let runs=getDueRuns(today,today).filter(r=>r.status==="pending");
  if(!runs.length){el.classList.add("empty");el.innerHTML='<div class="empty">لا مستحقات اليوم</div>';return}
  el.classList.remove("empty");
  el.innerHTML=`<div class="empty-hint">لديك ${runs.length} عملية مستحقة اليوم</div>`+runs.map(r=>renderRunCard(r,true)).join("");
  bindRunActions(el);
}
function openAddPlan(){
  let sel=$("planAlloc");
  sel.innerHTML='<option value="">بدون ربط</option>'+state.allocations.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("");
  $("planName").value="";$("planRecur").value="daily";$("planInterval").value="7";$("planDate").value=dateKey();$("planStart").value=dateKey();
  $("planIntervalField").style.display="none";$("planDateField").style.display="none";
  planDraft=[];
  renderPlanDraftLines();
  $("addPlanForm").style.display="";
}
$("addPlanBtn").onclick=openAddPlan;
$("planCancel").onclick=()=>{$("addPlanForm").style.display="none";planDraft=[]};
$("planRecur").onchange=()=>{let v=$("planRecur").value;$("planIntervalField").style.display=v==="interval"?"":"none";$("planDateField").style.display=v==="once"?"":"none"};
function renderPlanDraftLines(){
  let el=$("planDraftLines");
  if(!planDraft.length){el.classList.add("empty");el.innerHTML='<div class="empty">لم تضف منتجات</div>';return}
  el.classList.remove("empty");
  el.innerHTML=planDraft.map((l,i)=>`<div class="invoice-line"><div><b>${esc(l.name)}</b><small>${l.qty} × ${money(l.price)}</small></div><strong>${money(l.qty*l.price)}</strong><button class="remove-line" data-planline-remove="${i}">×</button></div>`).join("");
  el.querySelectorAll("[data-planline-remove]").forEach(b=>b.onclick=()=>{planDraft.splice(+b.dataset.planlineRemove,1);renderPlanDraftLines()});
}
$("planAddLine").onclick=()=>{
  let name=$("planLineName").value.trim(),q=Number($("planLineQty").value),p=Number($("planLinePrice").value);
  if(!name||!(q>0)||!(p>=0)){toast("أدخل اسم المنتج والكمية والسعر");return}
  let prod=state.products.find(x=>x.name.toLowerCase()===name.toLowerCase());
  planDraft.push({name:prod?prod.name:name,qty:q,price:p});
  $("planLineName").value="";$("planLineQty").value=1;$("planLinePrice").value="";
  renderPlanDraftLines();
};
$("planSave").onclick=()=>{
  let name=$("planName").value.trim();
  if(!name){toast("أدخل اسم الخطة");return}
  if(!planDraft.length){toast("أضف منتجاً واحداً على الأقل");return}
  let recType=$("planRecur").value,rec={type:recType};
  if(recType==="interval")rec.intervalDays=Math.max(1,Number($("planInterval").value)||7);
  if(recType==="once")rec.date=$("planDate").value;
  let startDate=$("planStart").value||dateKey();
  state.plans.push({id:uid(),name,allocationId:$("planAlloc").value||null,recurrence:rec,lines:planDraft.map(l=>({...l})),startDate,endDate:null,active:true});
  $("addPlanForm").style.display="none";planDraft=[];
  save();toast("تم حفظ الخطة")
};

// ── Products ──────────────────────────────────────────────
function renderProducts(){
  $("catalogCategory").innerHTML=state.categories.map(c=>`<option value="${c[0]}">${esc(c[1])}</option>`).join("");
  $("productHints").innerHTML=state.products.map(p=>`<option value="${esc(p.name)}">`).join("");
  $("catalogList").classList.toggle("empty",!state.products.length);
  $("catalogList").innerHTML=state.products.length?state.products.map(p=>`<div class="catalog-item"><div><b>${esc(p.name)}</b><small>${esc(p.unit)} · ${esc(state.categories.find(c=>c[0]===p.category)?.[1]||"أخرى")} · ${p.history.length} تغييرات${p.store?" · "+esc(p.store):""}${p.notes?" · "+esc(p.notes):""}</small></div><strong>${money(p.price)}</strong></div>`).join(""):"لم تضف منتجات إلى الدليل"
}
$("saveProduct").onclick=()=>{
  let name=$("catalogName").value.trim(),price=Number($("catalogPrice").value);
  if(!name||!(price>=0)){toast("أدخل اسم المنتج والسعر");return}
  let store=($("catalogStore")?.value||"").trim(),notes=($("catalogNotes")?.value||"").trim();
  let old=state.products.find(p=>p.name.toLowerCase()===name.toLowerCase());
  if(old){
    if(old.price!==price)old.history.push({price:old.price,date:dateKey()});
    old.price=price;old.unit=$("catalogUnit").value;old.category=$("catalogCategory").value;
    old.store=store||old.store||"";old.notes=notes||old.notes||"";
  }else{
    state.products.push({name,price,unit:$("catalogUnit").value,category:$("catalogCategory").value,store,notes,history:[]});
  }
  $("catalogName").value="";$("catalogPrice").value="";if($("catalogStore"))$("catalogStore").value="";if($("catalogNotes"))$("catalogNotes").value="";
  save();toast("تم حفظ المنتج")
};

// ── Settings & backup ─────────────────────────────────────
function toggleTheme(){state.theme=state.theme==="light"?"dark":"light";save()}
$("themeBtn").onclick=toggleTheme;$("themeToggle").onclick=toggleTheme;
$("backupBtn").onclick=()=>{let blob=new Blob([JSON.stringify({schemaVersion:2,exportedAt:new Date().toISOString(),appVersion:"0.6",data:state},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="myfinance-backup.json";a.click();URL.revokeObjectURL(a.href)};
$("restoreFile").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let obj=JSON.parse(await f.text());if((obj.schemaVersion!==1&&obj.schemaVersion!==2)||!obj.data||!Array.isArray(obj.data.transactions)||!Array.isArray(obj.data.categories))throw Error();if(confirm("استعادة النسخة واستبدال البيانات الحالية؟")){state=migrate(obj.data);save();toast("تمت الاستعادة")}}catch{toast("ملف النسخة غير صالح")}e.target.value=""};
$("resetBtn").onclick=async()=>{if(confirm("سيتم حذف جميع بيانات ميزانيتي من هذا الجهاز. هل أنت متأكد؟")){try{await idbDel(KEY_MAIN)}catch(e){}localStorage.removeItem(KEY);state=defaultState();draft=[];planDraft=[];renderDraft();save();toast("تم مسح البيانات")}};

$("today").textContent=new Intl.DateTimeFormat("ar-DZ",{dateStyle:"full"}).format(new Date());
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});

// ── renderAll ─────────────────────────────────────────────
function renderAll(){
  renderCats();
  renderHome();
  renderAllocations();
  renderPlans();
  renderTransactions("activityList",state.transactions);
  renderProducts();
  $("purchaseHistory").classList.toggle("empty",!state.transactions.some(t=>t.kind==="purchase"));
  $("purchaseHistory").innerHTML=state.transactions.filter(t=>t.kind==="purchase").slice(0,6).map(t=>`<div class="record"><div><b>${esc(t.title)}</b><small>${t.date} · ${(t.items||[]).map(i=>esc(i.name)).join("، ")}</small></div><span class="amount negative">${money(t.amount)}</span></div>`).join("")||"لا توجد مشتريات مسجلة";
  $("salary").value=state.salary||"";$("payday").value=state.payday||18;
  document.body.classList.toggle("light",state.theme==="light")
}

// ── Boot ──────────────────────────────────────────────────
(async()=>{state=await load();renderAll();renderDraft();calcDraft()})();
