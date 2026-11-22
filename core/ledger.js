/* الدفتر: مصدر الحقيقة الوحيد. لا رصيد مخزّن في أي مكان. كل دالة نقية على كائن بالذاكرة.
   D1: BUDGET/SAVINGS_RESERVATION ليسا حسابين — فصلنا المستوى أ (نقد) عن المستوى ب (تخصيص).
   D2: أُضيف EQUITY/GAIN/EXPENSE:sys لأن الوثيقة أغفلتها وهي ضرورية رياضياً للتوازن.
   D3: «مساهمة فعلية» = مؤكَّدة من المستخدم، لا حركة نقدية. صفر قيود للتخصيص.
   D5: التعديل = عكس + إعادة ترحيل. لا UPDATE على سطر قيد أبداً. */
import{assertMoney,isMoney,CURRENCY}from"./money.js";
import{assertISODate,nowInstant,todayLocal}from"./dates.js";
export const SIDE={DEBIT:"DEBIT",CREDIT:"CREDIT"};
export const ACCOUNTS=Object.freeze({
 CASH:{kind:"ASSET",normal:"DEBIT",label:"النقد الفعلي"},
 RECEIVABLE:{kind:"ASSET",normal:"DEBIT",label:"حقوق لدى الغير"},
 EXPENSE:{kind:"EXPENSE",normal:"DEBIT",label:"المصروفات"},
 DEBT_LIABILITY:{kind:"LIABILITY",normal:"CREDIT",label:"ديون والتزامات"},
 INCOME:{kind:"INCOME",normal:"CREDIT",label:"الدخل المكتسب"},
 GAIN:{kind:"INCOME",normal:"CREDIT",label:"مكاسب غير تشغيلية"},
 EQUITY:{kind:"EQUITY",normal:"CREDIT",label:"صافي الملكية والتسويات"}});
export const EXPENSE_SUB=Object.freeze({FEES:"sys:fees",BAD_DEBT:"sys:bad_debt",ROUNDING:"sys:rounding"});
export const TX=Object.freeze({INCOME:"INCOME",EXPENSE:"EXPENSE",REFUND:"REFUND",DEBT_BORROWED:"DEBT_BORROWED",
 DEBT_PAYMENT:"DEBT_PAYMENT",DEBT_PRINCIPAL_PAYMENT:"DEBT_PRINCIPAL_PAYMENT",DEBT_INTEREST:"DEBT_INTEREST",
 DEBT_FORGIVEN:"DEBT_FORGIVEN",RECEIVABLE_GIVEN:"RECEIVABLE_GIVEN",RECEIVABLE_COLLECTED:"RECEIVABLE_COLLECTED",
 RECEIVABLE_WRITEOFF:"RECEIVABLE_WRITEOFF",ADJUSTMENT:"ADJUSTMENT",REVERSAL:"REVERSAL"});
const D="DEBIT",C="CREDIT";
export class LedgerError extends Error{constructor(c,m,d){super(m);this.name="LedgerError";this.code=c;this.details=d}}
const uid=p=>p+"_"+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36)+Math.random().toString(36).slice(2));
/* جدول الترحيل: بيانات لا منطق متناثر. الاسترجاع دائن EXPENSE بنفس تصنيف الأصل (D7). */
export const POSTING_RULES=Object.freeze({
 INCOME:t=>[{account:"CASH",side:D,amount:t.amount},{account:"INCOME",sub:t.sourceId,side:C,amount:t.amount}],
 EXPENSE:t=>[{account:"EXPENSE",sub:t.categoryId,side:D,amount:t.amount},{account:"CASH",side:C,amount:t.amount}],
 REFUND:t=>[{account:"CASH",side:D,amount:t.amount},{account:"EXPENSE",sub:t.refundCategory,side:C,amount:t.amount}],
 DEBT_BORROWED:t=>[{account:"CASH",side:D,amount:t.amount},{account:"DEBT_LIABILITY",sub:t.debtId,side:C,amount:t.amount}],
 DEBT_PAYMENT:t=>{const l=[];
  if(t.principal>0)l.push({account:"DEBT_LIABILITY",sub:t.debtId,side:D,amount:t.principal});
  if(t.interest>0)l.push({account:"EXPENSE",sub:EXPENSE_SUB.FEES,side:D,amount:t.interest});
  if(t.fees>0)l.push({account:"EXPENSE",sub:EXPENSE_SUB.FEES,side:D,amount:t.fees});
  l.push({account:"CASH",side:C,amount:t.amount});return l},
 DEBT_PRINCIPAL_PAYMENT:t=>[{account:"DEBT_LIABILITY",sub:t.debtId,side:D,amount:t.amount},{account:"CASH",side:C,amount:t.amount}],
 DEBT_INTEREST:t=>[{account:"EXPENSE",sub:EXPENSE_SUB.FEES,side:D,amount:t.amount},{account:"CASH",side:C,amount:t.amount}],
 DEBT_FORGIVEN:t=>[{account:"DEBT_LIABILITY",sub:t.debtId,side:D,amount:t.amount},{account:"GAIN",sub:"debt_forgiven",side:C,amount:t.amount}],
 RECEIVABLE_GIVEN:t=>[{account:"RECEIVABLE",sub:t.partyId,side:D,amount:t.amount},{account:"CASH",side:C,amount:t.amount}],
 RECEIVABLE_COLLECTED:t=>[{account:"CASH",side:D,amount:t.amount},{account:"RECEIVABLE",sub:t.partyId,side:C,amount:t.amount}],
 RECEIVABLE_WRITEOFF:t=>[{account:"EXPENSE",sub:EXPENSE_SUB.BAD_DEBT,side:D,amount:t.amount},{account:"RECEIVABLE",sub:t.partyId,side:C,amount:t.amount}],
 ADJUSTMENT:t=>t.amount>=0
  ?[{account:"CASH",side:D,amount:t.amount},{account:"EQUITY",sub:"adjustment",side:C,amount:t.amount}]
  :[{account:"EQUITY",sub:"adjustment",side:D,amount:-t.amount},{account:"CASH",side:C,amount:-t.amount}]});
const REQUIRED={INCOME:["sourceId"],EXPENSE:["categoryId"],REFUND:["refundCategory","originalTxId"],
 DEBT_BORROWED:["debtId"],DEBT_PAYMENT:["debtId"],DEBT_PRINCIPAL_PAYMENT:["debtId"],DEBT_INTEREST:["debtId"],
 DEBT_FORGIVEN:["debtId"],RECEIVABLE_GIVEN:["partyId"],RECEIVABLE_COLLECTED:["partyId"],
 RECEIVABLE_WRITEOFF:["partyId"],ADJUSTMENT:["reason"]};
export function createLedger(){return{meta:{currency:CURRENCY,scale:2,schemaVersion:3,createdAt:nowInstant()},
 transactions:[],entries:[],lines:[],goals:[],savingsEvents:[],budgets:[],audit:[]}}
export function assertBalanced(lines){
 if(!Array.isArray(lines)||lines.length<2)throw new LedgerError("EMPTY_ENTRY","القيد يحتاج سطرين على الأقل");
 let debit=0,credit=0;
 for(const l of lines){
  if(!ACCOUNTS[l.account])throw new LedgerError("UNKNOWN_ACCOUNT","حساب غير معروف: "+l.account);
  assertMoney(l.amount,"line.amount");
  if(l.amount<=0)throw new LedgerError("NON_POSITIVE_LINE","السطور موجبة؛ العكس بمبادلة الجهات لا بمبلغ سالب");
  if(l.side===D)debit+=l.amount;else if(l.side===C)credit+=l.amount;
  else throw new LedgerError("BAD_SIDE","جهة غير معروفة: "+l.side)}
 if(debit!==credit)throw new LedgerError("UNBALANCED","قيد غير متوازن: مدين "+debit+" / دائن "+credit,{debit,credit});
 return{debit,credit}}
function validateTx(lg,t){
 if(!t||typeof t!=="object")throw new LedgerError("BAD_TX","عملية غير صالحة");
 if(!POSTING_RULES[t.type])throw new LedgerError("UNKNOWN_TYPE","نوع عملية غير معروف: "+t.type);
 assertISODate(t.occurredOn,"occurredOn");
 if(!t.opId)throw new LedgerError("NO_OP_ID","كل عملية تحتاج opId لمنع التكرار");
 if(lg.transactions.some(x=>x.opId===t.opId))throw new LedgerError("DUPLICATE_OP","العملية "+t.opId+" مسجّلة مسبقاً",{opId:t.opId});
 for(const f of(REQUIRED[t.type]||[]))if(t[f]===undefined||t[f]===null||t[f]==="")throw new LedgerError("MISSING_FIELD","الحقل "+f+" مطلوب للعملية "+t.type);
 if(t.type===TX.DEBT_PAYMENT){
  const p=t.principal||0,i=t.interest||0,f=t.fees||0;
  [p,i,f].forEach(v=>assertMoney(v,"debt split"));
  if(p<0||i<0||f<0)throw new LedgerError("NEGATIVE_SPLIT","مكوّنات دفعة الدين لا تكون سالبة");
  if(p+i+f!==t.amount)throw new LedgerError("SPLIT_MISMATCH","مجموع المكوّنات ("+(p+i+f)+") لا يساوي الإجمالي ("+t.amount+")");
  if(p+i+f===0)throw new LedgerError("ZERO_PAYMENT","دفعة دين بمبلغ صفري");
 }else if(t.type===TX.ADJUSTMENT){
  if(!isMoney(t.amount)||t.amount===0)throw new LedgerError("BAD_AMOUNT","التسوية تحتاج مبلغاً غير صفري");
 }else if(!isMoney(t.amount)||t.amount<=0)throw new LedgerError("BAD_AMOUNT","المبلغ يجب أن يكون موجباً بالسنتيم");
 if(t.type===TX.REFUND){
  const o=lg.transactions.find(x=>x.id===t.originalTxId);
  if(!o)throw new LedgerError("NO_ORIGINAL","الاسترجاع يحتاج مصروفاً أصلياً موجوداً");
  if(o.type!==TX.EXPENSE)throw new LedgerError("NOT_EXPENSE","الاسترجاع يرتبط بمصروف فقط");
  if(t.refundCategory!==o.categoryId)throw new LedgerError("CATEGORY_MISMATCH","تصنيف الاسترجاع يجب أن يطابق الأصل");
  const already=lg.transactions.filter(x=>x.type===TX.REFUND&&x.originalTxId===t.originalTxId&&x.status==="POSTED").reduce((s,x)=>s+x.amount,0);
  const rem=o.amount-already;
  if(t.amount>rem)throw new LedgerError("REFUND_EXCEEDS","الاسترجاع ("+t.amount+") يتجاوز المتبقي ("+rem+")",{remaining:rem,already});
 }}
/* الذرية: تُبنى كل السجلات أولاً ثم تُدفع دفعة واحدة. أي فشل = لا تغيير إطلاقاً. */
export function post(lg,input){
 const t={...input};validateTx(lg,t);
 const raw=POSTING_RULES[t.type]({...t,principal:t.principal||0,interest:t.interest||0,fees:t.fees||0});
 const tot=assertBalanced(raw);
 const txId=uid("tx"),entryId=uid("je"),at=nowInstant();
 const txRec={id:txId,opId:t.opId,type:t.type,occurredOn:t.occurredOn,createdAt:at,updatedAt:at,
  amount:t.amount,currency:CURRENCY,categoryId:t.categoryId??null,sourceId:t.sourceId??null,debtId:t.debtId??null,
  partyId:t.partyId??null,originalTxId:t.originalTxId??null,refundCategory:t.refundCategory??null,goalId:t.goalId??null,
  note:t.note??"",reason:t.reason??null,principal:t.principal??null,interest:t.interest??null,fees:t.fees??null,
  status:"POSTED",reversedBy:null,reversalOf:t.reversalOf??null,correctionOf:t.correctionOf??null};
 const entryRec={id:entryId,txId,occurredOn:t.occurredOn,createdAt:at,kind:"NORMAL",reversedEntryId:null,
  memo:t.note??"",debit:tot.debit,credit:tot.credit};
 const lineRecs=raw.map((l,i)=>({id:entryId+":"+i,entryId,txId,account:l.account,sub:l.sub??null,side:l.side,
  amount:l.amount,occurredOn:t.occurredOn,createdAt:at,categoryId:l.account==="EXPENSE"?(l.sub??null):null}));
 const au={id:uid("au"),at,action:"POST",entityType:"transaction",entityId:txId,opId:t.opId,
  before:null,after:txRec,reason:t.reason??null,source:t.source??"ui"};
 lg.transactions.push(txRec);lg.entries.push(entryRec);lg.lines.push(...lineRecs);lg.audit.push(au);
 return{txId,entryId}}
export function reverse(lg,txId,{reason,occurredOn,opId,source="ui"}={}){
 if(!opId)throw new LedgerError("NO_OP_ID","العكس يحتاج opId");
 if(lg.transactions.some(x=>x.opId===opId))throw new LedgerError("DUPLICATE_OP","العملية "+opId+" مسجّلة مسبقاً");
 const o=lg.transactions.find(t=>t.id===txId);
 if(!o)throw new LedgerError("NOT_FOUND","الحركة الأصلية غير موجودة");
 if(o.status==="REVERSED")throw new LedgerError("ALREADY_REVERSED","لا يجوز عكس الحركة مرتين");
 if(o.type===TX.REVERSAL)throw new LedgerError("CANNOT_REVERSE_REVERSAL","قيد العكس لا يُعكس؛ صحّح بترحيل جديد");
 if(!reason||!String(reason).trim())throw new LedgerError("REASON_REQUIRED","العكس يحتاج سبباً موثقاً");
 const dependents=lg.transactions.filter(t=>t.status==="POSTED"&&(
  (t.type===TX.REFUND&&t.originalTxId===o.id)||
  (o.type===TX.DEBT_BORROWED&&t.debtId===o.debtId&&[TX.DEBT_PAYMENT,TX.DEBT_PRINCIPAL_PAYMENT,TX.DEBT_INTEREST,TX.DEBT_FORGIVEN].includes(t.type))||
  (o.type===TX.RECEIVABLE_GIVEN&&t.partyId===o.partyId&&[TX.RECEIVABLE_COLLECTED,TX.RECEIVABLE_WRITEOFF].includes(t.type))
 ));
 if(dependents.length)throw new LedgerError("DEPENDENT_TRANSACTIONS",
  "لا يمكن عكس الحركة قبل عكس العمليات التابعة لها",
  {transactionIds:dependents.map(t=>t.id),types:dependents.map(t=>t.type)});
 const oe=lg.entries.find(e=>e.txId===txId),ol=lg.lines.filter(l=>l.entryId===oe.id); const oe=lg.entries.find(e=>e.txId===txId),ol=lg.lines.filter(l=>l.entryId===oe.id);
 const mir=ol.map(l=>({account:l.account,sub:l.sub,side:l.side===D?C:D,amount:l.amount}));
 const tot=assertBalanced(mir);
 const when=occurredOn||todayLocal();assertISODate(when,"occurredOn");
 const at=nowInstant(),ntx=uid("tx"),nje=uid("je"),before={...o};
 const revTx={id:ntx,opId,type:TX.REVERSAL,occurredOn:when,createdAt:at,updatedAt:at,amount:o.amount,
  currency:CURRENCY,categoryId:o.categoryId,sourceId:o.sourceId,debtId:o.debtId,partyId:o.partyId,
  originalTxId:null,refundCategory:null,goalId:o.goalId,note:"عكس: "+(o.note||o.type),reason,
  principal:null,interest:null,fees:null,status:"POSTED",reversedBy:null,reversalOf:txId,correctionOf:null};
 const revEntry={id:nje,txId:ntx,occurredOn:when,createdAt:at,kind:"REVERSAL",reversedEntryId:oe.id,
  memo:reason,debit:tot.debit,credit:tot.credit};
 const revLines=mir.map((l,i)=>({id:nje+":"+i,entryId:nje,txId:ntx,account:l.account,sub:l.sub??null,
  side:l.side,amount:l.amount,occurredOn:when,createdAt:at,categoryId:l.account==="EXPENSE"?(l.sub??null):null}));
 o.status="REVERSED";o.reversedBy=ntx;o.updatedAt=at;
 lg.transactions.push(revTx);lg.entries.push(revEntry);lg.lines.push(...revLines);
 lg.audit.push({id:uid("au"),at,action:"REVERSE",entityType:"transaction",entityId:txId,opId,before,after:{...o},reason,source});
 return{txId:ntx,entryId:nje,reversedTxId:txId}}
export function correct(lg,txId,newInput,{reason,opIdReverse,opIdNew}={}){
 if(!newInput||typeof newInput!=="object")throw new LedgerError("BAD_CORRECTION","بيانات التصحيح غير صالحة");
 if(!reason||!String(reason).trim())throw new LedgerError("REASON_REQUIRED","التصحيح يحتاج سبباً موثقاً");
 if(!opIdReverse||!opIdNew||opIdReverse===opIdNew)
  throw new LedgerError("BAD_CORRECTION_OPS","التصحيح يحتاج معرفين مختلفين للعملية والعكس");
 const candidate={...lg,
  transactions:lg.transactions.map(x=>({...x})),
  entries:lg.entries.map(x=>({...x})),
  lines:lg.lines.map(x=>({...x})),
  audit:lg.audit.map(x=>({...x}))};
 const r=reverse(candidate,txId,{reason,occurredOn:newInput.occurredOn,opId:opIdReverse});
 const p=post(candidate,{...newInput,opId:opIdNew,correctionOf:r.reversedTxId,reason});
 lg.transactions=candidate.transactions;
 lg.entries=candidate.entries;
 lg.lines=candidate.lines;
 lg.audit=candidate.audit;
 return{...p,reversalTxId:r.txId}}
/* ── المستوى ب: الادخار. صفر قيود، صفر أثر على النقد ── */
export function createGoal(lg,{id,name,target,startOn,dueOn,note=""}){
 const gid=id||uid("goal");
 if(lg.goals.some(g=>g.id===gid))throw new LedgerError("DUP_GOAL","هدف موجود");
 if(target!==undefined&&target!==null)assertMoney(target,"target");
 assertISODate(startOn,"startOn");
 const g={id:gid,name,target:target??null,startOn,dueOn:dueOn??null,note,status:"ACTIVE",createdAt:nowInstant()};
 lg.goals.push(g);return g}
export function goalBalance(lg,goalId){let b=0;
 for(const e of lg.savingsEvents){if(e.goalId!==goalId)continue;
  if(e.kind==="ALLOCATE")b+=e.amount;else if(e.kind==="RELEASE"||e.kind==="PURCHASE_LINK")b-=e.amount}
 return b}
export function totalReserved(lg){return lg.goals.filter(g=>g.status==="ACTIVE")
 .reduce((s,g)=>s+Math.max(0,goalBalance(lg,g.id)),0)}
export function freeCash(lg,asOf){return rebuild(lg,asOf).nat.CASH-totalReserved(lg)}
function pushSavings(lg,ev){
 if(!ev.opId)throw new LedgerError("NO_OP_ID","حدث التخصيص يحتاج opId");
 if(lg.savingsEvents.some(e=>e.opId===ev.opId))throw new LedgerError("DUPLICATE_OP","الحدث "+ev.opId+" مسجّل مسبقاً");
 assertMoney(ev.amount,"savings amount");
 if(ev.amount<=0)throw new LedgerError("BAD_AMOUNT","مبلغ التخصيص يجب أن يكون موجباً");
 assertISODate(ev.occurredOn,"occurredOn");
 const rec={id:uid("sv"),createdAt:nowInstant(),...ev};
 lg.savingsEvents.push(rec);
 lg.audit.push({id:uid("au"),at:rec.createdAt,action:ev.kind,entityType:"savingsEvent",entityId:rec.id,
  opId:ev.opId,before:null,after:rec,reason:ev.reason??null,source:"ui"});
 return rec}
export function allocate(lg,{goalId,amount,occurredOn,opId,note="",allowUnfunded=false}){
 const g=lg.goals.find(x=>x.id===goalId);
 if(!g)throw new LedgerError("NO_GOAL","الهدف غير موجود");
 if(g.status!=="ACTIVE")throw new LedgerError("GOAL_INACTIVE","الهدف غير نشط");
 assertMoney(amount,"allocation");
 const free=freeCash(lg,occurredOn),unfunded=amount>free;
 if(unfunded&&!allowUnfunded)throw new LedgerError("ALLOCATION_EXCEEDS_CASH",
  "التخصيص ("+amount+") يتجاوز النقد غير المخصص ("+free+")",{free,requested:amount});
 return pushSavings(lg,{goalId,kind:"ALLOCATE",amount,occurredOn,opId,note,unfunded})}
export function release(lg,{goalId,amount,occurredOn,opId,reason=""}){
 const bal=goalBalance(lg,goalId);assertMoney(amount,"release");
 if(amount>bal)throw new LedgerError("RELEASE_EXCEEDS","التحرير ("+amount+") يتجاوز رصيد الهدف ("+bal+")");
 return pushSavings(lg,{goalId,kind:"RELEASE",amount,occurredOn,opId,reason})}
/* §7.4: مصروف واحد فقط. النقد ينخفض مرة ورصيد الهدف مرة.
   D4: إن تجاوز الثمن رصيد الهدف يُحرَّر بحد الرصيد والباقي مصروف حر. */
export function purchaseFromGoal(lg,{goalId,amount,categoryId,occurredOn,opId,note=""}){
 assertMoney(amount,"purchase");
 const bal=goalBalance(lg,goalId);
 if(bal<0)throw new LedgerError("NEGATIVE_GOAL","رصيد الهدف سالب — بيانات تالفة");
 const released=Math.min(amount,bal);
 const{txId,entryId}=post(lg,{type:TX.EXPENSE,amount,categoryId,occurredOn,opId,note,goalId});
 if(released>0)pushSavings(lg,{goalId,kind:"PURCHASE_LINK",amount:released,occurredOn,opId:opId+":link",
  txId,purchaseAmount:amount,note:"شراء مرتبط بالهدف"});
 return{txId,entryId,releasedFromGoal:released,fromFreeCash:amount-released}}
/* ── إعادة البناء: السلطة العليا. لا تقرأ أي رصيد مخزّن ── */
export function rebuild(lg,asOf=null){
 if(asOf)assertISODate(asOf,"asOf");
 const balances=Object.create(null);let debitTotal=0,creditTotal=0,lineCount=0;
 for(const l of lg.lines){
  if(asOf&&l.occurredOn>asOf)continue;
  const acc=ACCOUNTS[l.account];
  if(!acc)throw new LedgerError("UNKNOWN_ACCOUNT","سطر بحساب غير معروف: "+l.account);
  const signed=l.side===acc.normal?l.amount:-l.amount;
  balances[l.account]=(balances[l.account]||0)+l.amount*(l.side===D?1:-1);
  const k=l.account+":"+(l.sub??"*");
  balances[k]=(balances[k]||0)+signed;
  if(l.side===D)debitTotal+=l.amount;else creditTotal+=l.amount;
  lineCount++}
 const nat=Object.create(null);
 for(const code of Object.keys(ACCOUNTS)){const raw=balances[code]||0;
  nat[code]=ACCOUNTS[code].normal===D?raw:-raw}
 return{asOf,balances,nat,debitTotal,creditTotal,balanced:debitTotal===creditTotal,lineCount}}
export function balanceOf(snap,account,sub=undefined){
 if(sub===undefined)return snap.nat[account]||0;
 return snap.balances[account+":"+(sub??"*")]||0}
export function positions(lg,asOf=null){
 const s=rebuild(lg,asOf),cash=s.nat.CASH||0,recv=s.nat.RECEIVABLE||0,debt=s.nat.DEBT_LIABILITY||0;
 const reserved=totalReserved(lg),funded=Math.min(reserved,Math.max(0,cash));
 return{asOf,cash,reserved,fundedReserved:funded,available:Math.max(0,cash-funded),
  unfundedGap:Math.max(0,reserved-Math.max(0,cash)),receivables:recv,debts:debt,
  netWorth:cash+recv-debt,earnedIncome:s.nat.INCOME||0,gains:s.nat.GAIN||0,expense:s.nat.EXPENSE||0,
  consumptionExpense:(s.nat.EXPENSE||0)-balanceOf(s,"EXPENSE",EXPENSE_SUB.BAD_DEBT),
  fees:balanceOf(s,"EXPENSE",EXPENSE_SUB.FEES),badDebt:balanceOf(s,"EXPENSE",EXPENSE_SUB.BAD_DEBT),
  trialBalance:{debit:s.debitTotal,credit:s.creditTotal,balanced:s.balanced},lineCount:s.lineCount}}
export function cashStatement(lg,{from=null,to=null}={}){
 const rows=[];let running=0,opening=0;
 const sorted=lg.lines.filter(l=>l.account==="CASH").sort((a,b)=>
  a.occurredOn<b.occurredOn?-1:a.occurredOn>b.occurredOn?1:(a.createdAt<b.createdAt?-1:1));
 for(const l of sorted){
  const delta=l.side===D?l.amount:-l.amount;
  if(from&&l.occurredOn<from){running+=delta;opening=running;continue}
  if(to&&l.occurredOn>to)break;
  running+=delta;
  const tx=lg.transactions.find(t=>t.id===l.txId);
  rows.push({occurredOn:l.occurredOn,createdAt:l.createdAt,txId:l.txId,type:tx?.type,note:tx?.note||"",delta,running})}
 return{openingBefore:opening,rows,closing:running}}
export function integrityCheck(lg){
 const problems=[],snap=rebuild(lg);
 if(!snap.balanced)problems.push({code:"TRIAL_UNBALANCED",debit:snap.debitTotal,credit:snap.creditTotal});
 const eids=new Set(lg.entries.map(e=>e.id)),tids=new Set(lg.transactions.map(t=>t.id));
 for(const l of lg.lines){
  if(!eids.has(l.entryId))problems.push({code:"ORPHAN_LINE",lineId:l.id});
  if(!isMoney(l.amount)||l.amount<=0)problems.push({code:"BAD_LINE_AMOUNT",lineId:l.id})}
 for(const e of lg.entries){
  if(!tids.has(e.txId))problems.push({code:"ORPHAN_ENTRY",entryId:e.id});
  try{assertBalanced(lg.lines.filter(l=>l.entryId===e.id))}
  catch(err){problems.push({code:"ENTRY_UNBALANCED",entryId:e.id,message:err.message})}}
 const ops=new Set();
 for(const t of lg.transactions){if(ops.has(t.opId))problems.push({code:"DUPLICATE_OP",opId:t.opId});ops.add(t.opId)}
 for(const g of lg.goals)if(goalBalance(lg,g.id)<0)problems.push({code:"NEGATIVE_GOAL",goalId:g.id});
 return{ok:problems.length===0,problems,snapshot:snap}}
