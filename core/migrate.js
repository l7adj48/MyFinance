/* ترحيل 0.6 → الدفتر. دالة نقية: لا تلمس الحالة القديمة ولا تكتب في القاعدة.
   قاعدة 5: لا حذف. قاعدة 2: لا اختراع. قاعدة 10: لا إصلاح صامت.
   state.cash لا يُرحّل كرقم: يُعاد البناء من الحركات ويُقارن، والفرق يُعرض قراراً للمستخدم. */
import{createLedger,post}from"./ledger.js";
import{TX}from"./ledger.js";
import{parseMoney,formatMoney}from"./money.js";
import{isISODate,todayLocal,nowInstant}from"./dates.js";
const SRC={salary:"src:salary",extra:"src:extra",gift:"src:gift",other:"src:other"};
export function migrateLegacy(legacy,opts={}){
 const today=opts.today||todayLocal(),lg=createLedger();
 const report={startedAt:nowInstant(),sourceVersion:"0.6",
  counts:{income:0,purchase:0,skipped:0,budgets:0},warnings:[],blockers:[],needsReview:[],cashComparison:null};
 if(!legacy||typeof legacy!=="object"){report.blockers.push({code:"NO_DATA",message:"لا توجد بيانات للترحيل"});report.ok=false;return{ledger:lg,report}}
 const ordered=[...(Array.isArray(legacy.transactions)?legacy.transactions:[])]
  .sort((a,b)=>{const x=String(a?.date||""),y=String(b?.date||"");return x<y?-1:x>y?1:0});
 for(const t of ordered){
  const lid=t?.id??"(بلا معرّف)";
  try{
   if(!t||typeof t!=="object")throw new Error("سجل غير كائن");
   const when=isISODate(t.date)?t.date:null;
   if(!when)report.warnings.push({code:"BAD_DATE",legacyId:lid,value:t.date,resolvedTo:today,
    message:"تاريخ غير صالح — استُخدم تاريخ اليوم مؤقتاً، يحتاج مراجعتك"});
   const p=parseMoney(t.amount??0,{allowRounding:true,allowNegative:false});
   if(p.rounded)report.warnings.push({code:"SUB_CENT_ROUNDED",legacyId:lid,original:p.original,
    message:"المبلغ كان أدق من السنتيم وقُرّب HALF_UP إلى "+formatMoney(p.cents)});
   if(p.cents===0){report.warnings.push({code:"ZERO_AMOUNT",legacyId:lid,message:"حركة بمبلغ صفري — تُركت للمراجعة"});
    report.needsReview.push({legacyId:lid,reason:"ZERO_AMOUNT",raw:t});report.counts.skipped++;continue}
   const opId="legacy:"+lid,occ=when||today;
   if(t.type==="income"){
    if(t.incomeType==="refund"){
     report.needsReview.push({legacyId:lid,reason:"REFUND_AS_INCOME",raw:t,
      message:"سُجّل كدخل في 0.6. الصحيح استرجاع مرتبط بمصروف. حدّد المصروف الأصلي يدوياً."});
     report.warnings.push({code:"REFUND_AS_INCOME",legacyId:lid,
      message:"استرجاع مسجّل كدخل — رُحّل كما هو للحفاظ على الرصيد ووسم للمراجعة"})}
    post(lg,{type:TX.INCOME,amount:p.cents,occurredOn:occ,opId,
     sourceId:SRC[t.incomeType]||"src:other",note:t.title||"",source:"migration"});
    report.counts.income++;
   }else if(t.type==="expense"){
    const items=Array.isArray(t.items)?t.items:[];
    const cat=items.find(i=>i?.category)?.category||t.category||"other";
    const{txId}=post(lg,{type:TX.EXPENSE,amount:p.cents,occurredOn:occ,opId,
     categoryId:cat,note:t.title||"",source:"migration"});
    if(items.length){
     const snap=items.map(i=>({name:String(i?.name??""),qtyRaw:i?.qty??null,priceRaw:i?.price??null,
      totalRaw:i?.total??null,categoryId:i?.category??null,unit:"unknown",unitMissing:true}));
     lg.audit.push({id:"mig_items_"+lid,at:nowInstant(),action:"MIGRATE_ITEMS",entityType:"purchase",
      entityId:txId,opId:opId+":items",before:null,after:{items:snap},
      reason:"لقطة عناصر قديمة — الوحدة مفقودة في المصدر",source:"migration"});
     report.warnings.push({code:"UNIT_MISSING",legacyId:lid,
      message:"عناصر بلا وحدة قياس في المصدر. تُركت unknown ولم تُخمَّن."})}
    const cats=new Set(items.map(i=>i?.category).filter(Boolean));
    if(cats.size>1){report.warnings.push({code:"MULTI_CATEGORY_INVOICE",legacyId:lid,categories:[...cats],
     message:"فاتورة بأكثر من تصنيف؛ رُحّلت بتصنيف واحد والتفاصيل محفوظة في اللقطة"});
     report.needsReview.push({legacyId:lid,reason:"MULTI_CATEGORY_INVOICE",raw:t})}
    report.counts.purchase++;
   }else{report.warnings.push({code:"UNKNOWN_TYPE",legacyId:lid,value:t.type,message:"نوع حركة غير معروف"});
    report.needsReview.push({legacyId:lid,reason:"UNKNOWN_TYPE",raw:t});report.counts.skipped++}
  }catch(err){report.blockers.push({code:"TX_MIGRATE_FAILED",legacyId:lid,message:err.message});report.counts.skipped++}}
 const rebuilt=lg.lines.reduce((s,l)=>l.account==="CASH"?s+(l.side==="DEBIT"?l.amount:-l.amount):s,0);
 let old=null;
 try{old=parseMoney(legacy.cash??0,{allowRounding:true}).cents}
 catch{report.warnings.push({code:"BAD_LEGACY_CASH",value:legacy.cash,message:"رصيد قديم غير قابل للتحليل"})}
 report.cashComparison={legacyStored:old,rebuiltFromLedger:rebuilt,
  difference:old===null?null:old-rebuilt,matches:old!==null&&old===rebuilt};
 if(old!==null&&old!==rebuilt)report.blockers.push({code:"CASH_MISMATCH",legacyStored:old,rebuilt,
  message:"الرصيد المخزّن ("+formatMoney(old)+") لا يطابق المعاد بناؤه ("+formatMoney(rebuilt)+"). الفرق "+formatMoney(old-rebuilt)+". لن تُجرى تسوية تلقائية — قرّر أنت."});
 for(const a of(legacy.allocations||[])){
  try{const m=parseMoney(a.monthlyAmount??0,{allowRounding:true,allowNegative:false}).cents;
   lg.budgets.push({id:"bud_"+a.id,name:a.name||"ميزانية",categoryId:a.categoryId??null,amount:m,
    periodStart:isISODate(a.startDate)?a.startDate:today,periodEnd:isISODate(a.endDate)?a.endDate:null,
    weeklyAmounts:Array.isArray(a.weeklyAmounts)?a.weeklyAmounts.map(v=>parseMoney(v??0,{allowRounding:true,allowNegative:false}).cents):null,
    note:a.notes||"",origin:"legacy-allocation",createdAt:nowInstant()});
   report.counts.budgets++}
  catch(err){report.warnings.push({code:"BUDGET_MIGRATE",id:a?.id,message:err.message})}}
 lg.meta.legacyCatalog=(legacy.products||[]).map(p=>({name:p.name,priceRaw:p.price,unit:p.unit||"unknown",
  categoryId:p.category||null,store:p.store||null,notes:p.notes||"",history:Array.isArray(p.history)?p.history:[]}));
 lg.meta.legacyPlans=legacy.plans||[];lg.meta.legacyPlanRuns=legacy.planRuns||[];
 lg.meta.legacySettings={salary:legacy.salary??0,payday:legacy.payday??18,theme:legacy.theme||"dark",categories:legacy.categories||[]};
 lg.meta.migrationReport=report;lg.meta.migratedAt=nowInstant();
 report.finishedAt=nowInstant();report.ok=report.blockers.length===0;
 return{ledger:lg,report}}
export function summarizeReport(r){
 const L=["حركات دخل: "+r.counts.income,"فواتير مصروف: "+r.counts.purchase,"ميزانيات: "+r.counts.budgets,
  "سجلات تحتاج مراجعة: "+r.needsReview.length,"تحذيرات: "+r.warnings.length,"عوائق: "+r.blockers.length];
 if(r.cashComparison)L.push(r.cashComparison.matches?"✓ الرصيد مطابق: "+formatMoney(r.cashComparison.rebuiltFromLedger)+" دج"
  :"✗ فرق في الرصيد: "+formatMoney(r.cashComparison.difference??0)+" دج");
 return L.join("\n")}
