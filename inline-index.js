
(function(){"use strict";try{if(localStorage.getItem("mz-purge")!=="v7"){localStorage.setItem("mz-purge","v7");if(window.caches)caches.keys().then(function(k){for(var i=0;i<k.length;i++)caches.delete(k[i])});if(navigator.serviceWorker)navigator.serviceWorker.getRegistrations().then(function(r){for(var i=0;i<r.length;i++)r[i].unregister()});}}catch(e){}
/* ══════════════ المال: سنتيم صحيح ══════════════ */
function normNum(raw){var s=String(raw).trim().replace(/[\s\u00A0\u202F_']/g,""),lc=s.lastIndexOf(","),ld=s.lastIndexOf(".");
 if(lc>=0&&ld>=0){s=lc>ld?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"")}
 else if(lc>=0){var p=s.split(",");s=(p.length===2&&/^\d{1,2}$/.test(p[1]))?p[0]+"."+p[1]:s.replace(/,/g,"")}
 return s}
var M={
 is:function(v){return Number.isSafeInteger(v)},
 assert:function(v,l){if(!Number.isSafeInteger(v))throw E("NOT_INTEGER",(l||"المبلغ")+" يجب أن يكون عدداً صحيحاً بالسنتيم");return v},
 parse:function(input,opt){opt=opt||{};
  if(input===null||input===undefined||input==="")throw E("EMPTY","المبلغ فارغ");
  var s=normNum(input);
  if(!s||s==="-")throw E("EMPTY","المبلغ فارغ");
  var neg=false;if(s[0]==="-"){neg=true;s=s.slice(1)}else if(s[0]==="+")s=s.slice(1);
  if(!/^\d+(\.\d+)?$/.test(s))throw E("BAD_FORMAT","صيغة مبلغ غير صالحة: "+input);
  var dot=s.indexOf("."),ip=dot<0?s:s.slice(0,dot),fr=dot<0?"":s.slice(dot+1);
  var c=Number(ip)*100+Number((fr+"00").slice(0,2)),ex=fr.slice(2),rounded=false;
  if(/[1-9]/.test(ex)){if(!opt.allowRounding)throw E("SUB_CENT","المبلغ أدق من السنتيم: "+input);
   if(Number(ex[0])>=5)c+=1;rounded=true}
  M.assert(c);return{cents:neg?-c:c,rounded:rounded}},
 cents:function(i,o){return M.parse(i,o).cents},
 fmt:function(c,o){o=o||{};M.assert(c,"العرض");
  var neg=c<0,a=Math.abs(c),maj=String(Math.floor(a/100)).replace(/\B(?=(\d{3})+(?!\d))/g,","),min=a%100;
  return(neg?"−":"")+maj+((min||o.alwaysMinor)?"."+String(min).padStart(2,"0"):"")+(o.cur?" دج":"")},
 short:function(c){var a=Math.abs(c);if(a>=100000000)return(c/100000000).toFixed(1)+"م";
  if(a>=100000)return Math.round(c/100000)+"ك";return M.fmt(c)},
 qty:function(i){var s=String(i==null?"":i).trim().replace(/[\s\u00A0\u202F]/g,"");s=(s.indexOf(".")<0&&s.split(",").length===2)?s.replace(",","."):s.replace(/,/g,"");
  if(!/^\d+(\.\d{1,3})?$/.test(s))throw E("BAD_QTY","كمية غير صالحة: "+i);
  var d=s.indexOf("."),ip=d<0?s:s.slice(0,d),fp=((d<0?"":s.slice(d+1))+"000").slice(0,3);
  return Number(ip)*1000+Number(fp)},
 fmtQty:function(q){var w=Math.floor(Math.abs(q)/1000),f=Math.abs(q)%1000;
  return(q<0?"−":"")+w+(f?"."+String(f).padStart(3,"0").replace(/0+$/,""):"")},
 divRound:function(n,d){return(n<0?-1:1)*Math.floor((Math.abs(n)+Math.floor(d/2))/d)},
 line:function(q,p){M.assert(q,"الكمية");M.assert(p,"السعر");
  if(q<0||p<0)throw E("NEG_LINE","كمية أو سعر سالب");
  var v=q*p;if(!Number.isSafeInteger(v))throw E("OVERFLOW","تجاوز المدى");return M.divRound(v,1000)},
 sum:function(a){var s=0;for(var i=0;i<a.length;i++)s+=M.assert(a[i],"سطر");return M.assert(s,"الإجمالي")}
};
function E(code,msg){var e=new Error(msg);e.code=code;return e}
/* ══════════════ التقويم: بلا Date في الحساب ══════════════ */
var ARM=["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
var ARD=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
function dfc(y,m,d){var yy=y-(m<=2?1:0),era=Math.floor(yy/400),yoe=yy-era*400,mp=m+(m>2?-3:9);
 var doy=Math.floor((153*mp+2)/5)+d-1;return era*146097+(yoe*365+Math.floor(yoe/4)-Math.floor(yoe/100)+doy)-719468}
function cfd(z0){var z=z0+719468,era=Math.floor(z/146097),doe=z-era*146097;
 var yoe=Math.floor((doe-Math.floor(doe/1460)+Math.floor(doe/36524)-Math.floor(doe/146096))/365);
 var y=yoe+era*400,doy=doe-(365*yoe+Math.floor(yoe/4)-Math.floor(yoe/100)),mp=Math.floor((5*doy+2)/153);
 var d=doy-Math.floor((153*mp+2)/5)+1,m=mp+(mp<10?3:-9);return{y:y+(m<=2?1:0),m:m,d:d}}
var D={
 leap:function(y){return(y%4===0&&y%100!==0)||y%400===0},
 dim:function(y,m){return[31,D.leap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1]},
 valid:function(s){if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  var p=s.split("-").map(Number);return p[1]>=1&&p[1]<=12&&p[2]>=1&&p[2]<=D.dim(p[0],p[1])},
 assert:function(s,l){if(!D.valid(s))throw E("BAD_DATE","تاريخ غير صالح ("+(l||"")+"): "+s);return s},
 iso:function(y,m,d){return D.assert(String(y).padStart(4,"0")+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0"))},
 parse:function(s){D.assert(s);var p=s.split("-").map(Number);return{y:p[0],m:p[1],d:p[2]}},
 num:function(s){var p=D.parse(s);return dfc(p.y,p.m,p.d)},
 fromNum:function(n){var c=cfd(n);return D.iso(c.y,c.m,c.d)},
 add:function(s,n){return D.fromNum(D.num(s)+n)},
 diff:function(a,b){return D.num(b)-D.num(a)},
 dow:function(s){return((D.num(s)+4)%7+7)%7},
 weekStart:function(s,ws){ws=ws==null?6:ws;return D.add(s,-((D.dow(s)-ws+7)%7))},
 mkey:function(s){return D.assert(s).slice(0,7)},
 mrange:function(k){var p=k.split("-").map(Number);return{start:D.iso(p[0],p[1],1),end:D.iso(p[0],p[1],D.dim(p[0],p[1]))}},
 addM:function(k,n){var p=k.split("-").map(Number),t=p[0]*12+(p[1]-1)+n;
  return String(Math.floor(t/12)).padStart(4,"0")+"-"+String((t%12+12)%12+1).padStart(2,"0")},
 clamp:function(y,m,a){return Math.min(a,D.dim(y,m))},
 monthly:function(k,a){var p=k.split("-").map(Number);return D.iso(p[0],p[1],D.clamp(p[0],p[1],a))},
 today:function(d){d=d||new Date();return D.iso(d.getFullYear(),d.getMonth()+1,d.getDate())},
 now:function(){return new Date().toISOString()},
 period:function(n,t,ws){var y=D.parse(t).y;
  if(n==="today")return{start:t,end:t,label:"اليوم"};
  if(n==="week"){var s=D.weekStart(t,ws);return{start:s,end:D.add(s,6),label:"هذا الأسبوع"}}
  if(n==="lastMonth"){var r=D.mrange(D.addM(D.mkey(t),-1));return{start:r.start,end:r.end,label:"الشهر السابق"}}
  if(n==="year")return{start:D.iso(y,1,1),end:D.iso(y,12,31),label:"هذه السنة"};
  if(n==="all")return{start:"0001-01-01",end:"9999-12-31",label:"كل الفترات"};
  var m=D.mrange(D.mkey(t));return{start:m.start,end:m.end,label:"هذا الشهر"}},
 cycle:function(t,pd){var p=D.parse(t),k=D.iso(p.y,p.m,1).slice(0,7);
  if(p.d<D.clamp(p.y,p.m,pd))k=D.addM(k,-1);
  var a=k.split("-").map(Number),st=D.iso(a[0],a[1],D.clamp(a[0],a[1],pd));
  var nk=D.addM(k,1).split("-").map(Number),ns=D.iso(nk[0],nk[1],D.clamp(nk[0],nk[1],pd));
  return{start:st,end:D.add(ns,-1),label:"دورة الراتب"}},
 mLabel:function(k){var p=k.split("-").map(Number);return ARM[p[1]-1]+" "+p[0]},
 mShort:function(k){return ARM[Number(k.split("-")[1])-1]},
 full:function(s){var p=D.parse(s);return ARD[D.dow(s)]+" "+p.d+" "+ARM[p.m-1]+" "+p.y},
 dayName:function(s){return ARD[D.dow(s)]}
};
/* ══════════════ دفتر الأستاذ ══════════════ */
var DB="DEBIT",CR="CREDIT";
var ACC={CASH:{k:"A",n:DB,l:"النقد الفعلي"},RECEIVABLE:{k:"A",n:DB,l:"حقوق لدى الغير"},
 EXPENSE:{k:"E",n:DB,l:"المصروفات"},DEBT:{k:"L",n:CR,l:"ديون عليّ"},
 INCOME:{k:"I",n:CR,l:"الدخل المكتسب"},GAIN:{k:"I",n:CR,l:"مكاسب غير تشغيلية"},EQUITY:{k:"Q",n:CR,l:"التسويات"}};
var SUB={FEES:"sys:fees",BAD:"sys:bad_debt"};
var LBL={INCOME:"دخل",EXPENSE:"مصروف",REFUND:"استرجاع",BORROW:"قرض مستلم",DEBT_PAY:"تسديد دين",
 FORGIVE:"إعفاء من دين",LEND:"إقراض",COLLECT:"تحصيل حق",WRITEOFF:"حق معدوم",ADJUST:"تسوية",REVERSAL:"عكس"};
var INC_TYPES=["INCOME","REFUND","BORROW","COLLECT","FORGIVE"];
var RULES={
 INCOME:function(t){return[{a:"CASH",s:DB,v:t.amount},{a:"INCOME",b:t.sourceId,s:CR,v:t.amount}]},
 EXPENSE:function(t){return[{a:"EXPENSE",b:t.categoryId,s:DB,v:t.amount},{a:"CASH",s:CR,v:t.amount}]},
 REFUND:function(t){return[{a:"CASH",s:DB,v:t.amount},{a:"EXPENSE",b:t.categoryId,s:CR,v:t.amount}]},
 BORROW:function(t){return[{a:"CASH",s:DB,v:t.amount},{a:"DEBT",b:t.partyId,s:CR,v:t.amount}]},
 DEBT_PAY:function(t){var l=[];if(t.principal>0)l.push({a:"DEBT",b:t.partyId,s:DB,v:t.principal});
  if(t.fees>0)l.push({a:"EXPENSE",b:SUB.FEES,s:DB,v:t.fees});l.push({a:"CASH",s:CR,v:t.amount});return l},
 FORGIVE:function(t){return[{a:"DEBT",b:t.partyId,s:DB,v:t.amount},{a:"GAIN",b:"forgiven",s:CR,v:t.amount}]},
 LEND:function(t){return[{a:"RECEIVABLE",b:t.partyId,s:DB,v:t.amount},{a:"CASH",s:CR,v:t.amount}]},
 COLLECT:function(t){return[{a:"CASH",s:DB,v:t.amount},{a:"RECEIVABLE",b:t.partyId,s:CR,v:t.amount}]},
 WRITEOFF:function(t){return[{a:"EXPENSE",b:SUB.BAD,s:DB,v:t.amount},{a:"RECEIVABLE",b:t.partyId,s:CR,v:t.amount}]},
 ADJUST:function(t){return t.amount>=0?[{a:"CASH",s:DB,v:t.amount},{a:"EQUITY",b:"adj",s:CR,v:t.amount}]
  :[{a:"EQUITY",b:"adj",s:DB,v:-t.amount},{a:"CASH",s:CR,v:-t.amount}]}
};
var REQ={INCOME:["sourceId"],EXPENSE:["categoryId"],REFUND:["categoryId","originalTxId"],BORROW:["partyId"],
 DEBT_PAY:["partyId"],FORGIVE:["partyId"],LEND:["partyId"],COLLECT:["partyId"],WRITEOFF:["partyId"],ADJUST:["reason"]};
var seq=0;
function uid(p){return p+"_"+Date.now().toString(36)+"_"+(++seq).toString(36)+Math.random().toString(36).slice(2,6)}
function balanced(ls){if(!ls||ls.length<2)throw E("EMPTY_ENTRY","القيد يحتاج سطرين");
 var d=0,c=0;for(var i=0;i<ls.length;i++){var l=ls[i];
  if(!ACC[l.a])throw E("BAD_ACCOUNT","حساب غير معروف: "+l.a);
  M.assert(l.v);if(l.v<=0)throw E("NON_POSITIVE","سطور القيد موجبة");
  if(l.s===DB)d+=l.v;else if(l.s===CR)c+=l.v;else throw E("BAD_SIDE","جهة غير معروفة")}
 if(d!==c)throw E("UNBALANCED","قيد غير متوازن: "+d+" / "+c);return{d:d,c:c}}
function newLedger(){return{
 transactions:[],entries:[],lines:[],goals:[],savings:[],budgets:[],commitments:[],occurrences:[],
 parties:[],items:[],prices:[],invoices:[],audit:[],
 settings:{theme:"dark",weekStart:6,payday:18,period:"month",demo:false,
  categories:[["food","مواد غذائية","🛒","#E0A458"],["veg","خضر وفواكه","🥬","#5FBF7F"],["meat","لحوم وأسماك","🍗","#D96C6C"],
   ["bread","خبز","🥖","#C9A227"],["transport","نقل ووقود","⛽","#5B8FF9"],["home","سكن وإيجار","🏠","#9B7EDE"],
   ["util","كهرباء وماء وغاز","💡","#4ECDC4"],["net","إنترنت وهاتف","📶","#6C8EBF"],["health","صحة","⚕","#F06292"],
   ["edu","تعليم","📚","#7986CB"],["clothes","ملابس","👕","#FF8A65"],["family","أسرة","👨‍👩‍👧","#A1887F"],
   ["fun","ترفيه","🎬","#BA68C8"],["tax","ضرائب ورسوم","🧾","#90A4AE"],["other","أخرى","📦","#8FA0B8"]],
  sources:[["salary","راتب","💼"],["extra","عمل إضافي","⚡"],["gift","هدية","🎁"],["sale","بيع ممتلكات","🏷"],
   ["side","نشاط جانبي","🛠"],["other","أخرى","📥"]]}}}
function partyBal(lg,pid,acc){var s=0;for(var i=0;i<lg.lines.length;i++){var l=lg.lines[i];
 if(l.account===acc&&l.sub===pid)s+=l.side===ACC[acc].n?l.amount:-l.amount}return s}
function validate(lg,t){
 if(!RULES[t.type])throw E("UNKNOWN_TYPE","نوع غير معروف: "+t.type);
 D.assert(t.occurredOn,"تاريخ الوقوع");
 if(!t.opId)throw E("NO_OP","العملية تحتاج معرّف");
 for(var i=0;i<lg.transactions.length;i++)if(lg.transactions[i].opId===t.opId)throw E("DUP_OP","العملية مسجّلة مسبقاً");
 var req=REQ[t.type]||[];
 for(var j=0;j<req.length;j++)if(!t[req[j]]&&t[req[j]]!==0)throw E("MISSING","حقل مطلوب: "+req[j]);
 if(t.type==="DEBT_PAY"){var p=t.principal||0,f=t.fees||0;M.assert(p);M.assert(f);
  if(p<0||f<0)throw E("NEG_SPLIT","مكوّنات سالبة");
  if(p+f!==t.amount)throw E("SPLIT","مجموع المكوّنات لا يساوي الإجمالي");
  if(p+f===0)throw E("ZERO","دفعة صفرية");
  if(p>partyBal(lg,t.partyId,"DEBT"))throw E("OVERPAY","أصل الدفعة يتجاوز الدين المتبقي");
 }else if(t.type==="ADJUST"){if(!M.is(t.amount)||!t.amount)throw E("BAD_AMOUNT","تسوية صفرية")}
 else if(!M.is(t.amount)||t.amount<=0)throw E("BAD_AMOUNT","المبلغ يجب أن يكون موجباً");
 if(t.type==="REFUND"){var o=null;
  for(var k=0;k<lg.transactions.length;k++)if(lg.transactions[k].id===t.originalTxId)o=lg.transactions[k];
  if(!o)throw E("NO_ORIG","المصروف الأصلي غير موجود");
  if(o.type!=="EXPENSE")throw E("NOT_EXPENSE","الاسترجاع يرتبط بمصروف");
  var done=0;for(var q=0;q<lg.transactions.length;q++){var x=lg.transactions[q];
   if(x.type==="REFUND"&&x.originalTxId===o.id&&x.status==="POSTED")done+=x.amount}
  if(t.amount>o.amount-done)throw E("REFUND_EXCEEDS","الاسترجاع يتجاوز المتبقي ("+M.fmt(o.amount-done)+" دج)")}
 if(t.type==="COLLECT"&&t.amount>partyBal(lg,t.partyId,"RECEIVABLE"))throw E("OVERCOLLECT","التحصيل يتجاوز الحق المتبقي");
}
function post(lg,input){
 var t={};for(var k in input)t[k]=input[k];
 validate(lg,t);
 var raw=RULES[t.type]({amount:t.amount,sourceId:t.sourceId,categoryId:t.categoryId,partyId:t.partyId,
  principal:t.principal||0,fees:t.fees||0});
 var tot=balanced(raw),id=uid("tx"),eid=uid("je"),at=D.now();
 var rec={id:id,opId:t.opId,type:t.type,occurredOn:t.occurredOn,createdAt:at,amount:t.amount,
  title:t.title||LBL[t.type],categoryId:t.categoryId||null,sourceId:t.sourceId||null,partyId:t.partyId||null,
  originalTxId:t.originalTxId||null,goalId:t.goalId||null,occurrenceId:t.occurrenceId||null,invoiceId:t.invoiceId||null,
  note:t.note||"",reason:t.reason||null,principal:t.principal||0,fees:t.fees||0,
  status:"POSTED",reversedBy:null,reversalOf:null,correctionOf:t.correctionOf||null};
 var entry={id:eid,txId:id,occurredOn:t.occurredOn,createdAt:at,debit:tot.d,credit:tot.c};
 var ls=raw.map(function(l,i){return{id:eid+":"+i,entryId:eid,txId:id,account:l.a,sub:l.b||null,side:l.s,
  amount:l.v,occurredOn:t.occurredOn,createdAt:at}});
 lg.transactions.push(rec);lg.entries.push(entry);Array.prototype.push.apply(lg.lines,ls);
 lg.audit.push({id:uid("au"),at:at,action:"POST",entity:"transaction",entityId:id,opId:t.opId,
  title:rec.title,reason:t.reason||null});
 if(t.occurrenceId){for(var z=0;z<lg.occurrences.length;z++){var oc=lg.occurrences[z];
  if(oc.id===t.occurrenceId){oc.paid=(oc.paid||0)+(t.type==="DEBT_PAY"?(t.principal||0):t.amount);
   oc.txIds=(oc.txIds||[]).concat(id);oc.status=oc.paid>=oc.amount?"PAID":"PARTIAL"}}}
 return{txId:id,entryId:eid}}
function reverse(lg,txId,o){o=o||{};
 if(!o.opId)throw E("NO_OP","العكس يحتاج معرّف");
 for(var i=0;i<lg.transactions.length;i++)if(lg.transactions[i].opId===o.opId)throw E("DUP_OP","مكرر");
 var t=null;for(var j=0;j<lg.transactions.length;j++)if(lg.transactions[j].id===txId)t=lg.transactions[j];
 if(!t)throw E("NOT_FOUND","الحركة غير موجودة");
 if(t.status==="REVERSED")throw E("ALREADY","لا يجوز العكس مرتين");
 if(t.type==="REVERSAL")throw E("REV_REV","قيد العكس لا يُعكس");
 if(!o.reason||!String(o.reason).trim())throw E("REASON","العكس يحتاج سبباً");
 var e=null;for(var q=0;q<lg.entries.length;q++)if(lg.entries[q].txId===txId)e=lg.entries[q];
 var mir=lg.lines.filter(function(l){return l.entryId===e.id}).map(function(l){
  return{a:l.account,b:l.sub,s:l.side===DB?CR:DB,v:l.amount}});
 var tot=balanced(mir),when=o.occurredOn||D.today();D.assert(when);
 var at=D.now(),nid=uid("tx"),neid=uid("je");
 var rec={id:nid,opId:o.opId,type:"REVERSAL",occurredOn:when,createdAt:at,amount:t.amount,
  title:"عكس: "+t.title,categoryId:t.categoryId,sourceId:t.sourceId,partyId:t.partyId,originalTxId:null,
  goalId:t.goalId,occurrenceId:t.occurrenceId,invoiceId:null,note:o.reason,reason:o.reason,principal:0,fees:0,
  status:"POSTED",reversedBy:null,reversalOf:txId,correctionOf:null};
 var entry={id:neid,txId:nid,occurredOn:when,createdAt:at,debit:tot.d,credit:tot.c};
 var ls=mir.map(function(l,i){return{id:neid+":"+i,entryId:neid,txId:nid,account:l.a,sub:l.b||null,side:l.s,
  amount:l.v,occurredOn:when,createdAt:at}});
 t.status="REVERSED";t.reversedBy=nid;
 lg.transactions.push(rec);lg.entries.push(entry);Array.prototype.push.apply(lg.lines,ls);
 lg.audit.push({id:uid("au"),at:at,action:"REVERSE",entity:"transaction",entityId:txId,opId:o.opId,
  title:rec.title,reason:o.reason});
 if(t.occurrenceId)for(var z=0;z<lg.occurrences.length;z++){var oc=lg.occurrences[z];
  if(oc.id===t.occurrenceId){oc.paid=Math.max(0,(oc.paid||0)-(t.type==="DEBT_PAY"?(t.principal||0):t.amount));
   oc.txIds=(oc.txIds||[]).filter(function(x){return x!==txId});
   oc.status=oc.paid>0?"PARTIAL":(oc.dueOn<D.today()?"OVERDUE":"DUE")}}
 if(t.goalId&&t.type==="EXPENSE"){var ev=null;
  for(var w=0;w<lg.savings.length;w++)if(lg.savings[w].txId===txId&&lg.savings[w].kind==="LINK")ev=lg.savings[w];
  if(ev)lg.savings.push({id:uid("sv"),opId:o.opId+":sv",goalId:t.goalId,kind:"ALLOCATE",amount:ev.amount,
   occurredOn:when,createdAt:at,note:"استرجاع تخصيص بعد عكس الشراء"})}
 return{txId:nid}}
function correct(lg,txId,next,o){reverse(lg,txId,{reason:o.reason,occurredOn:next.occurredOn,opId:o.opId+"r"});
 var n={};for(var k in next)n[k]=next[k];n.opId=o.opId+"n";n.correctionOf=txId;n.reason=o.reason;return post(lg,n)}
function goalBal(lg,id){var b=0;for(var i=0;i<lg.savings.length;i++){var e=lg.savings[i];
 if(e.goalId===id)b+=e.kind==="ALLOCATE"?e.amount:-e.amount}return b}
function reserved(lg){var s=0;for(var i=0;i<lg.goals.length;i++){var g=lg.goals[i];
 if(g.status==="ACTIVE")s+=Math.max(0,goalBal(lg,g.id))}return s}
function savEvent(lg,ev){if(!ev.opId)throw E("NO_OP","حدث بلا معرّف");
 for(var i=0;i<lg.savings.length;i++)if(lg.savings[i].opId===ev.opId)throw E("DUP_OP","مكرر");
 M.assert(ev.amount);if(ev.amount<=0)throw E("BAD_AMOUNT","مبلغ موجب مطلوب");D.assert(ev.occurredOn);
 var r={id:uid("sv"),createdAt:D.now()};for(var k in ev)r[k]=ev[k];
 lg.savings.push(r);lg.audit.push({id:uid("au"),at:r.createdAt,action:ev.kind,entity:"savings",
  entityId:r.id,opId:ev.opId,title:r.note||ev.kind,reason:ev.reason||null});return r}
function allocate(lg,o){var g=null;for(var i=0;i<lg.goals.length;i++)if(lg.goals[i].id===o.goalId)g=lg.goals[i];
 if(!g)throw E("NO_GOAL","الهدف غير موجود");
 if(g.status!=="ACTIVE")throw E("INACTIVE","الهدف غير نشط");
 var free=rebuild(lg,o.occurredOn).nat.CASH-reserved(lg);
 if(o.amount>free&&!o.allowUnfunded)throw E("EXCEEDS","التخصيص يتجاوز المتاح ("+M.fmt(Math.max(0,free))+" دج)");
 return savEvent(lg,{goalId:o.goalId,kind:"ALLOCATE",amount:o.amount,occurredOn:o.occurredOn,opId:o.opId,
  note:o.note||"",unfunded:o.amount>free})}
function release(lg,o){var b=goalBal(lg,o.goalId);
 if(o.amount>b)throw E("EXCEEDS","التحرير يتجاوز رصيد الهدف ("+M.fmt(b)+" دج)");
 return savEvent(lg,{goalId:o.goalId,kind:"RELEASE",amount:o.amount,occurredOn:o.occurredOn,opId:o.opId,reason:o.reason||"تحرير"})}
function goalPurchase(lg,o){var b=Math.max(0,goalBal(lg,o.goalId)),rel=Math.min(o.amount,b);
 var r=post(lg,{type:"EXPENSE",amount:o.amount,categoryId:o.categoryId,occurredOn:o.occurredOn,
  opId:o.opId,title:o.title,note:o.note||"",goalId:o.goalId});
 if(rel>0)savEvent(lg,{goalId:o.goalId,kind:"LINK",amount:rel,occurredOn:o.occurredOn,opId:o.opId+":l",
  txId:r.txId,note:"شراء من الهدف"});
 r.released=rel;return r}
function rebuild(lg,asOf){if(asOf)D.assert(asOf);
 var bal={},dt=0,ct=0,n=0;
 for(var i=0;i<lg.lines.length;i++){var l=lg.lines[i];
  if(asOf&&l.occurredOn>asOf)continue;
  var a=ACC[l.account];if(!a)throw E("BAD_ACCOUNT",l.account);
  bal[l.account]=(bal[l.account]||0)+l.amount*(l.side===DB?1:-1);
  var k=l.account+":"+(l.sub||"*");
  bal[k]=(bal[k]||0)+(l.side===a.n?l.amount:-l.amount);
  if(l.side===DB)dt+=l.amount;else ct+=l.amount;n++}
 var nat={};for(var c in ACC){var r=bal[c]||0;nat[c]=ACC[c].n===DB?r:-r}
 return{bal:bal,nat:nat,debit:dt,credit:ct,balanced:dt===ct,count:n}}
function subBal(s,a,b){return s.bal[a+":"+(b||"*")]||0}
function positions(lg,asOf){var s=rebuild(lg,asOf),cash=s.nat.CASH||0,rec=s.nat.RECEIVABLE||0,debt=s.nat.DEBT||0;
 var res=reserved(lg),funded=Math.min(res,Math.max(0,cash));
 return{cash:cash,reserved:res,funded:funded,available:Math.max(0,cash-funded),
  gap:Math.max(0,res-Math.max(0,cash)),receivables:rec,debts:debt,netWorth:cash+rec-debt,
  income:s.nat.INCOME||0,expense:s.nat.EXPENSE||0,fees:subBal(s,"EXPENSE",SUB.FEES),
  bad:subBal(s,"EXPENSE",SUB.BAD),trial:{debit:s.debit,credit:s.credit,ok:s.balanced},count:s.count}}
function flow(lg,from,to){var inc=0,exp=0,byCat={},bySrc={};
 for(var i=0;i<lg.lines.length;i++){var l=lg.lines[i];
  if(l.occurredOn<from||l.occurredOn>to)continue;
  if(l.account==="INCOME"){var v=l.side===CR?l.amount:-l.amount;inc+=v;bySrc[l.sub]=(bySrc[l.sub]||0)+v}
  if(l.account==="EXPENSE"){var w=l.side===DB?l.amount:-l.amount;if(l.sub===SUB.BAD)continue;
   exp+=w;byCat[l.sub]=(byCat[l.sub]||0)+w}}
 return{income:inc,expense:exp,net:inc-exp,byCat:byCat,bySrc:bySrc}}
function statement(lg,to){var rows=[],run=0;
 var ls=lg.lines.filter(function(l){return l.account==="CASH"}).slice().sort(function(a,b){
  return a.occurredOn<b.occurredOn?-1:a.occurredOn>b.occurredOn?1:(a.createdAt<b.createdAt?-1:1)});
 for(var i=0;i<ls.length;i++){var l=ls[i];if(to&&l.occurredOn>to)break;
  var d=l.side===DB?l.amount:-l.amount;run+=d;var t=null;
  for(var j=0;j<lg.transactions.length;j++)if(lg.transactions[j].id===l.txId)t=lg.transactions[j];
  rows.push({date:l.occurredOn,txId:l.txId,title:t?t.title:"",delta:d,run:run})}
 return{rows:rows,close:run}}
function integrity(lg){var p=[],s=rebuild(lg);
 if(!s.balanced)p.push("ميزان المراجعة غير متوازن");
 var eids={};lg.entries.forEach(function(e){eids[e.id]=1});
 lg.lines.forEach(function(l){if(!eids[l.entryId])p.push("سطر يتيم");
  if(!M.is(l.amount)||l.amount<=0)p.push("مبلغ سطر غير صالح")});
 var ops={};lg.transactions.forEach(function(t){if(ops[t.opId])p.push("معرّف عملية مكرر");ops[t.opId]=1});
 lg.goals.forEach(function(g){if(goalBal(lg,g.id)<0)p.push("رصيد هدف سالب: "+g.name)});
 var ok={};lg.occurrences.forEach(function(o){var k=o.commitmentId+"|"+o.periodKey;
  if(ok[k])p.push("استحقاق مكرر");ok[k]=1});
 return{ok:!p.length,problems:p}}
function materialize(lg,horizon){var today=D.today(),to=D.add(today,horizon||45),made=0;
 lg.commitments.forEach(function(c){if(c.status!=="ACTIVE")return;
  var k=D.mkey(c.startOn<today?c.startOn:today),endK=D.mkey(c.endOn&&c.endOn<to?c.endOn:to),guard=0;
  while(k<=endK&&guard++<600){var due=D.monthly(k,c.anchorDay);
   if(due>=c.startOn&&due<=to&&(!c.endOn||due<=c.endOn)){
    var key=c.id+"|"+k,exists=false;
    for(var i=0;i<lg.occurrences.length;i++)if(lg.occurrences[i].key===key)exists=true;
    if(!exists){lg.occurrences.push({id:uid("oc"),key:key,commitmentId:c.id,periodKey:k,dueOn:due,
     amount:c.amount,paid:0,status:due<today?"OVERDUE":(due===today?"DUE":"SCHEDULED"),txIds:[]});made++}}
   k=D.addM(k,1)}});
 lg.occurrences.forEach(function(o){
  if(o.status==="PAID"||o.status==="SKIPPED")return;
  var c=null;for(var i=0;i<lg.commitments.length;i++)if(lg.commitments[i].id===o.commitmentId)c=lg.commitments[i];
  var grace=(c&&c.graceDays)||0;
  o.status=o.paid>0?(o.paid>=o.amount?"PAID":"PARTIAL"):(D.add(o.dueOn,grace)<today?"OVERDUE":(o.dueOn<=today?"DUE":"SCHEDULED"))});
 return made}
/* ══════════════ التخزين ══════════════ */
var DBNAME="mizanati-v4-single",DBVER=1,STORE="state",KEY="main",_db=null;
function openDB(){if(_db)return Promise.resolve(_db);
 return new Promise(function(res,rej){
  if(!window.indexedDB){rej(new Error("المتصفح لا يدعم IndexedDB"));return}
  var r=indexedDB.open(DBNAME,DBVER);
  r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE)};
  r.onsuccess=function(){_db=r.result;_db.onversionchange=function(){_db.close();_db=null};res(_db)};
  r.onerror=function(){rej(r.error||new Error("فشل فتح القاعدة"))};
  r.onblocked=function(){rej(new Error("تبويب آخر يمنع الترقية"))}})}
function dbGet(){return openDB().then(function(d){return new Promise(function(res,rej){
 var tx=d.transaction(STORE,"readonly"),rq=tx.objectStore(STORE).get(KEY);
 rq.onsuccess=function(){res(rq.result)};rq.onerror=function(){rej(rq.error)}})})}
function dbSet(v){return openDB().then(function(d){return new Promise(function(res,rej){
 var tx=d.transaction(STORE,"readwrite");tx.objectStore(STORE).put(v,KEY);
 tx.oncomplete=function(){res(true)};tx.onerror=function(){rej(tx.error||new Error("فشل الحفظ"))};
 tx.onabort=function(){rej(tx.error||new Error("أُجهض الحفظ"))}})})}
function dbDel(){return openDB().then(function(d){return new Promise(function(res,rej){
 var tx=d.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(KEY);
 tx.oncomplete=function(){res(true)};tx.onerror=function(){rej(tx.error)}})})}
/* ══════════════ بيانات الاستكشاف ══════════════ */
function seed(){var lg=newLedger(),t=D.today(),op=0;
 function O(){return"seed-"+(++op)}
 function mk(n){return D.addM(D.mkey(t),n)}
 lg.settings.demo=true;
 function P(name,kind){var id=uid("pt");lg.parties.push({id:id,name:name,kind:kind,note:""});return id}
 var landlord=P("المؤجر — عمي صالح","payee"),sonel=P("سونلغاز","payee"),seaal=P("سيال","payee"),
  atp=P("اتصالات الجزائر","payee"),karim=P("كريم — جار","person"),amina=P("أمينة — أخت","person"),
  shop=P("سوق المدينة","payee");
 var ITEMS=[["طماطم","Tomate","veg","كغ",120],["بطاطا","Pomme de terre","veg","كغ",70],
  ["بصل","Oignon","veg","كغ",90],["خبز","Pain","bread","حبة",15],["حليب","Lait","food","لتر",110],
  ["زيت المائدة","Huile","food","لتر",650],["دجاج","Poulet","meat","كغ",480],
  ["لحم بقري","Viande","meat","كغ",1800],["بيض","Œufs","food","علبة",420],["سميد","Semoule","food","كغ",95],
  ["سكر","Sucre","food","كغ",110],["قهوة","Café","food","غ",18]];
 var ids={};
 ITEMS.forEach(function(it){var id=uid("it");ids[it[0]]=id;
  lg.items.push({id:id,name:it[0],nameFr:it[1],categoryId:it[2],unit:it[3],brand:"",note:"",status:"ACTIVE"});
  for(var m=-4;m<=0;m++){var drift=Math.round(it[4]*(1+m*0.018+(m%2?0.02:-0.01)));
   lg.prices.push({id:uid("pr"),itemId:id,store:m%2?"سوق المدينة":"دكان الحي",amount:M.cents(drift),
    unit:it[3],on:D.mrange(mk(m)).start,source:"شراء فعلي"})}});
 var rentId=uid("cm");
 lg.commitments.push({id:rentId,name:"إيجار الشقة",amount:M.cents(25000),anchorDay:5,
  startOn:D.mrange(mk(-4)).start,endOn:null,categoryId:"home",payeeId:landlord,graceDays:3,status:"ACTIVE"});
 lg.commitments.push({id:uid("cm"),name:"اشتراك نادي",amount:M.cents(3000),anchorDay:25,
  startOn:D.mrange(mk(-2)).start,endOn:null,categoryId:"fun",payeeId:null,graceDays:2,status:"ACTIVE"});
 for(var m=-4;m<=0;m++){var k=mk(m),pay=D.monthly(k,18);
  if(pay<=t)post(lg,{type:"INCOME",amount:M.cents(65000),sourceId:"salary",occurredOn:pay,opId:O(),title:"راتب "+D.mLabel(k)});
  var side=D.add(pay,4);
  if(m<=-1&&side<=t)post(lg,{type:"INCOME",amount:M.cents(8000+(m+4)*1500),sourceId:"side",occurredOn:side,opId:O(),title:"نشاط جانبي"});
  [[D.monthly(k,12),1800,"util",sonel,"كهرباء"],[D.monthly(k,14),900,"util",seaal,"ماء"],
   [D.monthly(k,20),2200,"net",atp,"إنترنت"]].forEach(function(u){
   if(u[0]<=t)post(lg,{type:"EXPENSE",amount:M.cents(u[1]),categoryId:u[2],occurredOn:u[0],opId:O(),title:u[4],partyId:u[3]})});
  [3,8,13,19,24,28].forEach(function(day,i){var on=D.monthly(k,day);if(on>t)return;
   var lines=[["طماطم",2000,120],["بطاطا",3000,70],["بصل",1000,90],["خبز",i%2?4000:6000,15],
    ["حليب",2000,110],["بيض",1000,420]].slice(0,3+(i%4));
   if(i%3===0)lines.push(["دجاج",1500,480]);
   if(i%4===1)lines.push(["زيت المائدة",1000,650]);
   var ivId=uid("iv"),pls=lines.map(function(x){var meta=ITEMS.filter(function(z){return z[0]===x[0]})[0];
    var q=x[1],p=M.cents(x[2]);
    return{itemId:ids[x[0]],name:x[0],unit:meta[3],qty:q,price:p,total:M.line(q,p),categoryId:meta[2]}});
   var total=M.sum(pls.map(function(x){return x.total}));
   var r=post(lg,{type:"EXPENSE",amount:total,categoryId:pls[0].categoryId,occurredOn:on,opId:O(),
    title:"مشتريات السوق",partyId:shop,invoiceId:ivId,note:pls.length+" عناصر"});
   lg.invoices.push({id:ivId,txId:r.txId,store:"سوق المدينة",on:on,detailed:true,lines:pls,total:total});
   pls.forEach(function(x){lg.prices.push({id:uid("pr"),itemId:x.itemId,store:"سوق المدينة",amount:x.price,
    unit:x.unit,on:on,source:"فاتورة"})})});
  var tr=D.monthly(k,10);
  if(tr<=t)post(lg,{type:"EXPENSE",amount:M.cents(1400),categoryId:"transport",occurredOn:tr,opId:O(),title:"وقود"});
  var cl=D.monthly(k,22);
  if(cl<=t&&m%2===0)post(lg,{type:"EXPENSE",amount:M.cents(4500),categoryId:"clothes",occurredOn:cl,opId:O(),title:"ملابس"});
  var hl=D.monthly(k,16);
  if(hl<=t&&m===-2)post(lg,{type:"EXPENSE",amount:M.cents(3200),categoryId:"health",occurredOn:hl,opId:O(),title:"دواء"});}
 materialize(lg,45);
 lg.occurrences.filter(function(o){return o.dueOn<t&&o.commitmentId===rentId}).forEach(function(o,i){
  if(i%3===2)return;var part=i%4===1?M.cents(20000):o.amount;
  post(lg,{type:"EXPENSE",amount:part,categoryId:"home",occurredOn:D.add(o.dueOn,i%4===1?7:1),opId:O(),
   title:"إيجار — "+D.mLabel(o.periodKey),partyId:landlord,occurrenceId:o.id})});
 var g1=uid("gl"),g2=uid("gl"),g3=uid("gl");
 lg.goals.push({id:g1,name:"هاتف جديد",icon:"📱",target:M.cents(90000),startOn:D.mrange(mk(-4)).start,
  dueOn:D.addM(D.mkey(t),3)+"-01",status:"ACTIVE",note:""});
 lg.goals.push({id:g2,name:"صندوق الطوارئ",icon:"🛡",target:M.cents(200000),startOn:D.mrange(mk(-4)).start,
  dueOn:null,status:"ACTIVE",note:"3 أشهر مصاريف"});
 lg.goals.push({id:g3,name:"سفر الصيف",icon:"✈",target:M.cents(120000),startOn:D.mrange(mk(-2)).start,
  dueOn:D.addM(D.mkey(t),5)+"-01",status:"ACTIVE",note:""});
 for(var n=-4;n<=0;n++){var on=D.monthly(mk(n),21);if(on>t)continue;
  allocate(lg,{goalId:g1,amount:M.cents(8000),occurredOn:on,opId:O(),note:"مساهمة شهرية"});
  allocate(lg,{goalId:g2,amount:M.cents(10000),occurredOn:on,opId:O(),note:"مساهمة شهرية"});
  if(n>=-2)allocate(lg,{goalId:g3,amount:M.cents(5000),occurredOn:on,opId:O(),note:""})}
 [["food",18000],["veg",12000],["meat",9000],["transport",6000],["home",25000],["net",2500],["fun",4000]]
  .forEach(function(b){var meta=lg.settings.categories.filter(function(c){return c[0]===b[0]})[0];
   var r=D.mrange(D.mkey(t));
   lg.budgets.push({id:uid("bd"),name:meta[1],categoryId:b[0],amount:M.cents(b[1]),periodStart:r.start,periodEnd:r.end})});
 post(lg,{type:"BORROW",amount:M.cents(40000),partyId:karim,occurredOn:D.monthly(mk(-3),7),opId:O(),
  title:"قرض من كريم",note:"بدون فوائد"});
 post(lg,{type:"DEBT_PAY",amount:M.cents(10000),principal:M.cents(10000),fees:0,partyId:karim,
  occurredOn:D.monthly(mk(-1),9),opId:O(),title:"تسديد لكريم"});
 post(lg,{type:"LEND",amount:M.cents(15000),partyId:amina,occurredOn:D.monthly(mk(-2),15),opId:O(),title:"إقراض أمينة"});
 post(lg,{type:"COLLECT",amount:M.cents(5000),partyId:amina,occurredOn:D.monthly(mk(0),3),opId:O(),title:"تحصيل من أمينة"});
 var target=null;
 lg.transactions.forEach(function(x){if(!target&&x.type==="EXPENSE"&&x.categoryId==="clothes")target=x});
 var refOn=D.monthly(mk(-1),26);
 if(target&&refOn<=t)post(lg,{type:"REFUND",amount:M.cents(1500),categoryId:"clothes",originalTxId:target.id,
  occurredOn:refOn,opId:O(),title:"استرجاع قطعة ملابس"});
 materialize(lg,45);
 return lg}
/* ══════════════ حالة التطبيق ══════════════ */
var LG=null,route="home",sub="",busy=false,snapshot=null;
var ui={q:"",filter:"all",sort:"new",bulk:false,sel:{},selN:0,repTab:"flow",debtTab:"debt",inv:[],period:null,custom:null};
var PAL=["#E0A458","#5FBF7F","#D96C6C","#5B8FF9","#9B7EDE","#4ECDC4","#F06292","#C9A227","#7986CB","#FF8A65","#A1887F","#BA68C8","#90A4AE","#6C8EBF","#8FA0B8"];
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){
 return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function N(c){return M.fmt(c)}function F(c){return M.fmt(c,{cur:true})}
function cat(id){var f=LG.settings.categories.filter(function(c){return c[0]===id})[0];
 return f||["other","أخرى","📦","#8FA0B8"]}
function src(id){var f=LG.settings.sources.filter(function(s){return s[0]===id})[0];
 return f||["other","أخرى","📥"]}
function party(id){var f=LG.parties.filter(function(p){return p.id===id})[0];return f||null}
function goal(id){var f=LG.goals.filter(function(g){return g.id===id})[0];return f||null}
function cmName(o){var c=LG.commitments.filter(function(x){return x.id===o.commitmentId})[0];return c?c.name:"التزام"}
function today(){return D.today()}
function opId(){return"op_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,9)}
function period(){if(ui.custom)return{start:ui.custom.start,end:ui.custom.end,label:"فترة مخصصة"};
 var k=ui.period||LG.settings.period||"month";
 if(k==="cycle")return D.cycle(today(),LG.settings.payday||18);
 return D.period(k,today(),LG.settings.weekStart)}
function clone(o){return JSON.parse(JSON.stringify(o))}
function commit(fn,msg,undoable){
 if(busy)return Promise.resolve(false);
 busy=true;snapshot=clone(LG);
 try{fn(LG)}catch(e){busy=false;snapshot=null;toast(e.message||"تعذّر التنفيذ","err");return Promise.resolve(false)}
 render();
 return dbSet(LG).then(function(){busy=false;var s=snapshot;snapshot=null;
  if(msg)toast(msg,"ok",undoable?function(){LG=s;render();dbSet(LG).then(function(){toast("تم التراجع","ok")})}:null);
  return true},function(e){LG=snapshot;snapshot=null;busy=false;render();
  toast("فشل الحفظ — لم يتغيّر شيء","err");return false})}
var toastT=null;
function toast(msg,kind,undo){var t=$("toast");t.className="toast on "+(kind||"");
 t.innerHTML="<span>"+esc(msg)+"</span>"+(undo?'<button class="undo" id="undoBtn">تراجع</button>':"");
 if(undo)$("undoBtn").onclick=function(){t.classList.remove("on");undo()};
 clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove("on")},undo?6500:3000)}
function scrim(on){$("scrim").classList.toggle("on",!!on)}
function closeAll(){$("drawer").classList.remove("on");$("modal").classList.remove("on");
 $("sheet").classList.remove("on");scrim(false)}
function drawer(title,body){$("drawer").innerHTML='<div class="dhead"><h3>'+esc(title)+
 '</h3><button class="icobtn" data-act="closeAll">✕</button></div><div class="dbody">'+body+'</div>';
 $("drawer").classList.add("on");scrim(true);$("drawer").scrollTop=0}
function modal(title,subtitle,body,footer){$("modal").innerHTML='<div class="mhead"><h3>'+esc(title)+
 '</h3>'+(subtitle?'<p>'+esc(subtitle)+'</p>':"")+'</div><div class="mbody">'+body+'</div><div class="mfoot">'+footer+'</div>';
 $("modal").classList.add("on");scrim(true);$("modal").scrollTop=0;
 var f=$("modal").querySelector("input,select,textarea");if(f)setTimeout(function(){try{f.focus()}catch(e){}},120)}
function sheet(html){$("sheet").innerHTML='<div class="grab"></div>'+html;$("sheet").classList.add("on");scrim(true)}
/* ══════════════ نموذج عام ══════════════ */
function form(cfg){
 var body=cfg.fields.map(function(f){var id="f_"+f.k;
  if(f.type==="pick")return '<div class="fld" data-w="'+f.k+'"><label>'+esc(f.label)+'</label><div class="pick" data-pick="'+f.k+'">'+
   f.opts.map(function(o){return'<button type="button" data-v="'+esc(o[0])+'" class="'+(String(o[0])===String(f.val)?"on":"")+'">'+esc(o[1])+'</button>'}).join("")+
   '</div><input type="hidden" id="'+id+'" value="'+esc(f.val==null?"":f.val)+'">'+(f.hint?'<div class="hint">'+esc(f.hint)+'</div>':"")+'<div class="fe" hidden></div></div>';
  if(f.type==="select")return '<div class="fld" data-w="'+f.k+'"><label>'+esc(f.label)+'</label><select id="'+id+'">'+
   f.opts.map(function(o){return'<option value="'+esc(o[0])+'"'+(String(o[0])===String(f.val)?" selected":"")+'>'+esc(o[1])+'</option>'}).join("")+
   '</select>'+(f.hint?'<div class="hint">'+esc(f.hint)+'</div>':"")+'<div class="fe" hidden></div></div>';
  if(f.type==="textarea")return '<div class="fld" data-w="'+f.k+'"><label>'+esc(f.label)+'</label><textarea id="'+id+'" placeholder="'+esc(f.ph||"")+'">'+esc(f.val||"")+'</textarea><div class="fe" hidden></div></div>';
  if(f.type==="toggle")return '<div class="switch"><div class="st"><b>'+esc(f.label)+'</b>'+(f.hint?'<small>'+esc(f.hint)+'</small>':"")+
   '</div><button type="button" class="tog'+(f.val?" on":"")+'" data-tog="'+f.k+'"></button><input type="hidden" id="'+id+'" value="'+(f.val?1:"")+'"></div>';
  var t=f.type==="money"?"text":(f.type||"text"),im=f.type==="money"?' inputmode="decimal"':(f.type==="number"?' inputmode="numeric"':"");
  return '<div class="fld" data-w="'+f.k+'"><label>'+esc(f.label)+'</label><input id="'+id+'" type="'+t+'"'+im+
   ' value="'+esc(f.val==null?"":f.val)+'" placeholder="'+esc(f.ph||"")+'">'+
   (f.hint?'<div class="hint">'+esc(f.hint)+'</div>':"")+'<div class="fe" hidden></div></div>'}).join("");
 modal(cfg.title,cfg.sub,body+(cfg.extra||""),
  '<button class="btn" data-act="closeAll">إلغاء</button><button class="btn p" id="formOk">'+esc(cfg.ok||"حفظ")+'</button>');
 Array.prototype.forEach.call($("modal").querySelectorAll("[data-pick]"),function(p){
  Array.prototype.forEach.call(p.querySelectorAll("button"),function(b){b.onclick=function(){
   Array.prototype.forEach.call(p.querySelectorAll("button"),function(x){x.classList.remove("on")});
   b.classList.add("on");$("f_"+p.dataset.pick).value=b.dataset.v}})});
 Array.prototype.forEach.call($("modal").querySelectorAll("[data-tog]"),function(t){t.onclick=function(){
  var i=$("f_"+t.dataset.tog);i.value=i.value?"":"1";t.classList.toggle("on",!!i.value)}});
 function fail(k,msg){var w=$("modal").querySelector('[data-w="'+k+'"]');if(!w)return;
  w.classList.add("bad");var e=w.querySelector(".fe");if(e){e.textContent=msg;e.hidden=false}}
 $("formOk").onclick=function(){
  var vals={},bad=false;
  Array.prototype.forEach.call($("modal").querySelectorAll(".fld"),function(w){w.classList.remove("bad");
   var e=w.querySelector(".fe");if(e)e.hidden=true});
  cfg.fields.forEach(function(f){var el=$("f_"+f.k),v=el?el.value:"";
   if(f.type==="money"){try{v=M.cents(v||"0")}catch(err){fail(f.k,err.message);bad=true;return}
    if(f.min!=null&&v<f.min){fail(f.k,"المبلغ غير صالح");bad=true;return}}
   else if(f.type==="number"){v=Number(v);if(!isFinite(v)){fail(f.k,"رقم غير صالح");bad=true;return}}
   else if(f.type==="toggle")v=!!v;
   else if(f.type==="date"){if(!D.valid(v)){fail(f.k,"تاريخ غير صالح");bad=true;return}}
   else v=String(v).trim();
   if(f.required&&(v===""||v==null||(f.type==="money"&&v===0))){fail(f.k,"هذا الحقل مطلوب");bad=true;return}
   vals[f.k]=v});
  if(bad)return;
  var r=cfg.onSubmit(vals);
  if(r&&r.errors){Object.keys(r.errors).forEach(function(k){fail(k,r.errors[k])});return}
  if(r!==false)closeAll()}}
/* ══════════════ الرسوم ══════════════ */
function ring(pct,color,size){size=size||56;var r=(size-8)/2,c=2*Math.PI*r,p=Math.max(0,Math.min(1,pct||0));
 return '<div class="ring" style="width:'+size+'px;height:'+size+'px"><svg width="'+size+'" height="'+size+'">'+
  '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--line2)" stroke-width="5"/>'+
  '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="5" stroke-linecap="round"'+
  ' stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+(c*(1-p)).toFixed(1)+'"/></svg>'+
  '<div class="rc">'+Math.round(p*100)+'%</div></div>'}
function bars(data){var h=150,w=340,n=Math.max(1,data.length),gap=10,bw=Math.max(8,(w-gap*(n-1))/n/2-3);
 var max=1;data.forEach(function(d){max=Math.max(max,d.income,d.expense)});
 var s='<svg class="chart" viewBox="0 0 '+w+' '+(h+26)+'">';
 for(var i=0;i<=3;i++){var y=h-h*i/3;s+='<line x1="0" y1="'+y+'" x2="'+w+'" y2="'+y+'" stroke="var(--line)" stroke-dasharray="3 4"/>'}
 data.forEach(function(d,i){var x=i*(w/n),hi=h*d.income/max,he=h*d.expense/max;
  s+='<rect x="'+(x+bw/2)+'" y="'+(h-hi)+'" width="'+bw+'" height="'+Math.max(1,hi)+'" rx="4" fill="url(#gi)"><title>دخل '+F(d.income)+'</title></rect>';
  s+='<rect x="'+(x+bw*1.7)+'" y="'+(h-he)+'" width="'+bw+'" height="'+Math.max(1,he)+'" rx="4" fill="url(#ge)"><title>مصروف '+F(d.expense)+'</title></rect>';
  s+='<text x="'+(x+w/n/2)+'" y="'+(h+17)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+esc(d.label)+'</text>'});
 return s+'<defs><linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2FC79B"/><stop offset="1" stop-color="#159A75"/></linearGradient>'+
  '<linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F08A8A"/><stop offset="1" stop-color="#D96C6C"/></linearGradient></defs></svg>'}
function area(pts){var h=140,w=340;if(!pts.length)return"";
 var vals=pts.map(function(p){return p.cash}),mx=Math.max.apply(null,vals.concat([1])),mn=Math.min.apply(null,vals.concat([0])),rg=(mx-mn)||1;
 function X(i){return pts.length<2?w/2:i*w/(pts.length-1)}
 function Y(v){return h-((v-mn)/rg)*(h-14)-7}
 var d="";pts.forEach(function(p,i){d+=(i?" L":"M")+X(i).toFixed(1)+" "+Y(p.cash).toFixed(1)});
 var s='<svg class="chart" viewBox="0 0 '+w+' '+(h+24)+'"><path d="'+d+" L"+X(pts.length-1)+" "+h+" L"+X(0)+" "+h+' Z" fill="url(#ga)"/>'+
  '<path d="'+d+'" fill="none" stroke="var(--gold)" stroke-width="2.4" stroke-linejoin="round"/>';
 pts.forEach(function(p,i){s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.cash).toFixed(1)+'" r="3.4" fill="var(--navy)" stroke="var(--gold)" stroke-width="2"><title>'+esc(p.label)+": "+F(p.cash)+'</title></circle>'+
  '<text x="'+X(i).toFixed(1)+'" y="'+(h+16)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+esc(p.label)+'</text>'});
 return s+'<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6B779" stop-opacity=".34"/><stop offset="1" stop-color="#D6B779" stop-opacity="0"/></linearGradient></defs></svg>'}
function donut(es,total){var R=64,r=42,cx=80,cy=80,a=-Math.PI/2;
 var s='<svg class="chart" viewBox="0 0 160 160" style="max-width:190px;margin:0 auto">';
 if(!es.length||total<=0)s+='<circle cx="80" cy="80" r="'+R+'" fill="none" stroke="var(--line)" stroke-width="22"/>';
 es.forEach(function(e){var frac=e.value/total,ang=frac*Math.PI*2,b=a+ang,large=ang>Math.PI?1:0;
  if(frac>0.0005){var x1=cx+R*Math.cos(a),y1=cy+R*Math.sin(a),x2=cx+R*Math.cos(b),y2=cy+R*Math.sin(b),
   x3=cx+r*Math.cos(b),y3=cy+r*Math.sin(b),x4=cx+r*Math.cos(a),y4=cy+r*Math.sin(a);
   s+='<path d="M'+x1.toFixed(1)+' '+y1.toFixed(1)+' A'+R+' '+R+' 0 '+large+' 1 '+x2.toFixed(1)+' '+y2.toFixed(1)+
    ' L'+x3.toFixed(1)+' '+y3.toFixed(1)+' A'+r+' '+r+' 0 '+large+' 0 '+x4.toFixed(1)+' '+y4.toFixed(1)+' Z" fill="'+e.color+'" opacity=".92"><title>'+esc(e.name)+" "+F(e.value)+'</title></path>'}
  a=b});
 return s+'<text x="80" y="76" text-anchor="middle" font-size="10" fill="var(--mute)">الإجمالي</text>'+
  '<text x="80" y="94" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">'+esc(M.short(total))+'</text></svg>'}
/* ══════════════ العرض ══════════════ */
function render(){
 try{
  $("demoBar").hidden=!LG.settings.demo;
  document.body.classList.toggle("light",LG.settings.theme==="light");
  $("themeIco").textContent=LG.settings.theme==="light"?"☀":"◐";
  var html;
  if(route==="more"&&sub)html=vSub();
  else if(route==="tx")html=vTx();
  else if(route==="reports")html=vReports();
  else if(route==="more")html=vMore();
  else html=vHome();
  $("app").innerHTML='<div class="view">'+html+'</div>';
  Array.prototype.forEach.call(document.querySelectorAll(".tab"),function(t){
   t.classList.toggle("active",t.dataset.to===route)});
 }catch(e){$("app").innerHTML='<div class="view"><div class="alert bad"><span class="ai">✕</span><div><b>خطأ في العرض</b><small>'+
  esc(e.message)+'</small></div></div><button class="btn p w" data-act="goto" data-to="home">العودة للرئيسية</button></div>'}}
function head(t,s,date){return '<div class="head">'+(date?'<div class="date">'+esc(D.full(today()))+'</div>':"")+
 '<h1>'+esc(t)+'</h1>'+(s?'<p>'+esc(s)+'</p>':"")+'</div>'}
function backBar(t){return '<div class="head"><button class="lnk" data-act="goto" data-to="more">→ المزيد</button><h1 style="margin-top:6px">'+esc(t)+'</h1></div>'}
function periodChips(){var cur=ui.custom?"custom":(ui.period||LG.settings.period||"month");
 var o=[["today","اليوم"],["week","الأسبوع"],["month","الشهر"],["lastMonth","السابق"],["cycle","دورة الراتب"],["year","السنة"],["all","الكل"]];
 return '<div class="chips">'+o.map(function(x){return'<button class="chip'+(cur===x[0]?" on":"")+'" data-act="period" data-k="'+x[0]+'">'+x[1]+'</button>'}).join("")+
  '<button class="chip'+(cur==="custom"?" on":"")+'" data-act="customRange">⚙ مخصص</button></div>'}
function emptyState(t,s,btn,act){return '<div class="empty"><span class="ei">◌</span><b>'+esc(t)+'</b>'+esc(s)+
 (btn?'<div style="margin-top:14px"><button class="btn p sm" data-act="'+act+'">'+esc(btn)+'</button></div>':"")+'</div>'}
function budgetStatus(){var r=D.mrange(D.mkey(today()));
 return LG.budgets.map(function(b){var sp=0;
  for(var i=0;i<LG.lines.length;i++){var l=LG.lines[i];
   if(l.account!=="EXPENSE"||l.sub!==b.categoryId||l.occurredOn<r.start||l.occurredOn>r.end)continue;
   sp+=l.side===DB?l.amount:-l.amount}
  return{id:b.id,name:b.name,categoryId:b.categoryId,amount:b.amount,spent:sp,left:b.amount-sp}})}
function visibleTx(){var a=LG.transactions.slice();
 if(ui.filter!=="all"){var map={income:["INCOME"],expense:["EXPENSE"],refund:["REFUND"],
  debt:["BORROW","DEBT_PAY","FORGIVE"],recv:["LEND","COLLECT","WRITEOFF"],other:["ADJUST","REVERSAL"]};
  var allow=map[ui.filter]||[];a=a.filter(function(t){return allow.indexOf(t.type)>=0})}
 if(ui.q){var q=ui.q.trim().toLowerCase();
  a=a.filter(function(t){var p=party(t.partyId);
   return(t.title||"").toLowerCase().indexOf(q)>=0||(t.note||"").toLowerCase().indexOf(q)>=0||
    (p&&p.name.toLowerCase().indexOf(q)>=0)})}
 var s=ui.sort;
 a.sort(function(x,y){if(s==="old")return x.occurredOn<y.occurredOn?-1:x.occurredOn>y.occurredOn?1:(x.createdAt<y.createdAt?-1:1);
  if(s==="big")return y.amount-x.amount;if(s==="small")return x.amount-y.amount;
  return x.occurredOn>y.occurredOn?-1:x.occurredOn<y.occurredOn?1:(x.createdAt>y.createdAt?-1:1)});
 return a}
function txRow(t){var isInc=INC_TYPES.indexOf(t.type)>=0,c=t.categoryId?cat(t.categoryId):null;
 var icon=t.type==="INCOME"?src(t.sourceId)[2]:(c?c[2]:(t.type==="REFUND"?"↩":
  (t.type==="BORROW"||t.type==="DEBT_PAY")?"🤝":(t.type==="LEND"||t.type==="COLLECT")?"🫱":t.type==="ADJUST"?"⚖":"↺"));
 var color=t.type==="INCOME"?"var(--em2)":t.type==="REFUND"?"var(--teal)":t.type==="EXPENSE"?"var(--coral2)":"var(--gold2)";
 var parts=[D.dayName(t.occurredOn)+" "+t.occurredOn,LBL[t.type]];
 var p=party(t.partyId);if(p)parts.push(p.name);
 if(t.status==="REVERSED")parts.push("معكوسة");
 var g=goal(t.goalId);if(g)parts.push("هدف: "+g.name);
 var sel=!!ui.sel[t.id];
 return '<div class="row'+(t.status==="REVERSED"?" rev":"")+(sel?" sel":"")+'">'+
  (ui.bulk?'<button class="ico" data-act="bulkToggle" data-id="'+t.id+'" style="border-color:'+(sel?"var(--gold)":"var(--line)")+
   ';color:'+(sel?"var(--gold)":"var(--faint)")+'">'+(sel?"✓":"")+'</button>':"")+
  '<button class="ico" data-act="txDetail" data-id="'+t.id+'" style="color:'+color+'">'+icon+'</button>'+
  '<button class="mid" data-act="txDetail" data-id="'+t.id+'"><b>'+esc(t.title)+'</b><small>'+esc(parts.join(" · "))+'</small></button>'+
  '<button class="amt" data-act="txDetail" data-id="'+t.id+'" style="color:'+color+'">'+(isInc?"+":"−")+N(t.amount)+'<small>دج</small></button></div>'}
function vHome(){var p=period(),pos=positions(LG),f=flow(LG,p.start,p.end);
 var isNow=p.end>=today(),shown=isNow?pos:positions(LG,p.end);
 var occ=LG.occurrences.filter(function(o){return["OVERDUE","DUE","PARTIAL","SCHEDULED"].indexOf(o.status)>=0});
 var over=occ.filter(function(o){return o.status==="OVERDUE"});
 var soon=occ.filter(function(o){return o.status!=="OVERDUE"&&o.dueOn<=D.add(today(),7)});
 var gs=LG.goals.filter(function(g){return g.status==="ACTIVE"});
 var bs=budgetStatus(),ob=bs.filter(function(b){return b.spent>b.amount});
 var h=head("ملخصك المالي",null,true)+periodChips();
 if(!isNow)h+='<div class="alert info"><span class="ai">◷</span><div><b>عرض فترة سابقة</b><small>الأرصدة أدناه رصيد نهاية '+esc(p.end)+' وليست رصيدك الحالي.</small></div></div>';
 h+='<article class="hero"><div class="lbl">'+(isNow?"النقد الفعلي الآن":"النقد في نهاية الفترة")+'</div>'+
  '<button class="big'+(shown.cash<0?" neg":"")+'" data-act="cashSheet">'+N(shown.cash)+'<small>دج</small></button>'+
  '<div class="split"><button data-act="availSheet"><span>المتاح للإنفاق</span><b class="em">'+N(shown.available)+'</b></button>'+
  '<button data-act="goto" data-to="more" data-sub="savings"><span>مخصص للادخار</span><b class="gd">'+N(shown.reserved)+'</b></button></div>'+
  '<div class="nw"><span>صافي الثروة = نقد + حقوق − ديون</span><b>'+N(shown.netWorth)+' دج</b></div></article>';
 if(shown.gap>0)h+='<button class="alert warn" data-act="goto" data-to="more" data-sub="savings"><span class="ai">⚠</span><div><b>أهداف غير ممولة بمقدار '+F(shown.gap)+'</b><small>التخصيص أكبر من النقد المتاح.</small></div></button>';
 if(shown.cash<0)h+='<div class="alert bad"><span class="ai">⚠</span><div><b>النقد سالب</b><small>راجع دخلاً غير مسجّل أو مصروفاً مكرراً.</small></div></div>';
 h+='<div class="grid2"><button class="metric" data-act="flowSheet" data-kind="income"><span>دخل '+esc(p.label)+'</span><b class="pos">'+N(f.income)+'</b><small>اضغط للتفاصيل</small></button>'+
  '<button class="metric" data-act="flowSheet" data-kind="expense"><span>مصروف '+esc(p.label)+'</span><b class="neg">'+N(f.expense)+'</b><small>اضغط للتفاصيل</small></button></div>';
 h+='<div class="grid3" style="margin-top:11px">'+
  '<button class="metric" data-act="goto" data-to="more" data-sub="debts"><span>ديون عليّ</span><b class="neg" style="font-size:16px">'+N(pos.debts)+'</b></button>'+
  '<button class="metric" data-act="goto" data-to="more" data-sub="debts"><span>حقوق لي</span><b class="pos" style="font-size:16px">'+N(pos.receivables)+'</b></button>'+
  '<button class="metric" data-act="goto" data-to="more" data-sub="commit"><span>التزامات مفتوحة</span><b class="gold" style="font-size:16px">'+occ.length+'</b></button></div>';
 if(over.length||soon.length||ob.length){h+='<div class="sect"><h2>يحتاج انتباهك</h2></div>';
  if(over.length)h+='<button class="alert bad" data-act="goto" data-to="more" data-sub="commit"><span class="ai">⏰</span><div><b>'+over.length+' التزام متأخر — '+F(over.reduce(function(s,o){return s+o.amount-o.paid},0))+'</b><small>'+esc(over.slice(0,2).map(cmName).join("، "))+'</small></div></button>';
  if(soon.length)h+='<button class="alert warn" data-act="goto" data-to="more" data-sub="commit"><span class="ai">◷</span><div><b>'+soon.length+' التزام خلال 7 أيام</b><small>أقربها '+esc(soon.slice().sort(function(a,b){return a.dueOn<b.dueOn?-1:1})[0].dueOn)+'</small></div></button>';
  if(ob.length)h+='<button class="alert warn" data-act="goto" data-to="more" data-sub="budgets"><span class="ai">📊</span><div><b>'+ob.length+' ميزانية متجاوزة</b><small>التجاوز لا ينشئ ديناً ولا يخصم نقداً.</small></div></button>'}
 if(gs.length){h+='<div class="sect"><h2>أهداف الادخار</h2><button class="lnk" data-act="goto" data-to="more" data-sub="savings">إدارة</button></div>';
  gs.slice(0,3).forEach(function(g){var b=goalBal(LG,g.id),pct=g.target?b/g.target:0;
   h+='<button class="goal" data-act="goalDetail" data-id="'+g.id+'">'+ring(pct,pct>=1?"var(--em2)":"var(--gold)")+
    '<div class="gi"><b>'+esc(g.icon||"🎯")+" "+esc(g.name)+'</b><small>'+N(b)+(g.target?" من "+N(g.target):"")+' دج</small>'+
    '<div class="bar"><i style="width:'+Math.min(100,pct*100)+'%;background:linear-gradient(90deg,var(--gold),var(--em2))"></i></div></div></button>'})}
 if(bs.length){h+='<div class="sect"><h2>ميزانيات الشهر</h2><button class="lnk" data-act="goto" data-to="more" data-sub="budgets">الكل</button></div><div class="card">';
  bs.slice(0,4).forEach(function(b){var pct=b.amount?b.spent/b.amount:0,c=pct>1?"var(--coral)":pct>.8?"var(--amber)":"var(--em2)";
   h+='<button data-act="budgetDetail" data-id="'+b.id+'" style="width:100%;text-align:start;margin-bottom:11px;display:block">'+
    '<div style="display:flex;justify-content:space-between;font-size:12.5px;gap:8px"><span>'+esc(cat(b.categoryId)[2])+" "+esc(b.name)+'</span>'+
    '<b style="font-family:var(--num);color:'+c+'">'+N(b.spent)+' / '+N(b.amount)+'</b></div>'+
    '<div class="bar"><i style="width:'+Math.min(100,pct*100)+'%;background:'+c+'"></i></div>'+
    '<div class="prog"><span>'+Math.round(pct*100)+'%</span><span>'+(b.left<0?"تجاوز "+N(-b.left):"متبقٍ "+N(b.left))+' دج</span></div></button>'});
  h+='</div>'}
 var recent=visibleTx().slice(0,5);
 h+='<div class="sect"><h2>آخر الحركات</h2><button class="lnk" data-act="goto" data-to="tx">عرض الكل</button></div>';
 h+=recent.length?'<div class="rows stagger">'+recent.map(txRow).join("")+'</div>':emptyState("لا حركات بعد","ابدأ بتسجيل دخل أو مصروف","＋ إضافة","addsheet");
 return h}
function vTx(){var list=visibleTx();
 var h=head("الحركات","كل حركة مسجّلة مرة واحدة ومشتقة من قيد متوازن.");
 h+='<div class="toolbar"><div class="search"><span>⌕</span><input id="qBox" placeholder="ابحث بالعنوان أو الجهة…" value="'+esc(ui.q)+'"></div>'+
  '<select class="sel" id="sortSel">'+[["new","الأحدث"],["old","الأقدم"],["big","الأكبر"],["small","الأصغر"]].map(function(o){
   return'<option value="'+o[0]+'"'+(ui.sort===o[0]?" selected":"")+'>'+o[1]+'</option>'}).join("")+'</select>'+
  '<button class="btn sm'+(ui.bulk?" p":"")+'" data-act="bulkMode">'+(ui.bulk?"إلغاء":"تحديد")+'</button></div>';
 h+='<div class="chips">'+[["all","الكل"],["income","دخل"],["expense","مصروف"],["refund","استرجاع"],["debt","ديون"],["recv","حقوق"],["other","تسويات"]]
  .map(function(o){return'<button class="chip'+(ui.filter===o[0]?" on":"")+'" data-act="filter" data-k="'+o[0]+'">'+o[1]+'</button>'}).join("")+'</div>';
 if(ui.bulk&&ui.selN)h+='<div class="bulkbar"><b>'+ui.selN+'</b> محددة<span class="sp"></span>'+
  '<button class="btn sm" data-act="bulkAll">الكل</button><button class="btn sm d" data-act="bulkReverse">عكس</button></div>';
 var si=0,so=0;list.forEach(function(t){if(t.status==="REVERSED")return;
  if(INC_TYPES.indexOf(t.type)>=0)si+=t.amount;else so+=t.amount});
 h+='<div class="grid2" style="margin:10px 0 14px"><div class="metric"><span>مجموع الداخل</span><b class="pos">'+N(si)+'</b></div>'+
  '<div class="metric"><span>مجموع الخارج</span><b class="neg">'+N(so)+'</b></div></div>';
 h+='<div id="txList">'+(list.length?'<div class="rows">'+list.slice(0,300).map(txRow).join("")+'</div>'+
  (list.length>300?'<div class="empty" style="margin-top:10px">أول 300 من '+list.length+'</div>':"")
  :emptyState("لا نتائج","غيّر البحث أو المرشّح","＋ إضافة","addsheet"))+'</div>';
 return h}
function vReports(){var p=period(),f=flow(LG,p.start,p.end),pos=positions(LG);
 var months=[],series=[];
 for(var i=5;i>=0;i--)months.push(D.addM(D.mkey(today()),-i));
 months.forEach(function(k){var r=D.mrange(k),fl=flow(LG,r.start,r.end);
  series.push({label:D.mShort(k),key:k,income:fl.income,expense:fl.expense,cash:rebuild(LG,r.end).nat.CASH})});
 var h=head("التقارير والتحليل","كل رقم يمكن تتبعه إلى سجلاته الأصلية.");
 h+='<div class="tabs2">'+[["flow","التدفق"],["cats","التصنيفات"],["trend","التطور"],["insight","تحليل"]]
  .map(function(o){return'<button class="'+(ui.repTab===o[0]?"on":"")+'" data-act="repTab" data-k="'+o[0]+'">'+o[1]+'</button>'}).join("")+'</div>';
 if(ui.repTab==="flow"){h+=periodChips();
  h+='<div class="card"><div class="sect" style="margin:0 0 12px"><h2>آخر 6 أشهر</h2><span style="font-size:10.5px;color:var(--mute)">أخضر دخل · أحمر مصروف</span></div>'+bars(series)+'</div>';
  h+='<div class="grid3"><div class="metric"><span>دخل الفترة</span><b class="pos" style="font-size:16px">'+N(f.income)+'</b></div>'+
   '<div class="metric"><span>مصروف الفترة</span><b class="neg" style="font-size:16px">'+N(f.expense)+'</b></div>'+
   '<div class="metric"><span>الصافي</span><b class="'+(f.net>=0?"pos":"neg")+'" style="font-size:16px">'+N(f.net)+'</b></div></div>';
  h+='<div class="sect"><h2>مقارنة الأشهر</h2></div><div class="card">';
  series.slice().reverse().forEach(function(s){var net=s.income-s.expense;
   h+='<button class="kv" data-act="monthDetail" data-k="'+s.key+'"><span>'+esc(D.mLabel(s.key))+'</span>'+
    '<b><span class="pos">'+N(s.income)+'</span> / <span class="neg">'+N(s.expense)+'</span></b></button>'});
  h+='</div>';
  var srcs=Object.keys(f.bySrc).map(function(k){return[k,f.bySrc[k]]}).filter(function(e){return e[1]>0}).sort(function(a,b){return b[1]-a[1]});
  if(srcs.length){h+='<div class="sect"><h2>الدخل حسب المصدر</h2></div><div class="card"><div class="legend">'+
   srcs.map(function(e,i){var s=src(e[0]);return '<button class="lg" data-act="srcDetail" data-id="'+esc(e[0])+'" data-from="'+p.start+'" data-to="'+p.end+'">'+
    '<span class="dot" style="background:'+PAL[i%PAL.length]+'"></span><span class="nm">'+s[2]+" "+esc(s[1])+'</span>'+
    '<span class="vl">'+N(e[1])+'</span><span class="pc">'+Math.round(e[1]/f.income*100)+'%</span></button>'}).join("")+'</div></div>'}}
 if(ui.repTab==="cats"){h+=periodChips();
  var es=Object.keys(f.byCat).map(function(k){return[k,f.byCat[k]]}).filter(function(e){return e[1]>0})
   .sort(function(a,b){return b[1]-a[1]}).map(function(e){var c=cat(e[0]);
    return{id:e[0],name:c[1],icon:c[2],value:e[1],color:c[3]}});
  if(!es.length)h+=emptyState("لا مصروفات في هذه الفترة","اختر فترة أخرى","＋ إضافة","addsheet");
  else{h+='<div class="card">'+donut(es,f.expense)+'<div class="legend">'+
   es.map(function(e){return '<button class="lg" data-act="catDetail" data-id="'+esc(e.id)+'" data-from="'+p.start+'" data-to="'+p.end+'">'+
    '<span class="dot" style="background:'+e.color+'"></span><span class="nm">'+e.icon+" "+esc(e.name)+'</span>'+
    '<span class="vl">'+N(e.value)+'</span><span class="pc">'+Math.round(e.value/f.expense*100)+'%</span></button>'}).join("")+'</div></div>';
   var days=Math.max(1,D.diff(p.start,p.end)+1);
   h+='<div class="grid2" style="margin-top:12px"><div class="metric"><span>متوسط يومي</span><b class="gold">'+N(Math.round(f.expense/days))+'</b><small>على '+days+' يوم</small></div>'+
    '<div class="metric"><span>أكثر تصنيف</span><b style="font-size:15px">'+es[0].icon+" "+esc(es[0].name)+'</b><small>'+Math.round(es[0].value/f.expense*100)+'%</small></div></div>'}}
 if(ui.repTab==="trend"){h+='<div class="card"><div class="sect" style="margin:0 0 10px"><h2>تطور النقد</h2></div>'+area(series)+'</div>';
  var nw=months.map(function(k){var r=D.mrange(k);return{label:D.mShort(k),cash:positions(LG,r.end).netWorth}});
  h+='<div class="card"><div class="sect" style="margin:0 0 10px"><h2>تطور صافي الثروة</h2></div>'+area(nw)+'</div>';
  h+='<div class="sect"><h2>مراكز مالية</h2></div><div class="card">'+
   [["النقد الفعلي",pos.cash],["حقوق لدى الغير",pos.receivables],["ديون عليّ",-pos.debts],
    ["مخصص للادخار (داخل النقد)",pos.reserved],["صافي الثروة",pos.netWorth]]
   .map(function(r){return'<div class="kv"><span>'+esc(r[0])+'</span><b class="'+(r[1]>=0?"pos":"neg")+'">'+N(r[1])+' دج</b></div>'}).join("")+'</div>'}
 if(ui.repTab==="insight")h+=insights(p,f);
 return h}
function insights(p,f){var months=[],avg={};
 for(var i=3;i>=1;i--)months.push(D.addM(D.mkey(today()),-i));
 months.forEach(function(k){var r=D.mrange(k),fl=flow(LG,r.start,r.end);
  Object.keys(fl.byCat).forEach(function(c){avg[c]=(avg[c]||0)+fl.byCat[c]})});
 Object.keys(avg).forEach(function(k){avg[k]=Math.round(avg[k]/months.length)});
 var h='<div class="alert info"><span class="ai">◈</span><div><b>تحليل محلي بالكامل</b><small>قواعد حسابية على بياناتك، بلا اتصال. التوقعات تقديرات لا حقائق.</small></div></div>';
 var out=[];
 Object.keys(f.byCat).forEach(function(c){var a=avg[c];
  if(a>0&&f.byCat[c]>a*1.35)out.push({i:"📈",t:"ارتفاع في "+cat(c)[1],
   s:"أنفقت "+F(f.byCat[c])+" مقابل متوسط "+F(a)+" في الأشهر الثلاثة السابقة."})});
 var big=LG.transactions.filter(function(t){return t.type==="EXPENSE"&&t.status==="POSTED"&&t.occurredOn>=p.start&&t.occurredOn<=p.end})
  .sort(function(a,b){return b.amount-a.amount})[0];
 if(big&&f.expense>0&&big.amount>f.expense*0.3)out.push({i:"🔎",t:"حركة كبيرة غير معتادة",
  s:"«"+big.title+"» بقيمة "+F(big.amount)+" تمثل "+Math.round(big.amount/f.expense*100)+"% من إنفاق الفترة."});
 if(f.income>0){var rate=Math.round((f.income-f.expense)/f.income*100);
  out.push({i:rate>=20?"✅":"⚠",t:"نسبة الادخار من الدخل "+rate+"%",
   s:rate>=20?"معدل جيد. استمر.":"أقل من 20%. راجع أكبر تصنيفين في إنفاقك."})}
 var open=LG.occurrences.filter(function(o){return["DUE","OVERDUE","PARTIAL","SCHEDULED"].indexOf(o.status)>=0});
 var cs=open.reduce(function(s,o){return s+o.amount-o.paid},0);
 if(f.income>0&&cs>0)out.push({i:"🧾",t:"نسبة الالتزامات إلى الدخل "+Math.round(cs/f.income*100)+"%",
  s:"التزامات مفتوحة بقيمة "+F(cs)+"."});
 if(D.mkey(p.start)===D.mkey(today())&&p.end>=today()){var dd=D.parse(today()).d,dim=D.dim(D.parse(today()).y,D.parse(today()).m);
  if(dd>=5)out.push({i:"🔮",t:"توقع إنفاق الشهر ≈ "+F(Math.round(f.expense/dd*dim)),est:true,
   s:"تقدير خطي على "+dd+" يوماً من أصل "+dim+". ليس رقماً مؤكداً."});
  else out.push({i:"⏳",t:"بيانات غير كافية للتوقع",s:"نحتاج 5 أيام على الأقل من الشهر الحالي."})}
 var dow={};LG.transactions.forEach(function(t){if(t.type!=="EXPENSE"||t.status!=="POSTED")return;
  var d=D.dayName(t.occurredOn);dow[d]=(dow[d]||0)+t.amount});
 var top=Object.keys(dow).map(function(k){return[k,dow[k]]}).sort(function(a,b){return b[1]-a[1]})[0];
 if(top)out.push({i:"📅",t:"أثقل أيامك: "+top[0],s:"مجموع "+F(top[1])+" عبر كل الفترات."});
 if(!out.length)return h+emptyState("لا تحليل بعد","سجّل عدة حركات عبر أسابيع","＋ إضافة","addsheet");
 return h+out.map(function(o){return'<div class="insight"><span class="ii">'+o.i+'</span><div><b>'+esc(o.t)+
  (o.est?' <span class="est">تقدير</span>':"")+'</b><small>'+esc(o.s)+'</small></div></div>'}).join("")}
function vMore(){var pos=positions(LG);
 var open=LG.occurrences.filter(function(o){return["DUE","OVERDUE","PARTIAL"].indexOf(o.status)>=0}).length;
 var tiles=[["budgets","📊","الميزانيات","حدود تخطيطية لا تخصم نقداً","var(--blue)",LG.budgets.length],
  ["savings","🎯","الادخار والأهداف","تخصيص داخل نقدك","var(--gold)",LG.goals.filter(function(g){return g.status==="ACTIVE"}).length],
  ["commit","🗓","الالتزامات","استحقاقات ودفعات جزئية","var(--violet)",open],
  ["debts","🤝","الديون والحقوق","ما عليك وما لك","var(--teal)",LG.parties.length],
  ["food","🛒","الطعام والأسعار","دليل المواد والفواتير","var(--amber)",LG.items.length],
  ["audit","🧾","سجل التدقيق","كل تغيير موثّق","var(--rose)",LG.audit.length],
  ["backup","💾","البيانات والنسخ","تصدير واستعادة مع تحقق","var(--em2)",""],
  ["settings","⚙","الإعدادات","المظهر والدورة والفحوص","var(--mute)",""]];
 var h=head("المزيد","أقسام النظام الكاملة — كل واحد محرك حقيقي.");
 h+='<div class="card"><div class="grid2"><div><span style="font-size:11px;color:var(--mute)">صافي الثروة</span>'+
  '<div style="font-size:22px;font-family:var(--num);color:var(--gold2)">'+N(pos.netWorth)+'</div></div>'+
  '<div><span style="font-size:11px;color:var(--mute)">سطور القيود</span><div style="font-size:22px;font-family:var(--num)">'+pos.count+'</div></div></div>'+
  '<div class="prog"><span>ميزان المراجعة</span><span class="'+(pos.trial.ok?"pos":"neg")+'">'+
  (pos.trial.ok?"✓ متوازن":"✗ غير متوازن")+' · '+N(pos.trial.debit)+' = '+N(pos.trial.credit)+'</span></div></div>';
 h+='<div class="hub stagger">'+tiles.map(function(t){
  return '<button data-act="goto" data-to="more" data-sub="'+t[0]+'" style="--c:'+t[4]+'">'+
   (t[5]!==""?'<span class="cnt">'+t[5]+'</span>':"")+'<span class="hi">'+t[1]+'</span><b>'+t[2]+'</b><small>'+t[3]+'</small></button>'}).join("")+'</div>';
 return h}
function vSub(){
 if(sub==="budgets")return sBudgets();
 if(sub==="savings")return sSavings();
 if(sub==="commit")return sCommit();
 if(sub==="debts")return sDebts();
 if(sub==="food")return sFood();
 if(sub==="audit")return sAudit();
 if(sub==="backup")return sBackup();
 if(sub==="settings")return sSettings();
 return vMore()}
function sBudgets(){var bs=budgetStatus(),tot=0,sp=0;
 bs.forEach(function(b){tot+=b.amount;sp+=b.spent});
 var h=backBar("الميزانيات");
 h+='<div class="alert info"><span class="ai">◈</span><div><b>الميزانية خطة لا حركة نقدية</b><small>لا تخصم من النقد، ولا ينشئ تجاوزها ديناً.</small></div></div>';
 h+='<div class="tot"><span>مجموع الحدود الشهرية<br><small style="color:var(--mute)">المستهلك '+N(sp)+' دج</small></span><b>'+N(tot)+'</b></div>';
 h+='<button class="btn p w" data-act="budgetNew">＋ ميزانية جديدة</button>';
 if(!bs.length)return h+'<div style="margin-top:14px">'+emptyState("لا ميزانيات","حدّد حداً شهرياً لكل تصنيف","＋ ميزانية","budgetNew")+'</div>';
 h+='<div style="margin-top:14px">';
 bs.forEach(function(b){var pct=b.amount?b.spent/b.amount:0,c=pct>1?"var(--coral)":pct>.8?"var(--amber)":"var(--em2)";
  var days=D.diff(D.mrange(D.mkey(today())).start,today())+1;
  h+='<div class="card"><button data-act="budgetDetail" data-id="'+b.id+'" style="width:100%;text-align:start">'+
   '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14px">'+esc(cat(b.categoryId)[2])+" "+esc(b.name)+'</b>'+
   '<span class="tag '+(pct>1?"bad":pct>.8?"warn":"ok")+'">'+Math.round(pct*100)+'%</span></div>'+
   '<div class="bar"><i style="width:'+Math.min(100,pct*100)+'%;background:'+c+'"></i></div>'+
   '<div class="prog"><span>مستهلك '+N(b.spent)+'</span><span>الحد '+N(b.amount)+'</span></div>'+
   '<div class="prog"><span>متوسط يومي '+N(Math.round(b.spent/Math.max(1,days)))+'</span><span style="color:'+c+'">'+
   (b.left<0?"تجاوز "+N(-b.left):"متبقٍ "+N(b.left))+' دج</span></div></button>'+
   '<div style="display:flex;gap:8px;margin-top:11px"><button class="btn sm" data-act="budgetEdit" data-id="'+b.id+'">تعديل</button>'+
   '<button class="btn sm d" data-act="budgetDel" data-id="'+b.id+'">حذف</button></div></div>'});
 return h+'</div>'}
function sSavings(){var pos=positions(LG);
 var h=backBar("الادخار والأهداف");
 h+='<div class="alert info"><span class="ai">◈</span><div><b>الادخار تخصيص داخل نقدك</b><small>المساهمة لا تغيّر النقد. الشراء من هدف يسجّل مصروفاً واحداً فقط.</small></div></div>';
 h+='<div class="grid3"><div class="metric"><span>مخصص</span><b class="gold" style="font-size:16px">'+N(pos.reserved)+'</b></div>'+
  '<div class="metric"><span>متاح حر</span><b class="pos" style="font-size:16px">'+N(pos.available)+'</b></div>'+
  '<div class="metric"><span>غير ممول</span><b class="'+(pos.gap>0?"neg":"")+'" style="font-size:16px">'+N(pos.gap)+'</b></div></div>';
 h+='<button class="btn p w" style="margin-top:13px" data-act="goalNew">＋ هدف جديد</button>';
 if(!LG.goals.length)return h+'<div style="margin-top:14px">'+emptyState("لا أهداف","أنشئ هدفاً وخصّص له من نقدك","＋ هدف","goalNew")+'</div>';
 h+='<div style="margin-top:14px">';
 LG.goals.forEach(function(g){var b=goalBal(LG,g.id),pct=g.target?b/g.target:0,co=0,re=0,us=0;
  LG.savings.forEach(function(s){if(s.goalId!==g.id)return;
   if(s.kind==="ALLOCATE")co+=s.amount;else if(s.kind==="RELEASE")re+=s.amount;else us+=s.amount});
  h+='<div class="card" style="'+(g.status!=="ACTIVE"?"opacity:.6":"")+'">'+
   '<button data-act="goalDetail" data-id="'+g.id+'" style="width:100%;text-align:start;display:flex;gap:13px;align-items:center">'+
   ring(pct,pct>=1?"var(--em2)":"var(--gold)")+
   '<div style="flex:1;min-width:0"><b style="font-size:14px">'+esc(g.icon||"🎯")+" "+esc(g.name)+'</b>'+
   '<div style="font-size:11px;color:var(--mute);margin-top:3px">'+N(b)+(g.target?" / "+N(g.target):"")+' دج</div>'+
   (g.target?'<div class="prog"><span>المتبقي للهدف</span><span>'+N(Math.max(0,g.target-b))+' دج</span></div>':"")+'</div></button>'+
   '<div class="grid3" style="margin-top:11px;font-size:10.5px">'+
   '<div><span style="color:var(--mute)">ساهم</span><div style="font-family:var(--num)" class="pos">'+N(co)+'</div></div>'+
   '<div><span style="color:var(--mute)">حرّر</span><div style="font-family:var(--num)">'+N(re)+'</div></div>'+
   '<div><span style="color:var(--mute)">اشترى</span><div style="font-family:var(--num)" class="neg">'+N(us)+'</div></div></div>'+
   '<div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">'+
   '<button class="btn sm e" data-act="alloc" data-id="'+g.id+'">＋ مساهمة</button>'+
   '<button class="btn sm" data-act="release" data-id="'+g.id+'">تحرير</button>'+
   '<button class="btn sm" data-act="goalBuy" data-id="'+g.id+'">شراء</button>'+
   '<button class="btn sm" data-act="goalToggle" data-id="'+g.id+'">'+(g.status==="ACTIVE"?"إيقاف":"تفعيل")+'</button></div></div>'});
 return h+'</div>'}
function sCommit(){materialize(LG,45);
 var h=backBar("الالتزامات والفواتير");
 h+='<div class="alert info"><span class="ai">◈</span><div><b>الاستحقاق ليس مصروفاً</b><small>لا يتحوّل إلى دفع تلقائي. الدفع بتاريخه الفعلي والاستحقاق بتاريخه الأصلي.</small></div></div>';
 h+='<button class="btn p w" data-act="cmNew">＋ التزام متكرر</button>';
 var open=LG.occurrences.filter(function(o){return["OVERDUE","DUE","PARTIAL"].indexOf(o.status)>=0});
 if(open.length)h+='<div class="tot" style="margin-top:13px"><span>مطلوب دفعه الآن<br><small style="color:var(--mute)">'+open.length+' استحقاق</small></span><b>'+
  N(open.reduce(function(s,o){return s+o.amount-o.paid},0))+'</b></div>';
 [["OVERDUE","متأخرة","bad"],["DUE","مستحقة اليوم","warn"],["PARTIAL","مدفوعة جزئياً","info"],
  ["SCHEDULED","قادمة",""],["PAID","مدفوعة","ok"],["SKIPPED","متخطاة",""]].forEach(function(g){
  var list=LG.occurrences.filter(function(o){return o.status===g[0]}).sort(function(a,b){return a.dueOn<b.dueOn?-1:1});
  if(!list.length)return;
  h+='<div class="sect"><h2>'+g[1]+' <span class="tag '+g[2]+'">'+list.length+'</span></h2></div><div class="rows">';
  list.slice(0,20).forEach(function(o){var c=LG.commitments.filter(function(x){return x.id===o.commitmentId})[0]||{name:"—",categoryId:"other"};
   h+='<div class="row"><div class="ico">'+cat(c.categoryId)[2]+'</div>'+
    '<button class="mid" data-act="occDetail" data-id="'+o.id+'"><b>'+esc(c.name)+'</b>'+
    '<small>استحقاق '+esc(o.dueOn)+(o.paid?' · مدفوع '+N(o.paid):"")+'</small></button>'+
    '<div style="text-align:end"><div class="amt '+(g[0]==="PAID"?"pos":"neg")+'">'+N(o.amount-o.paid)+'</div>'+
    (["DUE","OVERDUE","PARTIAL"].indexOf(o.status)>=0?'<button class="btn sm e" style="margin-top:5px" data-act="occPay" data-id="'+o.id+'">دفع</button>':"")+'</div></div>'});
  h+='</div>'});
 h+='<div class="sect"><h2>القواعد المتكررة</h2></div><div class="rows">';
 if(!LG.commitments.length)h+=emptyState("لا التزامات","أضف الإيجار أو الكهرباء","＋ التزام","cmNew");
 LG.commitments.forEach(function(c){h+='<div class="row"><div class="ico">'+cat(c.categoryId)[2]+'</div>'+
  '<div class="mid"><b>'+esc(c.name)+'</b><small>يوم '+c.anchorDay+' شهرياً · '+N(c.amount)+' دج · سماح '+(c.graceDays||0)+' يوم'+
  (c.status!=="ACTIVE"?" · موقوف":"")+'</small></div>'+
  '<button class="btn sm" data-act="cmEdit" data-id="'+c.id+'">تعديل</button>'+
  '<button class="btn sm" data-act="cmToggle" data-id="'+c.id+'">'+(c.status==="ACTIVE"?"إيقاف":"تفعيل")+'</button></div>'});
 return h+'</div>'}
function sDebts(){var isD=ui.debtTab==="debt";
 var list=LG.parties.map(function(p){return{p:p,d:partyBal(LG,p.id,"DEBT"),r:partyBal(LG,p.id,"RECEIVABLE")}})
  .filter(function(x){return isD?x.d>0:x.r>0});
 var total=list.reduce(function(s,x){return s+(isD?x.d:x.r)},0);
 var h=backBar("الديون والحقوق");
 h+='<div class="tabs2"><button class="'+(isD?"on":"")+'" data-act="debtTab" data-k="debt">ديون عليّ</button>'+
  '<button class="'+(!isD?"on":"")+'" data-act="debtTab" data-k="recv">حقوق لي</button></div>';
 h+='<div class="tot"><span>'+(isD?"إجمالي أصل الدين المتبقي":"إجمالي الحقوق المستحقة")+
  '<br><small style="color:var(--mute)">أساس نقدي — الفوائد عند دفعها</small></span><b>'+N(total)+'</b></div>';
 h+='<div style="display:flex;gap:9px"><button class="btn p" style="flex:1" data-act="'+(isD?"borrow":"lend")+'">'+
  (isD?"＋ قرض مستلم":"＋ إقراض جديد")+'</button><button class="btn" data-act="partyNew">＋ جهة</button></div>';
 if(!list.length)return h+'<div style="margin-top:14px">'+emptyState(isD?"لا ديون عليك":"لا حقوق لك","","＋ إضافة",isD?"borrow":"lend")+'</div>';
 h+='<div style="margin-top:14px">';
 list.forEach(function(x){var bal=isD?x.d:x.r;
  var txs=LG.transactions.filter(function(t){return t.partyId===x.p.id&&t.status==="POSTED"});
  h+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'+
   '<b style="font-size:14px">'+(isD?"🤝":"🫱")+" "+esc(x.p.name)+'</b><b style="font-family:var(--num);font-size:17px" class="'+(isD?"neg":"pos")+'">'+N(bal)+'</b></div>'+
   '<div class="prog"><span>'+txs.length+' حركة</span><span>آخرها '+esc(txs.length?txs[txs.length-1].occurredOn:"—")+'</span></div>'+
   '<div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">'+
   (isD?'<button class="btn sm e" data-act="debtPay" data-id="'+x.p.id+'">تسديد</button><button class="btn sm" data-act="forgive" data-id="'+x.p.id+'">إعفاء</button>'
    :'<button class="btn sm e" data-act="collect" data-id="'+x.p.id+'">تحصيل</button><button class="btn sm d" data-act="writeoff" data-id="'+x.p.id+'">إعدام جزء</button>')+
   '<button class="btn sm" data-act="partyDetail" data-id="'+x.p.id+'">كشف</button></div></div>'});
 return h+'</div>'}
function sFood(){var h=backBar("الطعام والأسعار");
 h+='<div class="alert info"><span class="ai">◈</span><div><b>لا أسعار مخترعة</b><small>كل سعر مصدره شراء فعلي أو إدخال موثّق. تعديل الدليل لا يغيّر الفواتير القديمة.</small></div></div>';
 h+='<div style="display:flex;gap:9px"><button class="btn p" style="flex:1" data-act="invoice">＋ فاتورة تفصيلية</button>'+
  '<button class="btn" data-act="itemNew">＋ مادة</button></div>';
 h+='<div class="sect"><h2>دليل المواد <span class="tag">'+LG.items.length+'</span></h2></div>';
 if(!LG.items.length)h+=emptyState("الدليل فارغ","أضف المواد التي تشتريها","＋ مادة","itemNew");
 else{h+='<div class="rows">';
  LG.items.slice(0,60).forEach(function(it){
   var ps=LG.prices.filter(function(p){return p.itemId===it.id}).sort(function(a,b){return a.on<b.on?1:-1});
   var last=ps[0],first=ps[ps.length-1];
   var trend=last&&first&&first.amount>0?Math.round((last.amount/first.amount-1)*100):0;
   h+='<button class="row" data-act="itemDetail" data-id="'+it.id+'"><div class="ico">'+cat(it.categoryId)[2]+'</div>'+
    '<div class="mid"><b>'+esc(it.name)+'</b><small>'+esc(it.unit)+' · '+ps.length+' سعر'+(last?" · "+esc(last.store):"")+'</small></div>'+
    '<div style="text-align:end"><div class="amt">'+(last?N(last.amount):"—")+'</div>'+
    (ps.length>1?'<small style="font-size:9.5px;color:'+(trend>0?"var(--coral2)":"var(--em2)")+'">'+(trend>0?"+":"")+trend+'%</small>':"")+'</div></button>'});
  h+='</div>'}
 var invs=LG.invoices.slice().sort(function(a,b){return a.on<b.on?1:-1}).slice(0,12);
 if(invs.length){h+='<div class="sect"><h2>فواتير حديثة</h2></div><div class="rows">';
  invs.forEach(function(iv){h+='<button class="row" data-act="invDetail" data-id="'+iv.id+'"><div class="ico">🧾</div>'+
   '<div class="mid"><b>'+esc(iv.store||"فاتورة")+'</b><small>'+esc(iv.on)+' · '+(iv.lines||[]).length+' عناصر</small></div>'+
   '<div class="amt neg">'+N(iv.total)+'</div></button>'});h+='</div>'}
 return h}
function sAudit(){var list=LG.audit.slice().sort(function(a,b){return a.at<b.at?1:-1}).slice(0,200);
 var h=backBar("سجل التدقيق");
 h+='<div class="alert info"><span class="ai">◈</span><div><b>لا حذف صامت</b><small>كل ترحيل وعكس وتخصيص موثّق بسببه ووقته.</small></div></div>';
 h+='<div class="grid2" style="margin-bottom:13px"><div class="metric"><span>إجمالي الأحداث</span><b>'+LG.audit.length+'</b></div>'+
  '<div class="metric"><span>حركات معكوسة</span><b class="neg">'+LG.transactions.filter(function(t){return t.status==="REVERSED"}).length+'</b></div></div>';
 if(!list.length)return h+emptyState("السجل فارغ","ستظهر هنا كل العمليات","","");
 list.forEach(function(a){h+='<div class="aud"><div class="ah"><span class="aa">'+esc(a.action)+'</span>'+
  '<span class="at">'+esc(a.at.slice(0,19).replace("T"," "))+'</span></div>'+
  '<div class="ar">'+esc(a.entity)+" · "+esc(a.title||a.entityId)+(a.reason?' · السبب: '+esc(a.reason):"")+'</div></div>'});
 return h}
function sBackup(){var h=backBar("البيانات والنسخ");
 h+='<div class="card"><div class="sect" style="margin:0 0 10px"><h2>تصدير</h2></div>'+
  '<p style="font-size:12px;color:var(--mute);margin:0 0 13px">ملف JSON كامل يشمل الحركات والقيود والتخصيصات وسجل التدقيق.</p>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn p" data-act="exportJson">⬇ نسخة JSON</button>'+
  '<button class="btn" data-act="exportCsv" data-k="tx">CSV الحركات</button>'+
  '<button class="btn" data-act="exportCsv" data-k="lines">CSV القيود</button>'+
  '<button class="btn" data-act="exportCsv" data-k="prices">CSV الأسعار</button></div></div>';
 h+='<div class="card"><div class="sect" style="margin:0 0 10px"><h2>استعادة</h2></div>'+
  '<p style="font-size:12px;color:var(--mute);margin:0 0 13px">تُفحص البنية والمعرّفات وتوازن القيود قبل أي استبدال، وتُصدَّر نسخة من بياناتك الحالية أولاً.</p>'+
  '<button class="btn w" data-act="restorePick">⬆ اختر ملف نسخة</button></div>';
 h+='<div class="card"><div class="sect" style="margin:0 0 10px"><h2>التخزين</h2></div>'+
  '<div id="storeInfo" class="kv"><span>جارٍ القياس…</span><b></b></div>'+
  '<button class="btn w" style="margin-top:11px" data-act="persistReq">طلب حماية التخزين</button>'+
  '<p style="font-size:10.5px;color:var(--faint);margin-top:9px;line-height:1.7">بعض المتصفحات تمسح بيانات المواقع غير المثبّتة. ثبّت التطبيق وصدّر نسخة دورياً.</p></div>';
 h+='<div class="card" style="border-color:#D96C6C44"><div class="sect" style="margin:0 0 10px"><h2 class="neg">منطقة الخطر</h2></div>'+
  '<p style="font-size:12px;color:var(--mute);margin:0 0 13px">المسح يبدأ دفترك من الصفر. صدّر نسخة أولاً.</p>'+
  '<button class="btn d w" data-act="wipeAll">مسح كل البيانات</button></div>';
 setTimeout(storeInfo,60);return h}
function storeInfo(){var el=$("storeInfo");if(!el)return;
 if(!navigator.storage||!navigator.storage.estimate){el.innerHTML='<span>القياس غير متاح</span><b>—</b>';return}
 navigator.storage.estimate().then(function(e){
  var per=navigator.storage.persisted?navigator.storage.persisted():Promise.resolve(false);
  return per.then(function(p){el.innerHTML='<span>المستخدم '+(e.usage/1048576).toFixed(2)+' م.ب</span><b>'+(p?"✓ محمي":"غير محمي")+'</b>'})},
  function(){el.innerHTML='<span>القياس غير متاح</span><b>—</b>'})}
function sSettings(){var s=LG.settings,pos=positions(LG),cy=D.cycle(today(),s.payday);
 var h=backBar("الإعدادات");
 h+='<div class="card"><div class="sect" style="margin:0 0 6px"><h2>العرض</h2></div>'+
  '<div class="switch"><div class="st"><b>المظهر الفاتح</b><small>الداكن افتراضي</small></div>'+
  '<button class="tog'+(s.theme==="light"?" on":"")+'" data-act="theme"></button></div>'+
  '<div class="fld" style="margin-top:13px"><label>بداية الأسبوع</label><select data-set="weekStart">'+
  ARD.map(function(d,i){return'<option value="'+i+'"'+(s.weekStart===i?" selected":"")+'>'+d+'</option>'}).join("")+'</select></div>'+
  '<div class="fld"><label>يوم استلام الراتب</label><input type="number" min="1" max="31" value="'+s.payday+'" data-set="payday">'+
  '<div class="hint">الدورة الحالية: '+esc(cy.start)+' ← '+esc(cy.end)+'</div></div>'+
  '<div class="fld"><label>الفترة الافتراضية</label><select data-set="period">'+
  [["today","اليوم"],["week","الأسبوع"],["month","الشهر"],["cycle","دورة الراتب"],["year","السنة"]]
   .map(function(o){return'<option value="'+o[0]+'"'+(s.period===o[0]?" selected":"")+'>'+o[1]+'</option>'}).join("")+'</select></div></div>';
 h+='<div class="card"><div class="sect" style="margin:0 0 10px"><h2>سلامة البيانات</h2></div>'+
  '<div class="kv"><span>ميزان المراجعة</span><b class="'+(pos.trial.ok?"pos":"neg")+'">'+(pos.trial.ok?"✓ متوازن":"✗ خلل")+'</b></div>'+
  '<div class="kv"><span>مدين = دائن</span><b>'+N(pos.trial.debit)+' = '+N(pos.trial.credit)+'</b></div>'+
  '<div class="kv"><span>سطور القيود</span><b>'+pos.count+'</b></div>'+
  '<div class="kv"><span>العملة والدقة</span><b>DZD · سنتيم صحيح</b></div>'+
  '<button class="btn p w" style="margin-top:12px" data-act="runChecks">▶ تشغيل فحوص القبول</button>'+
  '<div id="checksOut" style="margin-top:12px"></div></div>';
 h+='<div class="card"><div class="sect" style="margin:0 0 10px"><h2>التصنيفات والمصادر</h2></div>'+
  '<div class="chips">'+s.categories.map(function(c){return'<span class="chip" style="border-color:'+c[3]+'55">'+c[2]+" "+esc(c[1])+'</span>'}).join("")+'</div>'+
  '<button class="btn sm" style="margin-top:10px" data-act="catNew">＋ تصنيف</button>'+
  '<div class="chips" style="margin-top:12px">'+s.sources.map(function(x){return'<span class="chip">'+x[2]+" "+esc(x[1])+'</span>'}).join("")+'</div>'+
  '<button class="btn sm" style="margin-top:10px" data-act="srcNew">＋ مصدر دخل</button></div>';
 h+='<div class="card"><div class="sect" style="margin:0 0 10px"><h2>وضع الاستكشاف</h2></div>'+
  '<div class="switch"><div class="st"><b>بيانات تجريبية</b><small>'+(s.demo?"مفعّل — ليست أموالك":"مطفأ — حسابك حقيقي")+'</small></div>'+
  '<button class="tog'+(s.demo?" on":"")+'" data-act="demoToggle"></button></div>'+
  '<p style="font-size:10.5px;color:var(--faint);margin-top:10px;line-height:1.7">لا تُخلط البيانات التجريبية بحسابك الحقيقي أبداً.</p></div>';
 h+='<div class="card"><div class="sect" style="margin:0 0 8px"><h2>عن التطبيق</h2></div>'+
  '<div class="kv"><span>الإصدار</span><b>4.0</b></div>'+
  '<div class="kv"><span>المحرك</span><b>قيد مزدوج · append-only</b></div>'+
  '<div class="kv"><span>التخزين</span><b>IndexedDB · محلي</b></div>'+
  '<div class="kv"><span>الشبكة</span><b>لا اتصال خارجي</b></div></div>';
 return h}
/* ══════════════ لوحات التفاصيل ══════════════ */
function cashSheet(){var st=statement(LG,today()),pos=positions(LG);
 var b='<div class="tot"><span>الرصيد الحالي</span><b>'+N(pos.cash)+'</b></div>'+
  '<div class="kv"><span>حركات النقد</span><b>'+st.rows.length+'</b></div>'+
  '<div class="kv"><span>مدين = دائن</span><b class="'+(pos.trial.ok?"pos":"neg")+'">'+N(pos.trial.debit)+' = '+N(pos.trial.credit)+'</b></div>'+
  '<div class="sect"><h2>كشف الحساب</h2></div>';
 b+=st.rows.slice(-60).reverse().map(function(r){
  return '<button class="jline" data-act="txDetail" data-id="'+r.txId+'" style="width:100%;text-align:start">'+
   '<span class="sd '+(r.delta>0?"d":"c")+'">'+(r.delta>0?"قبض":"صرف")+'</span>'+
   '<span class="an">'+esc(r.title)+'<br><small style="color:var(--faint)">'+esc(r.date)+'</small></span>'+
   '<span class="vv" style="color:'+(r.delta>0?"var(--em2)":"var(--coral2)")+'">'+(r.delta>0?"+":"")+N(r.delta)+
   '<br><small style="color:var(--faint);font-weight:400">رصيد '+N(r.run)+'</small></span></button>'}).join("");
 drawer("كشف النقد",b)}
function availSheet(){var p=positions(LG);
 var b='<div class="tot"><span>المتاح للإنفاق</span><b>'+N(p.available)+'</b></div>'+
  '<div class="kv"><span>النقد الفعلي</span><b>'+N(p.cash)+'</b></div>'+
  '<div class="kv"><span>مخصص لأهداف نشطة</span><b class="gold">'+N(p.reserved)+'</b></div>'+
  '<div class="kv"><span>المخصص الممول</span><b>'+N(p.funded)+'</b></div>'+
  (p.gap>0?'<div class="kv"><span>غير ممول</span><b class="neg">'+N(p.gap)+'</b></div>':"")+
  '<p style="font-size:11.5px;color:var(--mute);line-height:1.8;margin-top:14px">المتاح = النقد − التخصيص الممول. الميزانيات لا تخصم لأنها خطط. الادخار مطالبة على نفس النقد لا حساب منفصل.</p>'+
  '<div class="sect"><h2>الأهداف الحاجزة</h2></div>';
 LG.goals.filter(function(g){return g.status==="ACTIVE"}).forEach(function(g){
  b+='<div class="kv"><span>'+esc(g.icon||"🎯")+" "+esc(g.name)+'</span><b>'+N(goalBal(LG,g.id))+'</b></div>'});
 drawer("المتاح للإنفاق",b)}
function flowSheet(kind){var p=period(),acc=kind==="income"?"INCOME":"EXPENSE";
 var ls=LG.lines.filter(function(l){return l.account===acc&&l.occurredOn>=p.start&&l.occurredOn<=p.end});
 var total=ls.reduce(function(s,l){return s+(l.side===(acc==="INCOME"?CR:DB)?l.amount:-l.amount)},0);
 var b='<div class="tot"><span>'+(kind==="income"?"دخل":"مصروف")+" "+esc(p.label)+'</span><b>'+N(total)+'</b></div>',seen={};
 ls.forEach(function(l){var t=null;
  for(var i=0;i<LG.transactions.length;i++)if(LG.transactions[i].id===l.txId)t=LG.transactions[i];
  if(!t||seen[t.id+l.sub])return;seen[t.id+l.sub]=1;
  var v=l.side===(acc==="INCOME"?CR:DB)?l.amount:-l.amount;
  b+='<button class="row" data-act="txDetail" data-id="'+t.id+'" style="margin-bottom:7px"><div class="ico">'+
   (kind==="income"?src(t.sourceId)[2]:cat(l.sub)[2])+'</div><div class="mid"><b>'+esc(t.title)+'</b><small>'+esc(l.occurredOn)+'</small></div>'+
   '<div class="amt">'+N(v)+'</div></button>'});
 drawer(kind==="income"?"تفاصيل الدخل":"تفاصيل المصروف",b)}
function catSheet(id,from,to){
 var ls=LG.lines.filter(function(l){return l.account==="EXPENSE"&&l.sub===id&&l.occurredOn>=from&&l.occurredOn<=to});
 var tot=ls.reduce(function(s,l){return s+(l.side===DB?l.amount:-l.amount)},0);
 var b='<div class="tot"><span>'+cat(id)[2]+" "+esc(cat(id)[1])+'</span><b>'+N(tot)+'</b></div>',seen={};
 ls.forEach(function(l){var t=null;
  for(var i=0;i<LG.transactions.length;i++)if(LG.transactions[i].id===l.txId)t=LG.transactions[i];
  if(!t||seen[t.id])return;seen[t.id]=1;
  b+='<button class="row" data-act="txDetail" data-id="'+t.id+'" style="margin-bottom:7px"><div class="ico">'+cat(id)[2]+
   '</div><div class="mid"><b>'+esc(t.title)+'</b><small>'+esc(l.occurredOn)+'</small></div><div class="amt">'+
   N(l.side===DB?l.amount:-l.amount)+'</div></button>'});
 drawer("تصنيف "+cat(id)[1],b)}
function srcSheet(id,from,to){
 var ls=LG.lines.filter(function(l){return l.account==="INCOME"&&l.sub===id&&l.occurredOn>=from&&l.occurredOn<=to});
 var tot=ls.reduce(function(s,l){return s+(l.side===CR?l.amount:-l.amount)},0);
 var b='<div class="tot"><span>'+src(id)[2]+" "+esc(src(id)[1])+'</span><b>'+N(tot)+'</b></div>';
 ls.forEach(function(l){var t=null;
  for(var i=0;i<LG.transactions.length;i++)if(LG.transactions[i].id===l.txId)t=LG.transactions[i];
  if(!t)return;b+='<button class="row" data-act="txDetail" data-id="'+t.id+'" style="margin-bottom:7px"><div class="ico">'+src(id)[2]+
   '</div><div class="mid"><b>'+esc(t.title)+'</b><small>'+esc(l.occurredOn)+'</small></div><div class="amt pos">'+N(l.amount)+'</div></button>'});
 drawer("مصدر الدخل",b)}
function txDetail(id){var t=null;
 for(var i=0;i<LG.transactions.length;i++)if(LG.transactions[i].id===id)t=LG.transactions[i];
 if(!t)return;
 var e=null;for(var j=0;j<LG.entries.length;j++)if(LG.entries[j].txId===id)e=LG.entries[j];
 var ls=LG.lines.filter(function(l){return l.entryId===(e&&e.id)});
 var inc=INC_TYPES.indexOf(t.type)>=0;
 var b='<div class="tot"><span>'+esc(LBL[t.type])+(t.status==="REVERSED"?" · معكوسة":"")+'</span><b class="'+(inc?"pos":"neg")+'">'+N(t.amount)+'</b></div>';
 b+='<div class="kv"><span>تاريخ الوقوع</span><b>'+esc(t.occurredOn)+'</b></div>'+
  '<div class="kv"><span>تاريخ التسجيل</span><b style="font-size:11px">'+esc(t.createdAt.slice(0,19).replace("T"," "))+'</b></div>';
 if(t.categoryId)b+='<div class="kv"><span>التصنيف</span><b>'+cat(t.categoryId)[2]+" "+esc(cat(t.categoryId)[1])+'</b></div>';
 if(t.sourceId)b+='<div class="kv"><span>المصدر</span><b>'+src(t.sourceId)[2]+" "+esc(src(t.sourceId)[1])+'</b></div>';
 var p=party(t.partyId);if(p)b+='<div class="kv"><span>الجهة</span><b>'+esc(p.name)+'</b></div>';
 var g=goal(t.goalId);if(g)b+='<div class="kv"><span>هدف الادخار</span><b>'+esc(g.name)+'</b></div>';
 if(t.principal)b+='<div class="kv"><span>أصل الدين</span><b>'+N(t.principal)+'</b></div>';
 if(t.fees)b+='<div class="kv"><span>فوائد ورسوم</span><b>'+N(t.fees)+'</b></div>';
 if(t.note)b+='<div class="kv"><span>ملاحظة</span><b style="font-family:var(--ff)">'+esc(t.note)+'</b></div>';
 if(t.reason)b+='<div class="kv"><span>السبب</span><b style="font-family:var(--ff)">'+esc(t.reason)+'</b></div>';
 b+='<div class="sect"><h2>القيد المحاسبي</h2></div>';
 b+=ls.map(function(l){var label=ACC[l.account].l,detail="";
  if(l.sub){if(l.sub===SUB.FEES)detail="فوائد ورسوم";else if(l.sub===SUB.BAD)detail="حق معدوم";
   else if(l.account==="EXPENSE")detail=cat(l.sub)[1];
   else if(l.account==="INCOME")detail=src(l.sub)[1];
   else{var pp=party(l.sub);detail=pp?pp.name:l.sub}}
  return '<div class="jline"><span class="sd '+(l.side===DB?"d":"c")+'">'+(l.side===DB?"مدين":"دائن")+'</span>'+
   '<span class="an">'+esc(label)+(detail?'<br><small style="color:var(--faint)">'+esc(detail)+'</small>':"")+'</span>'+
   '<span class="vv">'+N(l.amount)+'</span></div>'}).join("");
 var dd=0,cc=0;ls.forEach(function(l){if(l.side===DB)dd+=l.amount;else cc+=l.amount});
 b+='<div class="kv" style="margin-top:8px"><span>التوازن</span><b class="'+(dd===cc?"pos":"neg")+'">'+N(dd)+' = '+N(cc)+'</b></div>';
 if(t.invoiceId){var iv=null;
  for(var q=0;q<LG.invoices.length;q++)if(LG.invoices[q].id===t.invoiceId)iv=LG.invoices[q];
  if(iv){b+='<div class="sect"><h2>عناصر الفاتورة</h2></div>'+iv.lines.map(function(l){
   return '<div class="jline"><span class="an">'+esc(l.name)+'<br><small style="color:var(--faint)">'+
    M.fmtQty(l.qty)+" "+esc(l.unit)+" × "+N(l.price)+'</small></span><span class="vv">'+N(l.total)+'</span></div>'}).join("")}}
 if(t.type==="EXPENSE"){var done=0;
  LG.transactions.forEach(function(x){if(x.type==="REFUND"&&x.originalTxId===t.id&&x.status==="POSTED")done+=x.amount});
  b+='<div class="kv"><span>مسترجع</span><b>'+N(done)+'</b></div><div class="kv"><span>قابل للاسترجاع</span><b class="pos">'+N(t.amount-done)+'</b></div>'}
 b+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">';
 if(t.status==="POSTED"&&t.type!=="REVERSAL"){
  b+='<button class="btn sm" data-act="txEdit" data-id="'+t.id+'">تعديل</button>';
  if(t.type==="EXPENSE")b+='<button class="btn sm" data-act="refund" data-id="'+t.id+'">استرجاع</button>';
  b+='<button class="btn sm d" data-act="txReverse" data-id="'+t.id+'">عكس</button>'}
 if(t.reversalOf)b+='<button class="btn sm" data-act="txDetail" data-id="'+t.reversalOf+'">الأصل</button>';
 if(t.reversedBy)b+='<button class="btn sm" data-act="txDetail" data-id="'+t.reversedBy+'">قيد العكس</button>';
 drawer("تفاصيل الحركة",b+'</div>')}
function goalDetail(id){var g=goal(id);if(!g)return;
 var b=goalBal(LG,id),evs=LG.savings.filter(function(s){return s.goalId===id}).sort(function(a,x){return a.occurredOn<x.occurredOn?1:-1});
 var h='<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">'+ring(g.target?b/g.target:0,"var(--gold)",70)+
  '<div><b style="font-size:17px">'+esc(g.icon||"🎯")+" "+esc(g.name)+'</b><div style="font-size:12px;color:var(--mute)">'+
  N(b)+(g.target?" من "+N(g.target):"")+' دج</div></div></div>';
 if(g.target)h+='<div class="kv"><span>المتبقي للهدف</span><b>'+N(Math.max(0,g.target-b))+'</b></div>';
 if(g.dueOn)h+='<div class="kv"><span>الموعد المستهدف</span><b>'+esc(g.dueOn)+'</b></div>';
 h+='<div class="kv"><span>الحالة</span><b>'+(g.status==="ACTIVE"?"نشط":"موقوف")+'</b></div><div class="sect"><h2>سجل الهدف</h2></div>';
 h+=evs.length?evs.map(function(e){return '<div class="jline"><span class="sd '+(e.kind==="ALLOCATE"?"d":"c")+'">'+
  (e.kind==="ALLOCATE"?"＋":e.kind==="RELEASE"?"تحرير":"شراء")+'</span><span class="an">'+esc(e.note||e.kind)+
  '<br><small style="color:var(--faint)">'+esc(e.occurredOn)+'</small></span><span class="vv" style="color:'+
  (e.kind==="ALLOCATE"?"var(--em2)":"var(--coral2)")+'">'+(e.kind==="ALLOCATE"?"+":"−")+N(e.amount)+'</span></div>'}).join("")
  :'<div class="empty">لا مساهمات بعد</div>';
 h+='<div style="display:flex;gap:8px;margin-top:15px;flex-wrap:wrap"><button class="btn sm e" data-act="alloc" data-id="'+id+'">＋ مساهمة</button>'+
  '<button class="btn sm" data-act="release" data-id="'+id+'">تحرير</button><button class="btn sm" data-act="goalBuy" data-id="'+id+'">شراء</button></div>';
 drawer("هدف الادخار",h)}
function budgetDetail(id){var b=budgetStatus().filter(function(x){return x.id===id})[0];if(!b)return;
 var r=D.mrange(D.mkey(today()));
 var ls=LG.lines.filter(function(l){return l.account==="EXPENSE"&&l.sub===b.categoryId&&l.occurredOn>=r.start&&l.occurredOn<=r.end});
 var h='<div class="tot"><span>المتبقي</span><b class="'+(b.left<0?"neg":"pos")+'">'+N(b.left)+'</b></div>'+
  '<div class="kv"><span>الحد</span><b>'+N(b.amount)+'</b></div><div class="kv"><span>المستهلك</span><b>'+N(b.spent)+'</b></div>'+
  '<div class="sect"><h2>الحركات المؤهلة</h2></div>',seen={};
 ls.forEach(function(l){var t=null;
  for(var i=0;i<LG.transactions.length;i++)if(LG.transactions[i].id===l.txId)t=LG.transactions[i];
  if(!t||seen[t.id])return;seen[t.id]=1;
  h+='<button class="row" data-act="txDetail" data-id="'+t.id+'" style="margin-bottom:7px"><div class="ico">'+cat(b.categoryId)[2]+
   '</div><div class="mid"><b>'+esc(t.title)+'</b><small>'+esc(l.occurredOn)+'</small></div><div class="amt">'+N(l.side===DB?l.amount:-l.amount)+'</div></button>'});
 drawer("ميزانية "+b.name,h||'<div class="empty">لا مصروف</div>')}
function occDetail(id){var o=null;
 for(var i=0;i<LG.occurrences.length;i++)if(LG.occurrences[i].id===id)o=LG.occurrences[i];
 if(!o)return;
 var c=LG.commitments.filter(function(x){return x.id===o.commitmentId})[0]||{};
 var h='<div class="tot"><span>المتبقي</span><b class="'+(o.amount-o.paid>0?"neg":"pos")+'">'+N(o.amount-o.paid)+'</b></div>'+
  '<div class="kv"><span>الالتزام</span><b>'+esc(c.name||"—")+'</b></div>'+
  '<div class="kv"><span>تاريخ الاستحقاق</span><b>'+esc(o.dueOn)+'</b></div>'+
  '<div class="kv"><span>الفترة</span><b>'+esc(D.mLabel(o.periodKey))+'</b></div>'+
  '<div class="kv"><span>المبلغ المتوقع</span><b>'+N(o.amount)+'</b></div>'+
  '<div class="kv"><span>المدفوع</span><b class="pos">'+N(o.paid)+'</b></div>'+
  '<div class="kv"><span>الحالة</span><b>'+esc(o.status)+'</b></div><div class="sect"><h2>الدفعات</h2></div>';
 var txs=(o.txIds||[]).map(function(i){return LG.transactions.filter(function(t){return t.id===i})[0]}).filter(Boolean);
 h+=txs.length?txs.map(function(t){return '<button class="row" data-act="txDetail" data-id="'+t.id+'" style="margin-bottom:7px">'+
  '<div class="ico">💸</div><div class="mid"><b>'+esc(t.title)+'</b><small>دُفع في '+esc(t.occurredOn)+'</small></div>'+
  '<div class="amt neg">'+N(t.amount)+'</div></button>'}).join(""):'<div class="empty">لم تُدفع أي دفعة</div>';
 if(["DUE","OVERDUE","PARTIAL"].indexOf(o.status)>=0)
  h+='<div style="display:flex;gap:8px;margin-top:15px"><button class="btn sm e" data-act="occPay" data-id="'+id+'">تسجيل دفعة</button>'+
   '<button class="btn sm" data-act="occSkip" data-id="'+id+'">تخطي</button></div>';
 drawer("استحقاق",h)}
function partyDetail(id){var p=party(id);if(!p)return;
 var txs=LG.transactions.filter(function(t){return t.partyId===id}).sort(function(a,b){return a.occurredOn<b.occurredOn?1:-1});
 var h='<div class="kv"><span>الجهة</span><b>'+esc(p.name)+'</b></div>'+
  '<div class="kv"><span>دين عليك</span><b class="neg">'+N(partyBal(LG,id,"DEBT"))+'</b></div>'+
  '<div class="kv"><span>حق لك</span><b class="pos">'+N(partyBal(LG,id,"RECEIVABLE"))+'</b></div><div class="sect"><h2>كل الحركات</h2></div>';
 h+=txs.map(function(t){return '<button class="row" data-act="txDetail" data-id="'+t.id+'" style="margin-bottom:7px">'+
  '<div class="ico">🤝</div><div class="mid"><b>'+esc(t.title)+'</b><small>'+esc(t.occurredOn)+" · "+esc(LBL[t.type])+'</small></div>'+
  '<div class="amt">'+N(t.amount)+'</div></button>'}).join("");
 drawer("كشف "+p.name,h)}
function itemDetail(id){var it=LG.items.filter(function(x){return x.id===id})[0];if(!it)return;
 var ps=LG.prices.filter(function(p){return p.itemId===id}).sort(function(a,b){return a.on<b.on?1:-1});
 var h='<div class="kv"><span>الاسم</span><b>'+esc(it.name)+'</b></div>'+
  (it.nameFr?'<div class="kv"><span>بالفرنسية</span><b>'+esc(it.nameFr)+'</b></div>':"")+
  '<div class="kv"><span>الوحدة</span><b>'+esc(it.unit)+'</b></div>'+
  '<div class="kv"><span>التصنيف</span><b>'+cat(it.categoryId)[2]+" "+esc(cat(it.categoryId)[1])+'</b></div>'+
  '<div class="sect"><h2>سجل الأسعار ('+ps.length+')</h2></div>';
 h+=ps.length?ps.map(function(p){return '<div class="jline"><span class="an">'+esc(p.store||"—")+
  '<br><small style="color:var(--faint)">'+esc(p.on)+" · "+esc(p.source)+'</small></span><span class="vv">'+N(p.amount)+
  '<br><small style="color:var(--faint);font-weight:400">/ '+esc(p.unit)+'</small></span></div>'}).join(""):'<div class="empty">لا أسعار</div>';
 h+='<button class="btn p w" style="margin-top:14px" data-act="priceAdd" data-id="'+id+'">＋ سعر جديد</button>';
 drawer(it.name,h)}
function invDetail(id){var iv=LG.invoices.filter(function(x){return x.id===id})[0];if(!iv)return;
 var h='<div class="tot"><span>الإجمالي</span><b>'+N(iv.total)+'</b></div>'+
  '<div class="kv"><span>المتجر</span><b>'+esc(iv.store||"—")+'</b></div>'+
  '<div class="kv"><span>التاريخ</span><b>'+esc(iv.on)+'</b></div><div class="sect"><h2>العناصر</h2></div>';
 h+=(iv.lines||[]).map(function(l){return '<div class="jline"><span class="an">'+esc(l.name)+
  '<br><small style="color:var(--faint)">'+M.fmtQty(l.qty)+" "+esc(l.unit)+" × "+N(l.price)+'</small></span>'+
  '<span class="vv">'+N(l.total)+'</span></div>'}).join("");
 var s=M.sum((iv.lines||[]).map(function(l){return l.total}));
 h+='<div class="kv" style="margin-top:9px"><span>مجموع الأسطر = الإجمالي</span><b class="'+(s===iv.total?"pos":"neg")+'">'+N(s)+' = '+N(iv.total)+'</b></div>';
 h+='<button class="btn w" style="margin-top:14px" data-act="txDetail" data-id="'+iv.txId+'">فتح الحركة المرتبطة</button>';
 drawer("فاتورة",h)}
function monthDetail(k){var r=D.mrange(k),f=flow(LG,r.start,r.end),p=positions(LG,r.end);
 var h='<div class="grid2"><div class="metric"><span>الدخل</span><b class="pos">'+N(f.income)+'</b></div>'+
  '<div class="metric"><span>المصروف</span><b class="neg">'+N(f.expense)+'</b></div></div>'+
  '<div class="kv" style="margin-top:12px"><span>رصيد نهاية الشهر</span><b>'+N(p.cash)+'</b></div>'+
  '<div class="kv"><span>صافي الثروة</span><b>'+N(p.netWorth)+'</b></div><div class="sect"><h2>التصنيفات</h2></div>';
 Object.keys(f.byCat).map(function(c){return[c,f.byCat[c]]}).sort(function(a,b){return b[1]-a[1]}).forEach(function(e){
  h+='<button class="lg" data-act="catDetail" data-id="'+esc(e[0])+'" data-from="'+r.start+'" data-to="'+r.end+'">'+
   '<span class="dot" style="background:'+cat(e[0])[3]+'"></span><span class="nm">'+cat(e[0])[2]+" "+esc(cat(e[0])[1])+
   '</span><span class="vl">'+N(e[1])+'</span></button>'});
 drawer(D.mLabel(k),h)}
/* ══════════════ النماذج ══════════════ */
function catOpts(){return LG.settings.categories.map(function(c){return[c[0],c[2]+" "+c[1]]})}
function srcOpts(){return LG.settings.sources.map(function(s){return[s[0],s[2]+" "+s[1]]})}
function partyOpts(){return LG.parties.map(function(p){return[p.id,p.name]})}
function fIncome(){form({title:"تسجيل دخل",sub:"يزيد النقد ويُحتسب دخلاً مكتسباً",ok:"تسجيل",
 fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1,ph:"0"},
  {k:"sourceId",label:"المصدر",type:"pick",val:"salary",opts:srcOpts()},
  {k:"occurredOn",label:"تاريخ الوقوع",type:"date",val:today(),required:true},
  {k:"title",label:"الوصف",ph:"راتب نوفمبر"},{k:"note",label:"ملاحظة",type:"textarea"}],
 onSubmit:function(v){return commit(function(lg){post(lg,{type:"INCOME",amount:v.amount,sourceId:v.sourceId,
  occurredOn:v.occurredOn,opId:opId(),title:v.title||src(v.sourceId)[1],note:v.note})},"تم تسجيل دخل "+F(v.amount))}})}
function fExpense(){form({title:"تسجيل مصروف",sub:"يخفض النقد مرة واحدة",ok:"تسجيل",
 fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1,ph:"0"},
  {k:"categoryId",label:"التصنيف",type:"pick",val:"food",opts:catOpts()},
  {k:"occurredOn",label:"تاريخ الوقوع",type:"date",val:today(),required:true},
  {k:"title",label:"الوصف",ph:"مشتريات"},
  {k:"partyId",label:"الجهة (اختياري)",type:"select",val:"",opts:[["","— بدون —"]].concat(partyOpts())},
  {k:"note",label:"ملاحظة",type:"textarea"}],
 onSubmit:function(v){return commit(function(lg){post(lg,{type:"EXPENSE",amount:v.amount,categoryId:v.categoryId,
  occurredOn:v.occurredOn,opId:opId(),title:v.title||cat(v.categoryId)[1],partyId:v.partyId||null,note:v.note})},
  "تم تسجيل مصروف "+F(v.amount))}})}
function fRefund(txId){var t=LG.transactions.filter(function(x){return x.id===txId})[0],done=0;
 LG.transactions.forEach(function(x){if(x.type==="REFUND"&&x.originalTxId===txId&&x.status==="POSTED")done+=x.amount});
 var rem=t.amount-done;
 form({title:"استرجاع مصروف",sub:"المتبقي "+F(rem)+" — يزيد النقد ويخفض صافي الإنفاق ولا يظهر كدخل",ok:"استرجاع",
  fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1,val:M.fmt(rem)},
   {k:"occurredOn",label:"تاريخ الاسترجاع",type:"date",val:today(),required:true},
   {k:"note",label:"السبب",type:"textarea",val:"استرجاع جزئي"}],
  onSubmit:function(v){if(v.amount>rem)return{errors:{amount:"يتجاوز المتبقي "+F(rem)}};
   return commit(function(lg){post(lg,{type:"REFUND",amount:v.amount,categoryId:t.categoryId,originalTxId:txId,
    occurredOn:v.occurredOn,opId:opId(),title:"استرجاع: "+t.title,note:v.note})},"تم الاسترجاع "+F(v.amount))}})}
function fAdjust(){form({title:"تسوية موثقة",sub:"تصحيح فرق حقيقي بمبرر — الطرف المقابل حقوق ملكية لا دخل",ok:"ترحيل",
 fields:[{k:"amount",label:"الفرق (دج، سالب يخفض النقد)",type:"money",required:true,ph:"500 أو -500"},
  {k:"occurredOn",label:"التاريخ",type:"date",val:today(),required:true},
  {k:"reason",label:"المبرر (إلزامي)",type:"textarea",required:true,ph:"فرق صندوق بعد الجرد"}],
 onSubmit:function(v){if(!v.amount)return{errors:{amount:"لا تسوية بمبلغ صفري"}};
  return commit(function(lg){post(lg,{type:"ADJUST",amount:v.amount,occurredOn:v.occurredOn,opId:opId(),
   title:"تسوية",reason:v.reason})},"تمت التسوية")}})}
function fParty(cb){form({title:"جهة جديدة",ok:"حفظ",
 fields:[{k:"name",label:"الاسم",required:true,ph:"كريم — جار"},
  {k:"kind",label:"النوع",type:"pick",val:"person",opts:[["person","شخص"],["payee","مستفيد"],["lender","مقرض"],["employer","جهة عمل"]]},
  {k:"note",label:"ملاحظة"}],
 onSubmit:function(v){var id=uid("pt");LG.parties.push({id:id,name:v.name,kind:v.kind,note:v.note});
  dbSet(LG).then(function(){toast("تمت إضافة الجهة","ok");render();if(cb)cb(id)});return true}})}
function fBorrow(){if(!LG.parties.length){fParty(fBorrow);return}
 form({title:"قرض مستلم",sub:"يزيد النقد والالتزام معاً — ليس دخلاً مكتسباً",ok:"تسجيل",
  fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1},
   {k:"partyId",label:"المقرض",type:"select",val:LG.parties[0].id,opts:partyOpts(),required:true},
   {k:"occurredOn",label:"تاريخ الاستلام",type:"date",val:today(),required:true},
   {k:"note",label:"شروط وملاحظات",type:"textarea"}],
  onSubmit:function(v){return commit(function(lg){post(lg,{type:"BORROW",amount:v.amount,partyId:v.partyId,
   occurredOn:v.occurredOn,opId:opId(),title:"قرض من "+party(v.partyId).name,note:v.note})},"تم تسجيل القرض")}})}
function fDebtPay(pid){var bal=partyBal(LG,pid,"DEBT");
 form({title:"تسديد دين",sub:"أصل الدين المتبقي "+F(bal)+" — الأصل يخفض الالتزام والرسوم مصروف",ok:"تسديد",
  fields:[{k:"principal",label:"أصل الدين (دج)",type:"money",required:true,val:M.fmt(bal)},
   {k:"fees",label:"فوائد ورسوم (دج)",type:"money",val:"0"},
   {k:"occurredOn",label:"تاريخ الدفع",type:"date",val:today(),required:true},{k:"note",label:"ملاحظة",type:"textarea"}],
  onSubmit:function(v){if(v.principal>bal)return{errors:{principal:"يتجاوز المتبقي "+F(bal)}};
   if(v.principal+v.fees<=0)return{errors:{principal:"دفعة صفرية"}};
   return commit(function(lg){post(lg,{type:"DEBT_PAY",amount:v.principal+v.fees,principal:v.principal,fees:v.fees,
    partyId:pid,occurredOn:v.occurredOn,opId:opId(),title:"تسديد لـ"+party(pid).name,note:v.note})},
    "تم التسديد "+F(v.principal+v.fees))}})}
function fForgive(pid){var bal=partyBal(LG,pid,"DEBT");
 form({title:"إعفاء من دين",sub:"الدائن أسقط جزءاً — يخفض الالتزام بلا نقد ويُسجّل مكسباً",ok:"تسجيل",
  fields:[{k:"amount",label:"المبلغ المُعفى (دج)",type:"money",required:true,min:1,val:M.fmt(bal)},
   {k:"occurredOn",label:"التاريخ",type:"date",val:today(),required:true},
   {k:"reason",label:"السبب",type:"textarea",required:true}],
  onSubmit:function(v){if(v.amount>bal)return{errors:{amount:"يتجاوز الدين "+F(bal)}};
   return commit(function(lg){post(lg,{type:"FORGIVE",amount:v.amount,partyId:pid,occurredOn:v.occurredOn,
    opId:opId(),title:"إعفاء من "+party(pid).name,reason:v.reason})},"تم تسجيل الإعفاء")}})}
function fLend(){if(!LG.parties.length){fParty(fLend);return}
 form({title:"إقراض شخص",sub:"النقد ينخفض والحق يرتفع — صافي الثروة لا يتغير",ok:"تسجيل",
  fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1},
   {k:"partyId",label:"المقترض",type:"select",val:LG.parties[0].id,opts:partyOpts(),required:true},
   {k:"occurredOn",label:"التاريخ",type:"date",val:today(),required:true},{k:"note",label:"ملاحظات",type:"textarea"}],
  onSubmit:function(v){return commit(function(lg){post(lg,{type:"LEND",amount:v.amount,partyId:v.partyId,
   occurredOn:v.occurredOn,opId:opId(),title:"إقراض "+party(v.partyId).name,note:v.note})},"تم تسجيل الإقراض")}})}
function fCollect(pid){var bal=partyBal(LG,pid,"RECEIVABLE");
 form({title:"تحصيل حق",sub:"المستحق "+F(bal)+" — النقد يرتفع والحق ينخفض وليس دخلاً",ok:"تحصيل",
  fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1,val:M.fmt(bal)},
   {k:"occurredOn",label:"التاريخ",type:"date",val:today(),required:true},{k:"note",label:"ملاحظة"}],
  onSubmit:function(v){if(v.amount>bal)return{errors:{amount:"يتجاوز الحق "+F(bal)}};
   return commit(function(lg){post(lg,{type:"COLLECT",amount:v.amount,partyId:pid,occurredOn:v.occurredOn,
    opId:opId(),title:"تحصيل من "+party(pid).name,note:v.note})},"تم التحصيل")}})}
function fWriteoff(pid){var bal=partyBal(LG,pid,"RECEIVABLE");
 form({title:"إعدام جزء من حق",sub:"خسارة مؤكدة تخفض صافي الثروة — تُصنّف حقاً معدوماً لا مصروفاً استهلاكياً",ok:"تسجيل",
  fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1},
   {k:"occurredOn",label:"التاريخ",type:"date",val:today(),required:true},
   {k:"reason",label:"السبب (إلزامي)",type:"textarea",required:true}],
  onSubmit:function(v){if(v.amount>bal)return{errors:{amount:"يتجاوز الحق "+F(bal)}};
   return commit(function(lg){post(lg,{type:"WRITEOFF",amount:v.amount,partyId:pid,occurredOn:v.occurredOn,
    opId:opId(),title:"إعدام حق: "+party(pid).name,reason:v.reason})},"تم تسجيل الخسارة")}})}
function fGoal(){form({title:"هدف ادخار جديد",ok:"إنشاء",
 fields:[{k:"name",label:"اسم الهدف",required:true,ph:"هاتف جديد"},
  {k:"icon",label:"أيقونة",type:"pick",val:"🎯",opts:[["🎯","🎯 هدف"],["📱","📱 هاتف"],["💻","💻 حاسوب"],
   ["🛡","🛡 طوارئ"],["✈","✈ سفر"],["🏠","🏠 منزل"],["🚗","🚗 سيارة"],["🎓","🎓 تعليم"]]},
  {k:"target",label:"المبلغ المستهدف (دج)",type:"money",min:1,required:true},
  {k:"startOn",label:"تاريخ البداية",type:"date",val:today(),required:true},
  {k:"dueOn",label:"الموعد المستهدف",type:"date",val:D.addM(D.mkey(today()),6)+"-01"},
  {k:"note",label:"ملاحظة",type:"textarea"}],
 onSubmit:function(v){return commit(function(lg){lg.goals.push({id:uid("gl"),name:v.name,icon:v.icon,target:v.target,
  startOn:v.startOn,dueOn:v.dueOn||null,note:v.note,status:"ACTIVE"})},"تم إنشاء الهدف")}})}
function fAlloc(gid){var g=goal(gid),free=Math.max(0,positions(LG).available);
 form({title:"مساهمة في "+g.name,sub:"المتاح غير المخصص "+F(free)+" — المساهمة تخصيص لا حركة نقدية",ok:"تخصيص",
  fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1},
   {k:"occurredOn",label:"التاريخ",type:"date",val:today(),required:true},
   {k:"allowUnfunded",label:"تخصيص غير ممول",type:"toggle",val:false,hint:"يسمح بتجاوز المتاح ويُعرض صراحة كغير ممول"},
   {k:"note",label:"ملاحظة",val:"مساهمة"}],
  onSubmit:function(v){return commit(function(lg){allocate(lg,{goalId:gid,amount:v.amount,occurredOn:v.occurredOn,
   opId:opId(),note:v.note,allowUnfunded:v.allowUnfunded})},"تم تخصيص "+F(v.amount))}})}
function fRelease(gid){var b=goalBal(LG,gid);
 form({title:"تحرير من الهدف",sub:"الرصيد "+F(b)+" — يعود المتاح للإنفاق والنقد لا يتغير",ok:"تحرير",
  fields:[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1},
   {k:"occurredOn",label:"التاريخ",type:"date",val:today(),required:true},
   {k:"reason",label:"السبب",type:"textarea",val:"تعديل خطة"}],
  onSubmit:function(v){if(v.amount>b)return{errors:{amount:"يتجاوز رصيد الهدف"}};
   return commit(function(lg){release(lg,{goalId:gid,amount:v.amount,occurredOn:v.occurredOn,opId:opId(),reason:v.reason})},"تم التحرير")}})}
function fGoalBuy(gid){var b=goalBal(LG,gid);
 form({title:"شراء من الهدف",sub:"رصيد الهدف "+F(b)+" — مصروف واحد والنقد ينخفض مرة واحدة",ok:"تسجيل الشراء",
  fields:[{k:"amount",label:"ثمن الشراء (دج)",type:"money",required:true,min:1},
   {k:"categoryId",label:"التصنيف",type:"pick",val:"other",opts:catOpts()},
   {k:"occurredOn",label:"التاريخ",type:"date",val:today(),required:true},
   {k:"title",label:"ماذا اشتريت؟",required:true,ph:"هاتف سامسونغ"},{k:"note",label:"ملاحظة",type:"textarea"}],
  onSubmit:function(v){return commit(function(lg){goalPurchase(lg,{goalId:gid,amount:v.amount,categoryId:v.categoryId,
   occurredOn:v.occurredOn,opId:opId(),title:v.title,note:v.note})},"تم الشراء — حُرّر "+F(Math.min(v.amount,b))+" من الهدف")}})}
function fBudget(id){var b=id?LG.budgets.filter(function(x){return x.id===id})[0]:null;
 form({title:b?"تعديل ميزانية":"ميزانية جديدة",sub:"حد تخطيطي — لا يخصم نقداً ولا ينشئ ديناً",ok:"حفظ",
  fields:[{k:"categoryId",label:"التصنيف",type:"pick",val:b?b.categoryId:"food",opts:catOpts()},
   {k:"amount",label:"الحد الشهري (دج)",type:"money",required:true,min:1,val:b?M.fmt(b.amount):""},
   {k:"name",label:"الاسم",val:b?b.name:"",ph:"يُشتق من التصنيف إن تُرك"}],
  onSubmit:function(v){return commit(function(lg){
   if(b){var t=lg.budgets.filter(function(x){return x.id===id})[0];t.amount=v.amount;t.categoryId=v.categoryId;t.name=v.name||cat(v.categoryId)[1]}
   else{var r=D.mrange(D.mkey(today()));
    lg.budgets.push({id:uid("bd"),name:v.name||cat(v.categoryId)[1],categoryId:v.categoryId,amount:v.amount,
     periodStart:r.start,periodEnd:r.end})}},b?"تم تعديل الحد":"تم إنشاء الميزانية")}})}
function fCommit(id){var c=id?LG.commitments.filter(function(x){return x.id===id})[0]:null;
 form({title:c?"تعديل التزام":"التزام متكرر",sub:"التغيير يسري على الاستحقاقات القادمة — السابقة محفوظة",ok:"حفظ",
  fields:[{k:"name",label:"الاسم",required:true,val:c?c.name:"",ph:"إيجار الشقة"},
   {k:"amount",label:"المبلغ المتوقع (دج)",type:"money",required:true,min:1,val:c?M.fmt(c.amount):""},
   {k:"anchorDay",label:"يوم الاستحقاق شهرياً",type:"number",val:c?c.anchorDay:5,required:true,
    hint:"إن لم يوجد اليوم في شهر قصير يُستخدم آخر يوم فيه"},
   {k:"categoryId",label:"التصنيف",type:"pick",val:c?c.categoryId:"home",opts:catOpts()},
   {k:"startOn",label:"تاريخ البداية",type:"date",val:c?c.startOn:today(),required:true},
   {k:"graceDays",label:"فترة السماح (أيام)",type:"number",val:c?c.graceDays:3},
   {k:"payeeId",label:"المستفيد",type:"select",val:c?c.payeeId||"":"",opts:[["","— بدون —"]].concat(partyOpts())}],
  onSubmit:function(v){var day=Math.min(31,Math.max(1,Math.round(v.anchorDay)));
   return commit(function(lg){
    if(c){var t=lg.commitments.filter(function(x){return x.id===id})[0];
     t.name=v.name;t.amount=v.amount;t.anchorDay=day;t.categoryId=v.categoryId;t.graceDays=v.graceDays;t.payeeId=v.payeeId||null;
     lg.occurrences.forEach(function(o){if(o.commitmentId===id&&o.paid===0&&o.dueOn>=today())o.amount=v.amount})}
    else lg.commitments.push({id:uid("cm"),name:v.name,amount:v.amount,anchorDay:day,startOn:v.startOn,endOn:null,
     categoryId:v.categoryId,payeeId:v.payeeId||null,graceDays:v.graceDays,status:"ACTIVE"});
    materialize(lg,45)},c?"تم التعديل":"تم إنشاء الالتزام")}})}
function fOccPay(oid){var o=LG.occurrences.filter(function(x){return x.id===oid})[0];
 var c=LG.commitments.filter(function(x){return x.id===o.commitmentId})[0]||{};
 var left=o.amount-o.paid;
 form({title:"دفع "+(c.name||"التزام"),sub:"المتبقي "+F(left)+" — يُسجّل مصروف بتاريخ الدفع والاستحقاق يحتفظ بتاريخه",ok:"تسجيل الدفع",
  fields:[{k:"amount",label:"المبلغ المدفوع (دج)",type:"money",required:true,min:1,val:M.fmt(left)},
   {k:"occurredOn",label:"تاريخ الدفع الفعلي",type:"date",val:today(),required:true},{k:"note",label:"ملاحظة",type:"textarea"}],
  onSubmit:function(v){if(v.amount>left)return{errors:{amount:"يتجاوز المتبقي "+F(left)}};
   return commit(function(lg){post(lg,{type:"EXPENSE",amount:v.amount,categoryId:c.categoryId||"other",
    occurredOn:v.occurredOn,opId:opId(),title:(c.name||"التزام")+" — "+D.mLabel(o.periodKey),
    partyId:c.payeeId||null,occurrenceId:oid,note:v.note})},
    v.amount>=left?"تم الدفع بالكامل":"دفع جزئي — يتبقى "+F(left-v.amount))}})}
function fItem(){form({title:"مادة جديدة",ok:"حفظ",
 fields:[{k:"name",label:"الاسم بالعربية",required:true,ph:"طماطم"},{k:"nameFr",label:"الاسم بالفرنسية",ph:"Tomate"},
  {k:"categoryId",label:"التصنيف",type:"pick",val:"veg",opts:catOpts()},
  {k:"unit",label:"وحدة القياس",type:"pick",val:"كغ",opts:[["كغ","كغ"],["غ","غ"],["لتر","لتر"],["مل","مل"],
   ["حبة","حبة"],["علبة","علبة"],["كيس","كيس"],["ربطة","ربطة"]]},
  {k:"brand",label:"العلامة التجارية"},{k:"note",label:"ملاحظات",type:"textarea"}],
 onSubmit:function(v){return commit(function(lg){lg.items.push({id:uid("it"),name:v.name,nameFr:v.nameFr,
  categoryId:v.categoryId,unit:v.unit,brand:v.brand,note:v.note,status:"ACTIVE"})},"تمت إضافة المادة")}})}
function fPrice(iid){var it=LG.items.filter(function(x){return x.id===iid})[0];
 form({title:"سعر جديد — "+it.name,sub:"يُضاف إلى السجل ولا يستبدل السابق",ok:"تسجيل",
  fields:[{k:"amount",label:"السعر (دج) لكل "+it.unit,type:"money",required:true,min:1},
   {k:"store",label:"المتجر",required:true,ph:"سوق المدينة"},
   {k:"on",label:"التاريخ",type:"date",val:today(),required:true},
   {k:"source",label:"المصدر",type:"pick",val:"شراء فعلي",opts:[["شراء فعلي","شراء فعلي"],["مشاهدة","مشاهدة"],["إعلان","إعلان موثّق"]]}],
  onSubmit:function(v){return commit(function(lg){lg.prices.push({id:uid("pr"),itemId:iid,store:v.store,
   amount:v.amount,unit:it.unit,on:v.on,source:v.source})},"تم تسجيل السعر")}})}
function fInvoice(){ui.inv=[];
 if(!LG.items.length){toast("أضف مادة إلى الدليل أولاً","err");fItem();return}
 function draw(){var tot=M.sum(ui.inv.map(function(l){return l.total})),el=$("invBox");if(!el)return;
  el.innerHTML=(ui.inv.length?ui.inv.map(function(l,i){return '<div class="invline"><div><b>'+esc(l.name)+'</b>'+
   '<small>'+M.fmtQty(l.qty)+" "+esc(l.unit)+" × "+N(l.price)+'</small></div><b style="font-family:var(--num)">'+N(l.total)+
   '</b><button class="rm" data-rm="'+i+'">×</button></div>'}).join(""):'<div class="empty" style="padding:18px">لم تضف عناصر بعد</div>')+
   '<div class="tot"><span>الإجمالي · '+ui.inv.length+' عنصر</span><b>'+N(tot)+'</b></div>';
  Array.prototype.forEach.call(el.querySelectorAll("[data-rm]"),function(b){
   b.onclick=function(){ui.inv.splice(+b.dataset.rm,1);draw()}})}
 modal("فاتورة تفصيلية","تنتج مصروفاً واحداً فقط مرتبطاً بها",
  '<div class="fld"><label>المتجر</label><input id="ivStore" value="سوق المدينة"></div>'+
  '<div class="fld"><label>التاريخ</label><input id="ivDate" type="date" value="'+today()+'"></div>'+
  '<div class="fld"><label>المادة</label><select id="ivItem">'+LG.items.map(function(i){
   return'<option value="'+i.id+'">'+esc(i.name+" ("+i.unit+")")+'</option>'}).join("")+'</select></div>'+
  '<div class="f2"><div class="fld"><label>الكمية</label><input id="ivQty" value="1" inputmode="decimal"></div>'+
  '<div class="fld"><label>سعر الوحدة (دج)</label><input id="ivPrice" inputmode="decimal" placeholder="0"></div></div>'+
  '<button class="btn w" id="ivAdd">＋ إضافة عنصر</button><div id="invBox" style="margin-top:14px"></div>',
  '<button class="btn" data-act="closeAll">إلغاء</button><button class="btn p" id="ivSave">تأكيد الفاتورة</button>');
 draw();
 function sync(){var it=LG.items.filter(function(x){return x.id===$("ivItem").value})[0];if(!it)return;
  var ps=LG.prices.filter(function(p){return p.itemId===it.id}).sort(function(a,b){return a.on<b.on?1:-1});
  if(ps[0])$("ivPrice").value=M.fmt(ps[0].amount)}
 $("ivItem").onchange=sync;sync();
 $("ivAdd").onclick=function(){var it=LG.items.filter(function(x){return x.id===$("ivItem").value})[0];
  if(!it){toast("اختر مادة","err");return}
  var q,p;try{q=M.qty($("ivQty").value);p=M.cents($("ivPrice").value||"0")}catch(e){toast(e.message,"err");return}
  if(q<=0){toast("الكمية يجب أن تكون موجبة","err");return}
  ui.inv.push({itemId:it.id,name:it.name,unit:it.unit,qty:q,price:p,total:M.line(q,p),categoryId:it.categoryId});
  $("ivQty").value="1";draw()};
 $("ivSave").onclick=function(){
  if(!ui.inv.length){toast("أضف عنصراً واحداً على الأقل","err");return}
  var on=$("ivDate").value,store=$("ivStore").value.trim();
  if(!D.valid(on)){toast("تاريخ غير صالح","err");return}
  var lines=ui.inv.slice(),total=M.sum(lines.map(function(l){return l.total}));
  closeAll();
  commit(function(lg){var ivId=uid("iv");
   var r=post(lg,{type:"EXPENSE",amount:total,categoryId:lines[0].categoryId,occurredOn:on,opId:opId(),
    title:"فاتورة "+(store||"مشتريات"),invoiceId:ivId,note:lines.length+" عناصر"});
   lg.invoices.push({id:ivId,txId:r.txId,store:store,on:on,detailed:true,lines:lines,total:total});
   lines.forEach(function(l){lg.prices.push({id:uid("pr"),itemId:l.itemId,store:store,amount:l.price,
    unit:l.unit,on:on,source:"فاتورة"})})},"تم تسجيل الفاتورة "+F(total))}}
function fTxEdit(id){var t=LG.transactions.filter(function(x){return x.id===id})[0];
 var fields=[{k:"amount",label:"المبلغ (دج)",type:"money",required:true,min:1,val:M.fmt(t.amount)},
  {k:"occurredOn",label:"تاريخ الوقوع",type:"date",val:t.occurredOn,required:true},
  {k:"title",label:"الوصف",val:t.title},
  {k:"reason",label:"سبب التصحيح (إلزامي)",type:"textarea",required:true,ph:"خطأ في المبلغ"}];
 if(t.type==="EXPENSE")fields.push({k:"categoryId",label:"التصنيف",type:"pick",val:t.categoryId,opts:catOpts()});
 form({title:"تعديل الحركة",sub:"يُنشأ قيد عكس ثم قيد جديد — الأثر القديم محفوظ",ok:"ترحيل التصحيح",fields:fields,
  onSubmit:function(v){return commit(function(lg){correct(lg,id,{type:t.type,amount:v.amount,occurredOn:v.occurredOn,
   title:v.title,categoryId:v.categoryId||t.categoryId,sourceId:t.sourceId,partyId:t.partyId,
   originalTxId:t.originalTxId,goalId:t.goalId,note:t.note},{reason:v.reason,opId:opId()})},"تم التصحيح مع حفظ الأثر")}})}
function fReverse(ids){var arr=Array.isArray(ids)?ids:[ids];
 form({title:arr.length>1?"عكس "+arr.length+" حركة":"عكس الحركة",sub:"لا حذف نهائي — قيد مرآة موثّق والأصل محفوظ",ok:"عكس",
  fields:[{k:"reason",label:"السبب (إلزامي)",type:"textarea",required:true,ph:"إدخال مكرر"},
   {k:"occurredOn",label:"تاريخ العكس",type:"date",val:today(),required:true}],
  onSubmit:function(v){return commit(function(lg){arr.forEach(function(id){
   var t=lg.transactions.filter(function(x){return x.id===id})[0];
   if(t&&t.status==="POSTED"&&t.type!=="REVERSAL")reverse(lg,id,{reason:v.reason,occurredOn:v.occurredOn,opId:opId()})});
   ui.sel={};ui.selN=0;ui.bulk=false},"تم عكس "+arr.length+" حركة",true)}})}
function fCustomRange(){var p=period();
 form({title:"فترة مخصصة",ok:"تطبيق",fields:[{k:"start",label:"من",type:"date",val:p.start,required:true},
  {k:"end",label:"إلى",type:"date",val:p.end,required:true}],
  onSubmit:function(v){if(v.start>v.end)return{errors:{end:"يجب أن يكون بعد البداية"}};
   ui.custom={start:v.start,end:v.end};ui.period=null;render();return true}})}
/* ══════════════ التصدير والاستعادة ══════════════ */
function download(name,text,mime){var b=new Blob([text],{type:mime||"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");
 a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1500)}
function exportJson(){download("mizanati-backup-"+today()+".json",JSON.stringify({schemaVersion:4,appVersion:"4.0",
 exportedAt:D.now(),currency:"DZD",scale:2,data:LG},null,1));toast("تم تصدير النسخة","ok")}
function csvCell(v){var s=String(v==null?"":v);var NL=String.fromCharCode(10);if(s.indexOf(",")<0&&s.indexOf('"')<0&&s.indexOf(NL)<0)return s;return '"'+s.split('"').join('""')+'"'}
function exportCsv(kind){var rows;
 if(kind==="lines"){rows=[["id","entryId","txId","account","sub","side","amount_centimes","occurredOn"]];
  LG.lines.forEach(function(l){rows.push([l.id,l.entryId,l.txId,l.account,l.sub||"",l.side,l.amount,l.occurredOn])})}
 else if(kind==="prices"){var map={};LG.items.forEach(function(i){map[i.id]=i.name});
  rows=[["item","store","amount_centimes","unit","date","source"]];
  LG.prices.forEach(function(p){rows.push([map[p.itemId]||p.itemId,p.store,p.amount,p.unit,p.on,p.source])})}
 else{rows=[["id","type","title","amount_centimes","occurredOn","createdAt","category","source","party","status","note"]];
  LG.transactions.forEach(function(t){var p=party(t.partyId);
   rows.push([t.id,t.type,t.title,t.amount,t.occurredOn,t.createdAt,t.categoryId?cat(t.categoryId)[1]:"",
    t.sourceId?src(t.sourceId)[1]:"",p?p.name:"",t.status,t.note])})}
 download("mizanati-"+kind+"-"+today()+".csv","\uFEFF"+rows.map(function(r){return r.map(csvCell).join(",")}).join(String.fromCharCode(10)),"text/csv;charset=utf-8");
 toast("تم تصدير CSV","ok")}
function validateBackup(o){var errs=[];
 if(!o||typeof o!=="object"){errs.push("الملف ليس كائن JSON");return{ok:false,errs:errs}}
 if(o.schemaVersion!==4)errs.push("إصدار المخطط غير مدعوم: "+o.schemaVersion);
 var d=o.data;
 if(!d||typeof d!=="object"){errs.push("لا توجد بيانات");return{ok:false,errs:errs}}
 ["transactions","entries","lines"].forEach(function(k){if(!Array.isArray(d[k]))errs.push("مخزن مفقود: "+k)});
 if(errs.length)return{ok:false,errs:errs};
 var ids={};d.transactions.forEach(function(t){if(ids[t.id])errs.push("معرّف مكرر: "+t.id);ids[t.id]=1;
  if(!D.valid(t.occurredOn))errs.push("تاريخ غير صالح: "+t.id);
  if(!M.is(t.amount))errs.push("مبلغ غير صحيح: "+t.id)});
 var eids={};d.entries.forEach(function(e){eids[e.id]=1});
 var byE={},dr=0,cr=0;
 d.lines.forEach(function(l){if(!eids[l.entryId])errs.push("سطر يتيم: "+l.id);
  if(!M.is(l.amount)||l.amount<=0)errs.push("مبلغ سطر غير صالح");
  if(!ACC[l.account])errs.push("حساب غير معروف: "+l.account);
  (byE[l.entryId]=byE[l.entryId]||[]).push(l);
  if(l.side===DB)dr+=l.amount;else cr+=l.amount});
 Object.keys(byE).forEach(function(k){try{balanced(byE[k])}catch(e){errs.push("قيد غير متوازن: "+e.message)}});
 if(dr!==cr)errs.push("ميزان المراجعة غير متوازن");
 return{ok:!errs.length,errs:errs,debit:dr,credit:cr}}
function restoreFile(file){
 file.text().then(function(txt){
  var obj;try{obj=JSON.parse(txt)}catch(e){toast("الملف ليس JSON صالحاً","err");return}
  var v=validateBackup(obj);
  if(!v.ok){modal("نسخة مرفوضة","لم تُمسّ بياناتك الحالية",
   '<div class="alert bad"><span class="ai">✕</span><div><b>فشل التحقق</b><small>لن تُستبدل بياناتك بملف تالف.</small></div></div>'+
   v.errs.slice(0,20).map(function(e){return'<div class="check f"><span class="cm">✕</span><span class="cn">'+esc(e)+'</span></div>'}).join(""),
   '<button class="btn w" data-act="closeAll">إغلاق</button>');return}
  var tmp=obj.data,pos=positions(tmp);
  modal("معاينة الاستعادة","تحقّق كامل قبل الاستبدال",
   '<div class="alert ok"><span class="ai">✓</span><div><b>الملف سليم ومتوازن</b><small>مدين '+N(v.debit)+' = دائن '+N(v.credit)+'</small></div></div>'+
   '<div class="kv"><span>الحركات</span><b>'+tmp.transactions.length+'</b></div>'+
   '<div class="kv"><span>سطور القيود</span><b>'+tmp.lines.length+'</b></div>'+
   '<div class="kv"><span>الأهداف</span><b>'+(tmp.goals||[]).length+'</b></div>'+
   '<div class="kv"><span>النقد المعاد بناؤه</span><b class="pos">'+N(pos.cash)+' دج</b></div>'+
   '<div class="kv"><span>صافي الثروة</span><b>'+N(pos.netWorth)+' دج</b></div>'+
   '<div class="alert warn" style="margin-top:13px"><span class="ai">⚠</span><div><b>سيُستبدل دفترك الحالي</b><small>ستُصدَّر نسخة منه تلقائياً أولاً.</small></div></div>',
   '<button class="btn" data-act="closeAll">إلغاء</button><button class="btn p" id="doRestore">استعادة الآن</button>');
  $("doRestore").onclick=function(){closeAll();exportJson();
   var backup=clone(LG);LG=tmp;
   dbSet(LG).then(function(){var chk=integrity(LG);
    if(!chk.ok){LG=backup;return dbSet(LG).then(function(){render();toast("فشل التحقق بعد الاستعادة — تم التراجع","err")})}
    render();toast("تمت الاستعادة بنجاح","ok")},
    function(){LG=backup;render();toast("فشلت الاستعادة — بياناتك كما هي","err")})}},
  function(){toast("تعذّرت قراءة الملف","err")})}
/* ══════════════ فحوص القبول ══════════════ */
function runChecks(){var out=$("checksOut");if(!out)return;
 out.innerHTML='<div class="boot" style="padding:20px"><div class="spinner"></div></div>';
 var R=[];
 function t(n,fn){try{fn();R.push({n:n,p:true})}catch(e){R.push({n:n,p:false,e:e.message})}}
 function eq(a,b,m){if(a!==b)throw new Error((m||"")+" المتوقع "+b+" والفعلي "+a)}
 function C(n){return M.cents(n)}
 function thr(fn,code){var x=null;try{fn()}catch(e){x=e}
  if(!x)throw new Error("لم يُرفض كما يجب");if(x.code!==code)throw new Error("رمز خاطئ: "+x.code)}
 setTimeout(function(){
  t("1 · دفتر فارغ: الرصيد صفر",function(){var g=newLedger();eq(positions(g).cash,0);eq(positions(g).netWorth,0)});
  t("2 · دخل 50,000 − مصروف 10,000 = 40,000",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"salary",occurredOn:"2026-01-01",opId:"c1"});
   post(g,{type:"EXPENSE",amount:C(10000),categoryId:"food",occurredOn:"2026-01-02",opId:"c2"});
   eq(positions(g).cash,C(40000))});
  t("3 · تخصيص 2,000 لا يغيّر النقد",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"c3"});
   g.goals.push({id:"G",name:"t",target:C(9000),startOn:"2026-01-01",status:"ACTIVE"});
   allocate(g,{goalId:"G",amount:C(2000),occurredOn:"2026-01-02",opId:"c4"});
   eq(positions(g).cash,C(50000));eq(positions(g).available,C(48000))});
  t("4 · تحرير 500 لا يغيّر النقد",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"c5"});
   g.goals.push({id:"G",name:"t",target:0,startOn:"2026-01-01",status:"ACTIVE"});
   allocate(g,{goalId:"G",amount:C(2000),occurredOn:"2026-01-02",opId:"c6"});
   release(g,{goalId:"G",amount:C(500),occurredOn:"2026-01-03",opId:"c7"});
   eq(positions(g).cash,C(50000));eq(goalBal(g,"G"),C(1500))});
  t("5 · قرض 10,000: صافي الثروة ثابت",function(){var g=newLedger();
   post(g,{type:"BORROW",amount:C(10000),partyId:"p",occurredOn:"2026-01-01",opId:"c8"});
   eq(positions(g).cash,C(10000));eq(positions(g).debts,C(10000));eq(positions(g).netWorth,0);eq(positions(g).income,0)});
  t("6 · تسديد أصل 2,000 ليس مصروفاً",function(){var g=newLedger();
   post(g,{type:"BORROW",amount:C(10000),partyId:"p",occurredOn:"2026-01-01",opId:"c9"});
   post(g,{type:"DEBT_PAY",amount:C(2000),principal:C(2000),fees:0,partyId:"p",occurredOn:"2026-01-02",opId:"c10"});
   eq(positions(g).cash,C(8000));eq(positions(g).debts,C(8000));eq(positions(g).expense,0)});
  t("6ب · دفعة 3,000 = 2,500 أصل + 500 رسوم",function(){var g=newLedger();
   post(g,{type:"BORROW",amount:C(10000),partyId:"p",occurredOn:"2026-01-01",opId:"c11"});
   post(g,{type:"DEBT_PAY",amount:C(3000),principal:C(2500),fees:C(500),partyId:"p",occurredOn:"2026-01-02",opId:"c12"});
   eq(positions(g).cash,C(7000));eq(positions(g).debts,C(7500));eq(positions(g).expense,C(500))});
  t("7 · إقراض 3,000 يرفع الحقوق",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"c13"});
   post(g,{type:"LEND",amount:C(3000),partyId:"p",occurredOn:"2026-01-02",opId:"c14"});
   eq(positions(g).cash,C(47000));eq(positions(g).receivables,C(3000));eq(positions(g).netWorth,C(50000))});
  t("8 · تحصيل 1,000 ليس دخلاً",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"c15"});
   post(g,{type:"LEND",amount:C(3000),partyId:"p",occurredOn:"2026-01-02",opId:"c16"});
   post(g,{type:"COLLECT",amount:C(1000),partyId:"p",occurredOn:"2026-01-03",opId:"c17"});
   eq(positions(g).cash,C(48000));eq(positions(g).receivables,C(2000));eq(positions(g).income,C(50000))});
  t("9 · شراء من هدف: خصم مرة واحدة",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"c18"});
   g.goals.push({id:"G",name:"t",target:C(30000),startOn:"2026-01-01",status:"ACTIVE"});
   allocate(g,{goalId:"G",amount:C(30000),occurredOn:"2026-01-02",opId:"c19"});
   goalPurchase(g,{goalId:"G",amount:C(30000),categoryId:"other",occurredOn:"2026-01-03",opId:"c20",title:"شراء"});
   eq(positions(g).cash,C(20000));eq(positions(g).expense,C(30000));eq(goalBal(g,"G"),0);
   eq(g.transactions.filter(function(x){return x.type==="EXPENSE"}).length,1)});
  t("10 · استرجاع 500 من 1,000 → الصافي 500",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"c21"});
   var r=post(g,{type:"EXPENSE",amount:C(1000),categoryId:"food",occurredOn:"2026-01-02",opId:"c22"});
   post(g,{type:"REFUND",amount:C(500),categoryId:"food",originalTxId:r.txId,occurredOn:"2026-01-03",opId:"c23"});
   eq(positions(g).expense,C(500));eq(positions(g).income,C(50000))});
  t("10ب · الاسترجاع فوق المتبقي مرفوض",function(){var g=newLedger();
   var r=post(g,{type:"EXPENSE",amount:C(1000),categoryId:"food",occurredOn:"2026-01-02",opId:"c24"});
   thr(function(){post(g,{type:"REFUND",amount:C(1500),categoryId:"food",originalTxId:r.txId,occurredOn:"2026-01-03",opId:"c25"})},"REFUND_EXCEEDS")});
  t("16 · يوم 31 بلا انزلاق",function(){eq(D.monthly("2026-02",31),"2026-02-28");
   eq(D.monthly("2026-03",31),"2026-03-31");eq(D.monthly("2024-02",31),"2024-02-29");eq(D.monthly("2026-04",31),"2026-04-30")});
  t("25 · السنة الكبيسة",function(){eq(D.dim(2024,2),29);eq(D.dim(2026,2),28);eq(D.dim(1900,2),28);
   eq(D.dim(2000,2),29);eq(D.diff("2024-02-28","2024-03-01"),2)});
  t("22 · حركة قديمة في فترة وقوعها",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"s",occurredOn:"2026-03-01",opId:"c26"});
   post(g,{type:"EXPENSE",amount:C(7000),categoryId:"f",occurredOn:"2026-01-15",opId:"c27"});
   eq(positions(g,"2026-01-31").cash,C(-7000));eq(positions(g,"2026-03-31").cash,C(43000))});
  t("24 · فلاتر الشهر والسنة",function(){eq(D.period("lastMonth","2026-01-05").start,"2025-12-01");
   eq(D.mrange("2026-02").end,"2026-02-28");eq(D.addM("2026-12",1),"2027-01")});
  t("26 · تكرار العملية مرفوض",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(1000),sourceId:"s",occurredOn:"2026-01-01",opId:"dup"});
   thr(function(){post(g,{type:"INCOME",amount:C(1000),sourceId:"s",occurredOn:"2026-01-01",opId:"dup"})},"DUP_OP");
   eq(g.transactions.length,1)});
  t("27 · فشل التحقق لا يترك نصف عملية",function(){var g=newLedger();
   var n=g.lines.length,a=g.audit.length;
   thr(function(){post(g,{type:"DEBT_PAY",amount:C(3000),principal:C(2000),fees:C(500),partyId:"p",occurredOn:"2026-01-01",opId:"c28"})},"SPLIT");
   eq(g.lines.length,n);eq(g.audit.length,a)});
  t("28 · عكس الحركة مرتين ممنوع",function(){var g=newLedger();
   var r=post(g,{type:"EXPENSE",amount:C(1000),categoryId:"f",occurredOn:"2026-01-01",opId:"c29"});
   reverse(g,r.txId,{reason:"خطأ",opId:"c30"});eq(positions(g).cash,0);
   thr(function(){reverse(g,r.txId,{reason:"ثانٍ",opId:"c31"})},"ALREADY")});
  t("32 · إعادة البناء تطابق المعروض",function(){var g=newLedger();
   post(g,{type:"INCOME",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"c32"});
   post(g,{type:"EXPENSE",amount:C(12345),categoryId:"f",occurredOn:"2026-01-02",opId:"c33"});
   post(g,{type:"BORROW",amount:C(10000),partyId:"p",occurredOn:"2026-01-03",opId:"c34"});
   post(g,{type:"ADJUST",amount:C(150),occurredOn:"2026-01-04",opId:"c35",reason:"جرد"});
   var p=positions(g),s=rebuild(g);eq(p.cash,s.nat.CASH);eq(s.debit,s.credit);eq(integrity(g).ok,true)});
  t("38 · مجموع الأسطر = الإجمالي",function(){var q=M.qty("1"),a=M.line(q,C("10.40")),b=M.line(q,C("10.40"));
   eq(M.fmt(a),"10.40");eq(M.fmt(M.sum([a,b])),"20.80")});
  t("مال · لا تقريب صامت",function(){thr(function(){M.cents("10.455")},"SUB_CENT");
   eq(M.parse("10.455",{allowRounding:true}).cents,1046)});
  t("التزام · لا استحقاق مكرر",function(){var g=newLedger();
   g.commitments.push({id:"C",name:"إيجار",amount:C(25000),anchorDay:5,startOn:"2026-01-01",endOn:null,
    categoryId:"home",graceDays:3,status:"ACTIVE"});
   materialize(g,45);var n=g.occurrences.length;materialize(g,45);
   eq(g.occurrences.length,n);eq(integrity(g).ok,true)});
  t("التزام · دفع جزئي يبقي الباقي",function(){var g=newLedger();
   g.commitments.push({id:"C",name:"إيجار",amount:C(25000),anchorDay:5,startOn:"2026-01-01",endOn:null,
    categoryId:"home",graceDays:3,status:"ACTIVE"});
   materialize(g,45);var o=g.occurrences[0];
   post(g,{type:"EXPENSE",amount:C(20000),categoryId:"home",occurredOn:D.today(),opId:"c36",occurrenceId:o.id});
   eq(o.status,"PARTIAL");eq(o.amount-o.paid,C(5000))});
  t("سلامة دفترك الحالي",function(){var c=integrity(LG);
   if(!c.ok)throw new Error(c.problems.slice(0,3).join(" · "))});
  var pass=R.filter(function(r){return r.p}).length;
  out.innerHTML='<div class="alert '+(pass===R.length?"ok":"bad")+'"><span class="ai">'+(pass===R.length?"✓":"✕")+
   '</span><div><b>'+pass+" / "+R.length+' اختبار ناجح</b><small>نُفّذت الآن في متصفحك</small></div></div>'+
   R.map(function(r){return'<div class="check '+(r.p?"p":"f")+'"><span class="cm">'+(r.p?"✓":"✕")+'</span><span class="cn">'+esc(r.n)+
    (r.p?"":'<br><small style="color:var(--coral2)">'+esc(r.e)+'</small>')+'</span></div>'}).join("")},40)}
/* ══════════════ الإجراءات ══════════════ */
var ACT={
 goto:function(d){closeAll();route=d.to||"home";sub=d.sub||"";ui.sel={};ui.selN=0;ui.bulk=false;window.scrollTo(0,0);render()},
 theme:function(){LG.settings.theme=LG.settings.theme==="light"?"dark":"light";
  document.body.classList.toggle("light",LG.settings.theme==="light");
  $("themeIco").textContent=LG.settings.theme==="light"?"☀":"◐";
  var mc=document.querySelector('meta[name=theme-color]');if(mc)mc.content=LG.settings.theme==="light"?"#F4F6F8":"#0D1420";
  dbSet(LG);render()},
 closeAll:closeAll,
 addsheet:function(){var a=[["income","💵","دخل","var(--em2)"],["expense","💸","مصروف","var(--coral)"],
  ["invoice","🧾","فاتورة","var(--amber)"],["allocQuick","🎯","ادخار","var(--gold)"],
  ["occQuick","🗓","دفع التزام","var(--violet)"],["borrow","🤝","دين","var(--teal)"],
  ["lend","🫱","حق مالي","var(--blue)"],["adjust","⚖","تسوية","var(--mute)"]];
  sheet('<h3>إضافة عملية</h3><div class="sub">كل إجراء نموذج حقيقي بتحقق كامل قبل الحفظ</div>'+
   '<div class="acts">'+a.map(function(x){return'<button data-act="'+x[0]+'" style="--c:'+x[3]+'"><span class="ai">'+x[1]+'</span><small>'+x[2]+'</small></button>'}).join("")+'</div>')},
 income:function(){closeAll();fIncome()},
 expense:function(){closeAll();fExpense()},
 invoice:function(){closeAll();fInvoice()},
 adjust:function(){closeAll();fAdjust()},
 borrow:function(){closeAll();fBorrow()},
 lend:function(){closeAll();fLend()},
 partyNew:function(){fParty()},
 allocQuick:function(){closeAll();var gs=LG.goals.filter(function(g){return g.status==="ACTIVE"});
  if(!gs.length){fGoal();return}
  if(gs.length===1){fAlloc(gs[0].id);return}
  sheet('<h3>اختر الهدف</h3><div class="sub">المساهمة تخصيص داخل نقدك</div><div class="rows">'+
   gs.map(function(g){return'<button class="row" data-act="alloc" data-id="'+g.id+'"><div class="ico">'+(g.icon||"🎯")+
    '</div><div class="mid"><b>'+esc(g.name)+'</b><small>الرصيد '+N(goalBal(LG,g.id))+' دج</small></div></button>'}).join("")+'</div>')},
 alloc:function(d){closeAll();fAlloc(d.id)},
 release:function(d){closeAll();fRelease(d.id)},
 goalBuy:function(d){closeAll();fGoalBuy(d.id)},
 goalNew:function(){fGoal()},
 goalDetail:function(d){goalDetail(d.id)},
 goalToggle:function(d){commit(function(lg){var g=lg.goals.filter(function(x){return x.id===d.id})[0];
  g.status=g.status==="ACTIVE"?"PAUSED":"ACTIVE"},"تم تحديث حالة الهدف")},
 occQuick:function(){closeAll();materialize(LG,45);
  var os=LG.occurrences.filter(function(o){return["DUE","OVERDUE","PARTIAL"].indexOf(o.status)>=0});
  if(!os.length){toast("لا استحقاقات مفتوحة الآن","ok");return}
  sheet('<h3>دفع استحقاق</h3><div class="sub">اختر الالتزام</div><div class="rows">'+
   os.map(function(o){var c=LG.commitments.filter(function(x){return x.id===o.commitmentId})[0]||{};
    return'<button class="row" data-act="occPay" data-id="'+o.id+'"><div class="ico">'+cat(c.categoryId||"other")[2]+
     '</div><div class="mid"><b>'+esc(c.name||"التزام")+'</b><small>'+esc(o.dueOn)+' · متبقٍ '+N(o.amount-o.paid)+'</small></div></button>'}).join("")+'</div>')},
 occPay:function(d){closeAll();fOccPay(d.id)},
 occDetail:function(d){occDetail(d.id)},
 occSkip:function(d){closeAll();commit(function(lg){var o=lg.occurrences.filter(function(x){return x.id===d.id})[0];
  o.status="SKIPPED";lg.audit.push({id:uid("au"),at:D.now(),action:"SKIP",entity:"occurrence",entityId:d.id,
   opId:opId(),title:"تخطي استحقاق",reason:"بموافقة المستخدم"})},"تم التخطي",true)},
 cmNew:function(){fCommit()},
 cmEdit:function(d){fCommit(d.id)},
 cmToggle:function(d){commit(function(lg){var c=lg.commitments.filter(function(x){return x.id===d.id})[0];
  c.status=c.status==="ACTIVE"?"PAUSED":"ACTIVE";
  if(c.status!=="ACTIVE")lg.occurrences=lg.occurrences.filter(function(o){
   return o.commitmentId!==d.id||o.paid>0||o.dueOn<today()});
  materialize(lg,45)},"تم تحديث الالتزام")},
 budgetNew:function(){fBudget()},
 budgetEdit:function(d){fBudget(d.id)},
 budgetDel:function(d){commit(function(lg){lg.budgets=lg.budgets.filter(function(b){return b.id!==d.id})},"تم حذف الميزانية",true)},
 budgetDetail:function(d){budgetDetail(d.id)},
 debtPay:function(d){fDebtPay(d.id)},
 forgive:function(d){fForgive(d.id)},
 collect:function(d){fCollect(d.id)},
 writeoff:function(d){fWriteoff(d.id)},
 partyDetail:function(d){partyDetail(d.id)},
 itemNew:function(){fItem()},
 itemDetail:function(d){itemDetail(d.id)},
 priceAdd:function(d){closeAll();fPrice(d.id)},
 invDetail:function(d){invDetail(d.id)},
 txDetail:function(d){txDetail(d.id)},
 txEdit:function(d){closeAll();fTxEdit(d.id)},
 txReverse:function(d){closeAll();fReverse(d.id)},
 refund:function(d){closeAll();fRefund(d.id)},
 cashSheet:cashSheet,availSheet:availSheet,
 flowSheet:function(d){flowSheet(d.kind)},
 catDetail:function(d){catSheet(d.id,d.from,d.to)},
 srcDetail:function(d){srcSheet(d.id,d.from,d.to)},
 monthDetail:function(d){monthDetail(d.k)},
 period:function(d){ui.period=d.k;ui.custom=null;LG.settings.period=d.k;dbSet(LG);render()},
 customRange:function(){fCustomRange()},
 filter:function(d){ui.filter=d.k;render()},
 repTab:function(d){ui.repTab=d.k;render()},
 debtTab:function(d){ui.debtTab=d.k;render()},
 bulkMode:function(){ui.bulk=!ui.bulk;ui.sel={};ui.selN=0;render()},
 bulkToggle:function(d){if(ui.sel[d.id]){delete ui.sel[d.id];ui.selN--}else{ui.sel[d.id]=1;ui.selN++}render()},
 bulkAll:function(){visibleTx().forEach(function(t){if(t.status==="POSTED"&&t.type!=="REVERSAL"&&!ui.sel[t.id]){ui.sel[t.id]=1;ui.selN++}});render()},
 bulkReverse:function(){fReverse(Object.keys(ui.sel))},
 exportJson:exportJson,
 exportCsv:function(d){exportCsv(d.k)},
 restorePick:function(){$("filePick").click()},
 persistReq:function(){if(!navigator.storage||!navigator.storage.persist){toast("الحماية غير مدعومة هنا","err");return}
  navigator.storage.persist().then(function(ok){toast(ok?"تم تفعيل حماية التخزين":"المتصفح رفض الحماية — صدّر نسخاً دورياً",ok?"ok":"err");storeInfo()},
   function(){toast("الحماية غير مدعومة","err")})},
 wipeAll:function(){modal("مسح كل البيانات","لا يمكن التراجع بعد التأكيد",
  '<div class="alert bad"><span class="ai">⚠</span><div><b>سيُمسح دفترك بالكامل</b><small>الحركات والقيود والأهداف والالتزامات والتدقيق.</small></div></div>'+
  '<p style="font-size:12.5px;color:var(--mute);line-height:1.8">سنصدّر نسخة JSON من بياناتك تلقائياً قبل المسح.</p>',
  '<button class="btn" data-act="closeAll">إلغاء</button><button class="btn d" id="doWipe">صدّر ثم امسح</button>');
  $("doWipe").onclick=function(){closeAll();exportJson();
   dbDel().then(function(){LG=newLedger();return dbSet(LG)}).then(function(){route="home";sub="";render();
    toast("تم المسح — دفترك يبدأ من صفر","ok")},function(){toast("فشل المسح","err")})}},
 startReal:function(){modal("بدء حسابك الحقيقي","سيُزال وضع الاستكشاف",
  '<div class="alert info"><span class="ai">◈</span><div><b>البيانات التجريبية ستُزال</b><small>لن تُخلط أبداً بأموالك الحقيقية.</small></div></div>'+
  '<p style="font-size:12.5px;color:var(--mute);line-height:1.8">دفتر جديد فارغ: نقد صفر، لا حركات، لا أهداف. التصنيفات الافتراضية فقط.</p>',
  '<button class="btn" data-act="closeAll">إلغاء</button><button class="btn p" id="doReal">ابدأ من الصفر</button>');
  $("doReal").onclick=function(){closeAll();
   dbDel().then(function(){LG=newLedger();LG.settings.demo=false;return dbSet(LG)}).then(function(){
    route="home";sub="";render();toast("دفترك الحقيقي جاهز — ابدأ بتسجيل دخل","ok")},function(){toast("تعذّر البدء","err")})}},
 demoToggle:function(){if(LG.settings.demo){ACT.startReal();return}
  modal("تفعيل وضع الاستكشاف","بيانات تجريبية منفصلة",
   '<div class="alert warn"><span class="ai">⚗</span><div><b>سيُستبدل دفترك ببيانات تجريبية</b><small>سنصدّر نسخة من بياناتك الحقيقية أولاً.</small></div></div>',
   '<button class="btn" data-act="closeAll">إلغاء</button><button class="btn p" id="doDemo">صدّر ثم فعّل</button>');
  $("doDemo").onclick=function(){closeAll();exportJson();LG=seed();
   dbSet(LG).then(function(){render();toast("وضع الاستكشاف مفعّل","ok")},function(){toast("تعذّر التفعيل","err")})}},
 runChecks:runChecks,
 catNew:function(){form({title:"تصنيف جديد",ok:"إضافة",fields:[{k:"name",label:"الاسم",required:true},
  {k:"icon",label:"أيقونة",val:"📦"},{k:"color",label:"اللون",type:"pick",val:"#5B8FF9",
   opts:PAL.slice(0,8).map(function(c){return[c,"●"]})}],
  onSubmit:function(v){return commit(function(lg){lg.settings.categories.push(["c_"+Date.now().toString(36),v.name,v.icon||"📦",v.color])},"تمت إضافة التصنيف")}})},
 srcNew:function(){form({title:"مصدر دخل جديد",ok:"إضافة",fields:[{k:"name",label:"الاسم",required:true},{k:"icon",label:"أيقونة",val:"📥"}],
  onSubmit:function(v){return commit(function(lg){lg.settings.sources.push(["s_"+Date.now().toString(36),v.name,v.icon||"📥"])},"تمت إضافة المصدر")}})}
};
document.addEventListener("click",function(e){
 var b=e.target.closest?e.target.closest("[data-act]"):null;
 if(!b)return;
 var fn=ACT[b.dataset.act];
 if(fn){e.preventDefault();try{fn(b.dataset,b,e)}catch(err){toast(err.message||"خطأ في التنفيذ","err")}}});
document.addEventListener("change",function(e){var t=e.target;
 if(t.id==="sortSel"){ui.sort=t.value;render();return}
 if(t.id==="filePick"&&t.files&&t.files[0]){restoreFile(t.files[0]);t.value="";return}
 var k=t.dataset?t.dataset.set:null;
 if(k==="weekStart"){LG.settings.weekStart=Number(t.value);dbSet(LG);render()}
 if(k==="payday"){LG.settings.payday=Math.min(31,Math.max(1,Number(t.value)||18));dbSet(LG);render()}
 if(k==="period"){LG.settings.period=t.value;ui.period=t.value;ui.custom=null;dbSet(LG);render()}});
document.addEventListener("input",function(e){
 if(e.target.id!=="qBox")return;
 ui.q=e.target.value;
 var box=$("txList");if(!box)return;
 var list=visibleTx();
 box.innerHTML=list.length?'<div class="rows">'+list.slice(0,300).map(txRow).join("")+'</div>'
  :'<div class="empty"><span class="ei">◌</span><b>لا نتائج</b>جرّب كلمة أخرى</div>'});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeAll()});
document.addEventListener("visibilitychange",function(){if(!document.hidden&&LG)render()});
setInterval(function(){if(LG&&!document.hidden&&route==="home")render()},60000);
/* ══════════════ الإقلاع ══════════════ */
dbGet().then(function(saved){
 if(saved&&saved.transactions){LG=saved;
  if(!LG.settings)LG.settings=newLedger().settings;
  materialize(LG,45);return dbSet(LG)}
 LG=seed();return dbSet(LG)}).then(function(){render();
 var chk=integrity(LG);if(!chk.ok)toast("تنبيه سلامة: "+chk.problems[0],"err");
 if("serviceWorker" in navigator&&location.protocol.indexOf("http")===0)
  navigator.serviceWorker.register("./sw.js").catch(function(){})},
 function(e){
  $("app").innerHTML='<div class="view"><div class="alert bad"><span class="ai">✕</span><div>'+
   '<b>تعذّر فتح قاعدة البيانات</b><small>'+esc(e.message||String(e))+'</small></div></div>'+
   '<div class="card"><p style="font-size:12.5px;line-height:1.9;color:var(--mute)">'+
   'لم نبدأ دفتری فارغاً فوق بياناتك — هذا مقصود لحمايتها. أغلق التبويبات الأخرى ثم أعد المحاولة.</p>'+
   '<button class="btn p w" style="margin-top:12px" onclick="location.reload()">إعادة المحاولة</button></div></div>'});
})();
