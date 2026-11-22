/* ميزانيتي v4 — ملف واحد مكتفٍ: المحرك + التخزين + الواجهة.
   المال سنتيم صحيح. التاريخ نص محلي. كل رصيد مشتق من قيود متوازنة. */
(function(G){"use strict";
/* ══════════ 1. المال ══════════ */
var M={
 is:function(v){return Number.isSafeInteger(v)},
 as:function(v,l){if(!Number.isSafeInteger(v))throw E("NOT_INT",(l||"المبلغ")+" يجب أن يكون عدداً صحيحاً بالسنتيم");return v},
 parse:function(inp,o){o=o||{};
  if(inp==null||inp==="")throw E("EMPTY","المبلغ فارغ");
  var s=String(inp).trim().replace(/[\s\u00A0\u202F,_']/g,"");
  if(!s||s==="-")throw E("EMPTY","المبلغ فارغ");
  var neg=false;if(s[0]==="-"){neg=true;s=s.slice(1)}else if(s[0]==="+")s=s.slice(1);
  if(!/^\d+(\.\d+)?$/.test(s))throw E("BAD_FMT","صيغة مبلغ غير صالحة: "+inp);
  var d=s.indexOf("."),ip=d<0?s:s.slice(0,d),fr=d<0?"":s.slice(d+1);
  var c=Number(ip)*100+Number((fr+"00").slice(0,2)),ex=fr.slice(2),rd=false;
  if(/[1-9]/.test(ex)){if(!o.round)throw E("SUB_CENT","المبلغ أدق من السنتيم: "+inp);
   if(Number(ex[0])>=5)c+=1;rd=true}
  M.as(c);return{cents:neg?-c:c,rounded:rd}},
 c:function(i,o){return M.parse(i,o).cents},
 f:function(c,o){o=o||{};M.as(c,"العرض");
  var n=c<0,a=Math.abs(c),mj=String(Math.floor(a/100)).replace(/\B(?=(\d{3})+(?!\d))/g,","),mn=a%100;
  return(n?"−":"")+(o.plus&&c>0?"+":"")+mj+((mn||o.am)?"."+String(mn).padStart(2,"0"):"")+(o.cur?" دج":"")},
 sh:function(c){var a=Math.abs(c);if(a>=1e8)return(c/1e8).toFixed(1)+"م";if(a>=1e5)return Math.round(c/1e5)+"ك";return M.f(c)},
 q:function(i){var s=String(i==null?"":i).trim().replace(/[\s,]/g,"");
  if(!/^\d+(\.\d{1,3})?$/.test(s))throw E("BAD_QTY","كمية غير صالحة: "+i);
  var d=s.indexOf("."),ip=d<0?s:s.slice(0,d),fp=((d<0?"":s.slice(d+1))+"000").slice(0,3);
  return Number(ip)*1000+Number(fp)},
 fq:function(q){var w=Math.floor(Math.abs(q)/1000),f=Math.abs(q)%1000;
  return(q<0?"−":"")+w+(f?"."+String(f).padStart(3,"0").replace(/0+$/,""):"")},
 dr:function(n,d){return(n<0?-1:1)*Math.floor((Math.abs(n)+Math.floor(d/2))/d)},
 ln:function(q,p){M.as(q,"الكمية");M.as(p,"السعر");
  if(q<0||p<0)throw E("NEG","كمية أو سعر سالب");
  var v=q*p;if(!Number.isSafeInteger(v))throw E("OVF","تجاوز المدى");return M.dr(v,1000)},
 sum:function(a){var s=0;for(var i=0;i<a.length;i++)s+=M.as(a[i],"سطر");return M.as(s,"الإجمالي")}
};
function E(c,m){var e=new Error(m);e.code=c;return e}
/* ══════════ 2. التقويم ══════════ */
var ARM=["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
var ARD=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
function dfc(y,m,d){var yy=y-(m<=2?1:0),er=Math.floor(yy/400),yo=yy-er*400,mp=m+(m>2?-3:9);
 var dy=Math.floor((153*mp+2)/5)+d-1;return er*146097+(yo*365+Math.floor(yo/4)-Math.floor(yo/100)+dy)-719468}
function cfd(z){z+=719468;var er=Math.floor(z/146097),de=z-er*146097;
 var yo=Math.floor((de-Math.floor(de/1460)+Math.floor(de/36524)-Math.floor(de/146096))/365);
 var y=yo+er*400,dy=de-(365*yo+Math.floor(yo/4)-Math.floor(yo/100)),mp=Math.floor((5*dy+2)/153);
 var d=dy-Math.floor((153*mp+2)/5)+1,m=mp+(mp<10?3:-9);return{y:y+(m<=2?1:0),m:m,d:d}}
var D={
 leap:function(y){return(y%4===0&&y%100!==0)||y%400===0},
 dim:function(y,m){return[31,D.leap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1]},
 ok:function(s){if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  var p=s.split("-").map(Number);return p[1]>=1&&p[1]<=12&&p[2]>=1&&p[2]<=D.dim(p[0],p[1])},
 as:function(s,l){if(!D.ok(s))throw E("BAD_DATE","تاريخ غير صالح ("+(l||"")+"): "+s);return s},
 iso:function(y,m,d){return D.as(String(y).padStart(4,"0")+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0"))},
 p:function(s){D.as(s);var a=s.split("-").map(Number);return{y:a[0],m:a[1],d:a[2]}},
 n:function(s){var a=D.p(s);return dfc(a.y,a.m,a.d)},
 fn:function(n){var c=cfd(n);return D.iso(c.y,c.m,c.d)},
 add:function(s,n){return D.fn(D.n(s)+n)},
 diff:function(a,b){return D.n(b)-D.n(a)},
 dow:function(s){return((D.n(s)+4)%7+7)%7},
 ws:function(s,w){w=w==null?6:w;return D.add(s,-((D.dow(s)-w+7)%7))},
 mk:function(s){return D.as(s).slice(0,7)},
 mr:function(k){var p=k.split("-").map(Number);return{start:D.iso(p[0],p[1],1),end:D.iso(p[0],p[1],D.dim(p[0],p[1]))}},
 am:function(k,n){var p=k.split("-").map(Number),t=p[0]*12+(p[1]-1)+n;
  return String(Math.floor(t/12)).padStart(4,"0")+"-"+String((t%12+12)%12+1).padStart(2,"0")},
 cl:function(y,m,a){return Math.min(a,D.dim(y,m))},
 mo:function(k,a){var p=k.split("-").map(Number);return D.iso(p[0],p[1],D.cl(p[0],p[1],a))},
 today:function(){var d=new Date();return D.iso(d.getFullYear(),d.getMonth()+1,d.getDate())},
 now:function(){return new Date().toISOString()},
 per:function(k,t,w){var y=D.p(t).y;
  if(k==="today")return{start:t,end:t,label:"اليوم",key:k};
  if(k==="week"){var s=D.ws(t,w);return{start:s,end:D.add(s,6),label:"هذا الأسبوع",key:k}}
  if(k==="lastMonth")return Object.assign(D.mr(D.am(D.mk(t),-1)),{label:"الشهر السابق",key:k});
  if(k==="year")return{start:D.iso(y,1,1),end:D.iso(y,12,31),label:"هذه السنة",key:k};
  if(k==="all")return{start:"0000-01-01",end:"9999-12-31",label:"كل الفترات",key:k};
  return Object.assign(D.mr(D.mk(t)),{label:"هذا الشهر",key:"month"})},
 cyc:function(t,pd){var a=D.p(t),k=D.iso(a.y,a.m,1).slice(0,7);
  if(a.d<D.cl(a.y,a.m,pd))k=D.am(k,-1);
  var b=k.split("-").map(Number),st=D.iso(b[0],b[1],D.cl(b[0],b[1],pd));
  var nk=D.am(k,1).split("-").map(Number),ns=D.iso(nk[0],nk[1],D.cl(nk[0],nk[1],pd));
  return{start:st,end:D.add(ns,-1),label:"دورة الراتب",key:"cycle"}},
 ml:function(k){var p=k.split("-").map(Number);return ARM[p[1]-1]+" "+p[0]},
 ms:function(k){return ARM[Number(k.split("-")[1])-1]},
 full:function(s){var p=D.p(s);return ARD[D.dow(s)]+" "+p.d+" "+ARM[p.m-1]+" "+p.y},
 dn:function(s){return ARD[D.dow(s)]}
};
/* ══════════ 3. دفتر الأستاذ ══════════ */
var DR="DEBIT",CR="CREDIT";
var ACC={CASH:{k:"A",n:DR,l:"النقد الفعلي"},RECV:{k:"A",n:DR,l:"حقوق لدى الغير"},
 EXP:{k:"E",n:DR,l:"المصروفات"},DEBT:{k:"L",n:CR,l:"ديون عليّ"},
 INC:{k:"I",n:CR,l:"الدخل المكتسب"},GAIN:{k:"I",n:CR,l:"مكاسب غير تشغيلية"},EQ:{k:"Q",n:CR,l:"التسويات"}};
var SF="sys:fees",SB="sys:bad";
var LBL={INC:"دخل",EXP:"مصروف",REF:"استرجاع",BRW:"قرض مستلم",DPY:"تسديد دين",FRG:"إعفاء من دين",
 LND:"إقراض",COL:"تحصيل حق",WOF:"حق معدوم",ADJ:"تسوية",REV:"عكس"};
var INC_T=["INC","REF","BRW","COL","FRG"];
var RULES={
 INC:function(t){return[{a:"CASH",s:DR,v:t.amount},{a:"INC",b:t.sourceId,s:CR,v:t.amount}]},
 EXP:function(t){return[{a:"EXP",b:t.categoryId,s:DR,v:t.amount},{a:"CASH",s:CR,v:t.amount}]},
 REF:function(t){return[{a:"CASH",s:DR,v:t.amount},{a:"EXP",b:t.categoryId,s:CR,v:t.amount}]},
 BRW:function(t){return[{a:"CASH",s:DR,v:t.amount},{a:"DEBT",b:t.partyId,s:CR,v:t.amount}]},
 DPY:function(t){var l=[];if(t.principal>0)l.push({a:"DEBT",b:t.partyId,s:DR,v:t.principal});
  if(t.fees>0)l.push({a:"EXP",b:SF,s:DR,v:t.fees});l.push({a:"CASH",s:CR,v:t.amount});return l},
 FRG:function(t){return[{a:"DEBT",b:t.partyId,s:DR,v:t.amount},{a:"GAIN",b:"forgiven",s:CR,v:t.amount}]},
 LND:function(t){return[{a:"RECV",b:t.partyId,s:DR,v:t.amount},{a:"CASH",s:CR,v:t.amount}]},
 COL:function(t){return[{a:"CASH",s:DR,v:t.amount},{a:"RECV",b:t.partyId,s:CR,v:t.amount}]},
 WOF:function(t){return[{a:"EXP",b:SB,s:DR,v:t.amount},{a:"RECV",b:t.partyId,s:CR,v:t.amount}]},
 ADJ:function(t){return t.amount>=0?[{a:"CASH",s:DR,v:t.amount},{a:"EQ",b:"adj",s:CR,v:t.amount}]
  :[{a:"EQ",b:"adj",s:DR,v:-t.amount},{a:"CASH",s:CR,v:-t.amount}]}
};
var REQ={INC:["sourceId"],EXP:["categoryId"],REF:["categoryId","originalTxId"],BRW:["partyId"],
 DPY:["partyId"],FRG:["partyId"],LND:["partyId"],COL:["partyId"],WOF:["partyId"],ADJ:["reason"]};
var seq=0;
function uid(p){return p+"_"+Date.now().toString(36)+"_"+(++seq).toString(36)+Math.random().toString(36).slice(2,6)}
function bal(ls){if(!ls||ls.length<2)throw E("EMPTY_E","القيد يحتاج سطرين");
 var d=0,c=0;for(var i=0;i<ls.length;i++){var l=ls[i];
  if(!ACC[l.a])throw E("BAD_ACC","حساب غير معروف: "+l.a);
  M.as(l.v);if(l.v<=0)throw E("NON_POS","سطور القيد موجبة");
  if(l.s===DR)d+=l.v;else if(l.s===CR)c+=l.v;else throw E("BAD_SIDE","جهة غير معروفة")}
 if(d!==c)throw E("UNBAL","قيد غير متوازن: "+d+" / "+c);return{d:d,c:c}}
var CATS=[["food","مواد غذائية","🛒","#E0A458"],["veg","خضر وفواكه","🥬","#5FBF7F"],["meat","لحوم وأسماك","🍗","#D96C6C"],
["bread","خبز","🥖","#C9A227"],["transport","نقل ووقود","⛽","#5B8FF9"],["home","سكن وإيجار","🏠","#9B7EDE"],
["util","كهرباء وماء وغاز","💡","#4ECDC4"],["net","إنترنت وهاتف","📶","#6C8EBF"],["health","صحة","⚕","#F06292"],
["edu","تعليم","📚","#7986CB"],["clothes","ملابس","👕","#FF8A65"],["family","أسرة","👨‍👩‍👧","#A1887F"],
["fun","ترفيه","🎬","#BA68C8"],["tax","ضرائب ورسوم","🧾","#90A4AE"],["other","أخرى","📦","#8FA0B8"]];
var SRCS=[["salary","راتب","💼"],["extra","عمل إضافي","⚡"],["gift","هدية","🎁"],["sale","بيع ممتلكات","🏷"],["side","نشاط جانبي","🛠"],["other","أخرى","📥"]];
function fresh(){return{meta:{schema:5,createdAt:D.now()},
 transactions:[],entries:[],lines:[],goals:[],savings:[],budgets:[],commitments:[],occurrences:[],
 parties:[],items:[],prices:[],invoices:[],audit:[],
 settings:{theme:"dark",weekStart:6,payday:18,period:"month",demo:false,categories:CATS.slice(),sources:SRCS.slice(),views:[]}}}
function pbal(lg,pid,acc){var s=0,n=ACC[acc].n;
 for(var i=0;i<lg.lines.length;i++){var l=lg.lines[i];
  if(l.account===acc&&l.sub===pid)s+=l.side===n?l.amount:-l.amount}return s}
function gbal(lg,id){var b=0;for(var i=0;i<lg.savings.length;i++){var e=lg.savings[i];
 if(e.goalId===id)b+=e.kind==="ADD"?e.amount:-e.amount}return b}
function reserved(lg){var s=0;for(var i=0;i<lg.goals.length;i++){var g=lg.goals[i];
 if(g.status==="ACTIVE")s+=Math.max(0,gbal(lg,g.id))}return s}
function rebuild(lg,asOf){if(asOf)D.as(asOf);
 var b=Object.create(null),dt=0,ct=0,n=0;
 for(var i=0;i<lg.lines.length;i++){var l=lg.lines[i];
  if(asOf&&l.occurredOn>asOf)continue;
  var a=ACC[l.account];if(!a)throw E("BAD_ACC",l.account);
  b[l.account]=(b[l.account]||0)+l.amount*(l.side===DR?1:-1);
  var k=l.account+":"+(l.sub||"*");
  b[k]=(b[k]||0)+(l.side===a.n?l.amount:-l.amount);
  if(l.side===DR)dt+=l.amount;else ct+=l.amount;n++}
 var nat=Object.create(null);for(var c in ACC){var r=b[c]||0;nat[c]=ACC[c].n===DR?r:-r}
 return{bal:b,nat:nat,debit:dt,credit:ct,ok:dt===ct,count:n}}
function sub(sn,a,s){return sn.bal[a+":"+(s||"*")]||0}
function pos(lg,asOf){var s=rebuild(lg,asOf),cash=s.nat.CASH||0,rc=s.nat.RECV||0,db=s.nat.DEBT||0;
 var rs=reserved(lg),fu=Math.min(rs,Math.max(0,cash));
 return{asOf:asOf,cash:cash,reserved:rs,funded:fu,available:Math.max(0,cash-fu),gap:Math.max(0,rs-Math.max(0,cash)),
  recv:rc,debt:db,net:cash+rc-db,income:s.nat.INC||0,gain:s.nat.GAIN||0,expense:s.nat.EXP||0,
  fees:sub(s,"EXP",SF),bad:sub(s,"EXP",SB),trial:{d:s.debit,c:s.credit,ok:s.ok},count:s.count,snap:s}}
function flow(lg,f,t){var ic=0,ex=0,bc={},bs={};
 for(var i=0;i<lg.lines.length;i++){var l=lg.lines[i];
  if(l.occurredOn<f||l.occurredOn>t)continue;
  if(l.account==="INC"){var v=l.side===CR?l.amount:-l.amount;ic+=v;bs[l.sub]=(bs[l.sub]||0)+v}
  if(l.account==="EXP"){var w=l.side===DR?l.amount:-l.amount;if(l.sub===SB)continue;
   ex+=w;bc[l.sub]=(bc[l.sub]||0)+w}}
 return{income:ic,expense:ex,net:ic-ex,byCat:bc,bySrc:bs}}
function stmt(lg,to){var rows=[],run=0;
 var ls=lg.lines.filter(function(l){return l.account==="CASH"}).slice().sort(function(a,b){
  return a.occurredOn<b.occurredOn?-1:a.occurredOn>b.occurredOn?1:(a.createdAt<b.createdAt?-1:1)});
 for(var i=0;i<ls.length;i++){var l=ls[i];if(to&&l.occurredOn>to)break;
  var d=l.side===DR?l.amount:-l.amount;run+=d;
  var tx=find(lg.transactions,l.txId,"txId");
  rows.push({date:l.occurredOn,txId:l.txId,title:tx?tx.title:"",delta:d,run:run})}
 return{rows:rows,close:run}}
function find(arr,id,k){k=k||"id";for(var i=0;i<arr.length;i++)if(arr[i][k]===id)return arr[i];return null}
function validate(lg,t){
 if(!RULES[t.type])throw E("TYPE","نوع غير معروف: "+t.type);
 D.as(t.occurredOn,"تاريخ الوقوع");
 if(!t.opId)throw E("NO_OP","العملية تحتاج معرّف");
 if(find(lg.transactions,t.opId,"opId"))throw E("DUP","العملية مسجّلة مسبقاً");
 var rq=REQ[t.type]||[];for(var i=0;i<rq.length;i++)if(!t[rq[i]]&&t[rq[i]]!==0)throw E("MISS","حقل مطلوب: "+rq[i]);
 if(t.type==="DPY"){var p=t.principal||0,f=t.fees||0;M.as(p);M.as(f);
  if(p<0||f<0)throw E("NEG_S","مكوّنات سالبة");
  if(p+f!==t.amount)throw E("SPLIT","مجموع المكوّنات لا يساوي الإجمالي");
  if(p+f===0)throw E("ZERO","دفعة صفرية");
  if(p>pbal(lg,t.partyId,"DEBT"))throw E("OVERPAY","أصل الدفعة يتجاوز الدين المتبقي");
 }else if(t.type==="ADJ"){if(!M.is(t.amount)||!t.amount)throw E("AMT","تسوية صفرية")}
 else if(!M.is(t.amount)||t.amount<=0)throw E("AMT","المبلغ يجب أن يكون موجباً");
 if(t.type==="REF"){var o=find(lg.transactions,t.originalTxId);
  if(!o)throw E("NO_ORIG","المصروف الأصلي غير موجود");
  if(o.type!=="EXP")throw E("NOT_EXP","الاسترجاع يرتبط بمصروف");
  var done=0;for(var j=0;j<lg.transactions.length;j++){var x=lg.transactions[j];
   if(x.type==="REF"&&x.originalTxId===o.id&&x.status==="POSTED")done+=x.amount}
  if(t.amount>o.amount-done)throw E("REF_BIG","الاسترجاع يتجاوز المتبقي ("+M.f(o.amount-done)+" دج)")}
 if(t.type==="COL"&&t.amount>pbal(lg,t.partyId,"RECV"))throw E("COL_BIG","التحصيل يتجاوز الحق المتبقي");
 if(t.type==="FRG"&&t.amount>pbal(lg,t.partyId,"DEBT"))throw E("FRG_BIG","الإعفاء يتجاوز الدين");
 if(t.type==="WOF"&&t.amount>pbal(lg,t.partyId,"RECV"))throw E("WOF_BIG","الإعدام يتجاوز الحق")}
function post(lg,inp){var t=Object.assign({},inp);validate(lg,t);
 var raw=RULES[t.type](Object.assign({principal:0,fees:0},t)),tt=bal(raw);
 var id=uid("tx"),eid=uid("je"),at=D.now();
 var rec={id:id,opId:t.opId,type:t.type,occurredOn:t.occurredOn,createdAt:at,updatedAt:at,amount:t.amount,
  title:t.title||LBL[t.type],categoryId:t.categoryId||null,sourceId:t.sourceId||null,partyId:t.partyId||null,
  originalTxId:t.originalTxId||null,goalId:t.goalId||null,occurrenceId:t.occurrenceId||null,invoiceId:t.invoiceId||null,
  note:t.note||"",reason:t.reason||null,principal:t.principal||0,fees:t.fees||0,
  status:"POSTED",reversedBy:null,reversalOf:null,correctionOf:t.correctionOf||null};
 var en={id:eid,txId:id,occurredOn:t.occurredOn,createdAt:at,kind:"NORMAL",debit:tt.d,credit:tt.c};
 var ls=raw.map(function(l,i){return{id:eid+":"+i,entryId:eid,txId:id,account:l.a,sub:l.b||null,side:l.s,
  amount:l.v,occurredOn:t.occurredOn,createdAt:at}});
 lg.transactions.push(rec);lg.entries.push(en);Array.prototype.push.apply(lg.lines,ls);
 lg.audit.push({id:uid("au"),at:at,action:"POST",entity:"tx",entityId:id,opId:t.opId,before:null,
  after:{title:rec.title,amount:rec.amount,status:"POSTED"},reason:t.reason||null});
 if(t.occurrenceId){var oc=find(lg.occurrences,t.occurrenceId);
  if(oc){oc.paid=(oc.paid||0)+t.amount;oc.txIds=(oc.txIds||[]).concat(id);
   oc.status=oc.paid>=oc.amount?"PAID":"PARTIAL"}}
 return{txId:id,entryId:eid}}
function reverse(lg,txId,o){o=o||{};
 if(!o.opId)throw E("NO_OP","العكس يحتاج معرّف");
 if(find(lg.transactions,o.opId,"opId"))throw E("DUP","مكرر");
 var t=find(lg.transactions,txId);if(!t)throw E("NF","الحركة غير موجودة");
 if(t.status==="REVERSED")throw E("ALREADY","لا يجوز العكس مرتين");
 if(t.type==="REV")throw E("REV_REV","قيد العكس لا يُعكس");
 if(!o.reason||!String(o.reason).trim())throw E("REASON","العكس يحتاج سبباً");
 var e=find(lg.entries,txId,"txId");
 var mir=lg.lines.filter(function(l){return l.entryId===e.id}).map(function(l){
  return{a:l.account,b:l.sub,s:l.side===DR?CR:DR,v:l.amount}});
 var tt=bal(mir),when=o.occurredOn||D.today();D.as(when);
 var at=D.now(),nid=uid("tx"),neid=uid("je"),bf={title:t.title,amount:t.amount,status:t.status};
 var rec={id:nid,opId:o.opId,type:"REV",occurredOn:when,createdAt:at,updatedAt:at,amount:t.amount,
  title:"عكس: "+t.title,categoryId:t.categoryId,sourceId:t.sourceId,partyId:t.partyId,originalTxId:null,
  goalId:t.goalId,occurrenceId:t.occurrenceId,invoiceId:null,note:o.reason,reason:o.reason,principal:0,fees:0,
  status:"POSTED",reversedBy:null,reversalOf:txId,correctionOf:null};
 var en={id:neid,txId:nid,occurredOn:when,createdAt:at,kind:"REVERSAL",debit:tt.d,credit:tt.c};
 var ls=mir.map(function(l,i){return{id:neid+":"+i,entryId:neid,txId:nid,account:l.a,sub:l.b||null,
  side:l.s,amount:l.v,occurredOn:when,createdAt:at}});
 t.status="REVERSED";t.reversedBy=nid;t.updatedAt=at;
 lg.transactions.push(rec);lg.entries.push(en);Array.prototype.push.apply(lg.lines,ls);
 lg.audit.push({id:uid("au"),at:at,action:"REVERSE",entity:"tx",entityId:txId,opId:o.opId,
  before:bf,after:{title:t.title,amount:t.amount,status:"REVERSED"},reason:o.reason});
 if(t.occurrenceId){var oc=find(lg.occurrences,t.occurrenceId);
  if(oc){oc.paid=Math.max(0,(oc.paid||0)-t.amount);
   oc.txIds=(oc.txIds||[]).filter(function(x){return x!==txId});
   oc.status=oc.paid>0?"PARTIAL":(oc.dueOn<D.today()?"OVERDUE":"DUE")}}
 if(t.goalId&&t.type==="EXP"){var ev=null;
  for(var i=0;i<lg.savings.length;i++)if(lg.savings[i].txId===txId&&lg.savings[i].kind==="USE")ev=lg.savings[i];
  if(ev)lg.savings.push({id:uid("sv"),opId:o.opId+":sv",goalId:t.goalId,kind:"ADD",amount:ev.amount,
   occurredOn:when,createdAt:at,note:"استرجاع تخصيص بعد عكس الشراء"})}
 return{txId:nid,reversed:txId}}
function correct(lg,txId,nx,o){reverse(lg,txId,{reason:o.reason,occurredOn:nx.occurredOn,opId:o.opId+"r"});
 return post(lg,Object.assign({},nx,{opId:o.opId+"n",correctionOf:txId,reason:o.reason}))}
function sev(lg,ev){if(!ev.opId)throw E("NO_OP","حدث بلا معرّف");
 if(find(lg.savings,ev.opId,"opId"))throw E("DUP","مكرر");
 M.as(ev.amount);if(ev.amount<=0)throw E("AMT","مبلغ موجب مطلوب");D.as(ev.occurredOn);
 var r=Object.assign({id:uid("sv"),createdAt:D.now()},ev);lg.savings.push(r);
 lg.audit.push({id:uid("au"),at:r.createdAt,action:ev.kind,entity:"savings",entityId:r.id,opId:ev.opId,
  before:null,after:{amount:ev.amount,note:ev.note||""},reason:ev.reason||null});return r}
function alloc(lg,o){var g=find(lg.goals,o.goalId);
 if(!g)throw E("NO_GOAL","الهدف غير موجود");
 if(g.status!=="ACTIVE")throw E("INACT","الهدف غير نشط");
 var free=rebuild(lg,o.occurredOn).nat.CASH-reserved(lg);
 if(o.amount>free&&!o.unfunded)throw E("EXCEED","التخصيص يتجاوز المتاح ("+M.f(Math.max(0,free))+" دج)");
 return sev(lg,{goalId:o.goalId,kind:"ADD",amount:o.amount,occurredOn:o.occurredOn,opId:o.opId,note:o.note||"",unfunded:o.amount>free})}
function release(lg,o){var b=gbal(lg,o.goalId);
 if(o.amount>b)throw E("EXCEED","التحرير يتجاوز رصيد الهدف ("+M.f(b)+" دج)");
 return sev(lg,{goalId:o.goalId,kind:"REL",amount:o.amount,occurredOn:o.occurredOn,opId:o.opId,reason:o.reason||"تحرير"})}
function goalBuy(lg,o){var b=Math.max(0,gbal(lg,o.goalId)),rel=Math.min(o.amount,b);
 var r=post(lg,{type:"EXP",amount:o.amount,categoryId:o.categoryId,occurredOn:o.occurredOn,opId:o.opId,
  title:o.title,note:o.note||"",goalId:o.goalId});
 if(rel>0)sev(lg,{goalId:o.goalId,kind:"USE",amount:rel,occurredOn:o.occurredOn,opId:o.opId+":u",txId:r.txId,note:"شراء من الهدف"});
 return{txId:r.txId,released:rel,free:o.amount-rel}}
function materialize(lg,hz){var t=D.today(),to=D.add(t,hz==null?45:hz),made=0;
 for(var i=0;i<lg.commitments.length;i++){var c=lg.commitments[i];
  if(c.status!=="ACTIVE")continue;
  var k=D.mk(c.startOn<t?c.startOn:t),ek=D.mk(c.endOn&&c.endOn<to?c.endOn:to),gd=0;
  while(k<=ek&&gd++<600){var due=D.mo(k,c.anchorDay);
   if(due>=c.startOn&&due<=to&&(!c.endOn||due<=c.endOn)){var key=c.id+"|"+k,ex=null;
    for(var j=0;j<lg.occurrences.length;j++)if(lg.occurrences[j].key===key)ex=lg.occurrences[j];
    if(!ex){lg.occurrences.push({id:uid("oc"),key:key,commitmentId:c.id,periodKey:k,dueOn:due,
     amount:c.amount,paid:0,status:due<t?"OVERDUE":(due===t?"DUE":"SCHEDULED"),txIds:[],createdAt:D.now()});made++}}
   k=D.am(k,1)}}
 for(var m=0;m<lg.occurrences.length;m++){var o=lg.occurrences[m];
  if(o.status==="PAID"||o.status==="SKIPPED"||o.status==="CANCELLED")continue;
  var cc=find(lg.commitments,o.commitmentId),gr=(cc&&cc.graceDays)||0;
  o.status=o.paid>0?(o.paid>=o.amount?"PAID":"PARTIAL"):(D.add(o.dueOn,gr)<t?"OVERDUE":(o.dueOn<=t?"DUE":"SCHEDULED"))}
 return made}
function integrity(lg){var p=[],s=rebuild(lg);
 if(!s.ok)p.push("ميزان المراجعة غير متوازن");
 var ei={};lg.entries.forEach(function(e){ei[e.id]=1});
 var ti={};lg.transactions.forEach(function(t){ti[t.id]=1});
 lg.lines.forEach(function(l){if(!ei[l.entryId])p.push("سطر يتيم");
  if(!M.is(l.amount)||l.amount<=0)p.push("مبلغ سطر غير صالح")});
 lg.entries.forEach(function(e){if(!ti[e.txId])p.push("قيد يتيم");
  try{bal(lg.lines.filter(function(l){return l.entryId===e.id}))}catch(x){p.push(x.message)}});
 var op={},ok={};
 lg.transactions.forEach(function(t){if(op[t.opId])p.push("معرّف عملية مكرر");op[t.opId]=1});
 lg.goals.forEach(function(g){if(gbal(lg,g.id)<0)p.push("رصيد هدف سالب: "+g.name)});
 lg.occurrences.forEach(function(o){if(ok[o.key])p.push("استحقاق مكرر");ok[o.key]=1});
 return{ok:!p.length,problems:p.slice(0,8)}}
/* ══════════ 4. التخزين ══════════ */
var DBN="mizanati-v5",DBV=5;
var ST={transactions:"id",entries:"id",lines:"id",goals:"id",savings:"id",budgets:"id",
 commitments:"id",occurrences:"id",parties:"id",items:"id",prices:"id",invoices:"id",audit:"id",meta:"key"};
var _db=null,_op=null;
function open(){if(_db)return Promise.resolve(_db);if(_op)return _op;
 _op=new Promise(function(res,rej){
  if(!G.indexedDB){rej(new Error("المتصفح لا يدعم IndexedDB"));return}
  var r=indexedDB.open(DBN,DBV);
  r.onupgradeneeded=function(){var d=r.result;
   for(var s in ST)if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:ST[s]})};
  r.onsuccess=function(){_db=r.result;_op=null;
   _db.onversionchange=function(){_db.close();_db=null};res(_db)};
  r.onerror=function(){_op=null;rej(r.error||new Error("فشل فتح القاعدة"))};
  r.onblocked=function(){_op=null;rej(new Error("تبويب آخر يمنع الترقية — أغلق التبويبات الأخرى"))}});
 return _op}
function save(lg){return open().then(function(d){return new Promise(function(res,rej){
 var ns=Object.keys(ST),tx;
 try{tx=d.transaction(ns,"readwrite")}catch(e){rej(e);return}
 tx.oncomplete=function(){res(true)};
 tx.onerror=function(){rej(tx.error||new Error("فشل الحفظ"))};
 tx.onabort=function(){rej(tx.error||new Error("أُجهض الحفظ"))};
 try{for(var i=0;i<ns.length;i++){var n=ns[i],st=tx.objectStore(n);st.clear();
  if(n==="meta"){for(var k in lg.meta)st.put({key:k,value:lg.meta[k]});st.put({key:"settings",value:lg.settings})}
  else{var a=lg[n]||[];for(var j=0;j<a.length;j++)st.put(a[j])}}}
 catch(e){try{tx.abort()}catch(x){}rej(e)}})})}
function load(){return open().then(function(d){return new Promise(function(res,rej){
 var ns=Object.keys(ST),tx=d.transaction(ns,"readonly"),out={};
 for(var i=0;i<ns.length;i++)(function(n){var r=tx.objectStore(n).getAll();
  r.onsuccess=function(){out[n]=r.result}})(ns[i]);
 tx.oncomplete=function(){var lg=fresh();
  ns.forEach(function(n){if(n!=="meta")lg[n]=out[n]||[]});
  var mt={};(out.meta||[]).forEach(function(m){mt[m.key]=m.value});
  if(mt.settings)lg.settings=Object.assign(lg.settings,mt.settings);
  delete mt.settings;lg.meta=Object.assign(lg.meta,mt);
  lg.meta.empty=!mt.init&&!(out.transactions||[]).length;res(lg)};
  tx.onerror=function(){rej(tx.error||new Error("فشل التحميل"))}})})}
function wipe(){return open().then(function(d){return new Promise(function(res,rej){
 var ns=Object.keys(ST),tx=d.transaction(ns,"readwrite");
 ns.forEach(function(n){tx.objectStore(n).clear()});
 tx.oncomplete=function(){res(true)};tx.onerror=function(){rej(tx.error)}})})}
/* ══════════ 5. بيانات الاستكشاف ══════════ */
function seed(){var lg=fresh(),t=D.today(),mk=function(n){return D.am(D.mk(t),n)},op=0,O=function(){return"sd-"+(++op)};
 lg.settings.demo=true;lg.meta.init=true;
 var P=function(n,k){var id=uid("pt");lg.parties.push({id:id,name:n,kind:k,note:"",createdAt:D.now()});return id};
 var landlord=P("المؤجر — عمي صالح","payee"),sonel=P("سونلغاز","payee"),seaal=P("سيال","payee"),
  at=P("اتصالات الجزائر","payee"),karim=P("كريم — جار","person"),amina=P("أمينة — أخت","person"),shop=P("سوق المدينة","payee");
 var IT=[["طماطم","Tomate","veg","كغ",120],["بطاطا","Pomme de terre","veg","كغ",70],["بصل","Oignon","veg","كغ",90],
  ["خبز","Pain","bread","حبة",15],["حليب","Lait","food","لتر",110],["زيت المائدة","Huile","food","لتر",650],
  ["دجاج","Poulet","meat","كغ",480],["بيض","Œufs","food","علبة",420],["سميد","Semoule","food","كغ",95],
  ["سكر","Sucre","food","كغ",110],["قهوة","Café","food","غ",18],["سردين","Sardine","meat","كغ",400]];
 var iid={},iunit={},icat={};
 IT.forEach(function(x){var id=uid("it");iid[x[0]]=id;iunit[x[0]]=x[3];icat[x[0]]=x[2];
  lg.items.push({id:id,name:x[0],nameFr:x[1],categoryId:x[2],unit:x[3],brand:"",note:"",status:"ACTIVE",createdAt:D.now()});
  for(var m=-4;m<=0;m++)lg.prices.push({id:uid("pr"),itemId:id,store:m%2?"سوق المدينة":"دكان الحي",
   amount:M.c(Math.round(x[4]*(1+m*0.018+(m%2?0.02:-0.01)))),unit:x[3],on:D.mr(mk(m)).start,source:"شراء فعلي",createdAt:D.now()})});
 var rentId="cm_rent";
 lg.commitments.push({id:rentId,name:"إيجار الشقة",amount:M.c(25000),anchorDay:5,startOn:D.mr(mk(-4)).start,
  endOn:null,categoryId:"home",payeeId:landlord,graceDays:3,status:"ACTIVE",note:"",createdAt:D.now()});
 for(var m=-4;m<=0;m++){var k=mk(m),pay=D.mo(k,18);
  if(pay<=t)post(lg,{type:"INC",amount:M.c(65000),sourceId:"salary",occurredOn:pay,opId:O(),title:"راتب "+D.ml(k)});
  if(m<=-1&&D.mo(k,22)<=t)post(lg,{type:"INC",amount:M.c(8000+(m+4)*1500),sourceId:"side",occurredOn:D.mo(k,22),opId:O(),title:"نشاط جانبي"});
  [[12,1800,"util",sonel,"كهرباء"],[14,900,"util",seaal,"ماء"],[20,2200,"net",at,"إنترنت"]].forEach(function(u){
   var on=D.mo(k,u[0]);if(on<=t)post(lg,{type:"EXP",amount:M.c(u[1]),categoryId:u[2],occurredOn:on,opId:O(),title:u[4],partyId:u[3]})});
  [3,8,13,19,24,28].forEach(function(day,i){var on=D.mo(k,day);if(on>t)return;
   var ls=[["طماطم",2000,120],["بطاطا",3000,70],["بصل",1000,90],["خبز",i%2?4000:6000,15],["حليب",2000,110],["بيض",1000,420]].slice(0,3+(i%4));
   if(i%3===0)ls.push(["دجاج",1500,480]);if(i%4===1)ls.push(["زيت المائدة",1000,650]);
   var pl=ls.map(function(x){var q=x[1],p=M.c(x[2]);
    return{itemId:iid[x[0]],name:x[0],unit:iunit[x[0]],qty:q,price:p,total:M.ln(q,p),categoryId:icat[x[0]]}});
   var tot=M.sum(pl.map(function(x){return x.total})),iv=uid("iv");
   var r=post(lg,{type:"EXP",amount:tot,categoryId:pl[0].categoryId,occurredOn:on,opId:O(),
    title:"مشتريات السوق",partyId:shop,invoiceId:iv,note:pl.length+" عناصر"});
   lg.invoices.push({id:iv,txId:r.txId,store:"سوق المدينة",on:on,detailed:true,lines:pl,total:tot,createdAt:D.now()});
   pl.forEach(function(x){lg.prices.push({id:uid("pr"),itemId:x.itemId,store:"سوق المدينة",amount:x.price,
    unit:x.unit,on:on,source:"فاتورة",createdAt:D.now()})})});
  var tr=D.mo(k,10);if(tr<=t)post(lg,{type:"EXP",amount:M.c(1400),categoryId:"transport",occurredOn:tr,opId:O(),title:"وقود"});
  var cl=D.mo(k,22);if(cl<=t&&m%2===0)post(lg,{type:"EXP",amount:M.c(4500),categoryId:"clothes",occurredOn:cl,opId:O(),title:"ملابس"});
  var hl=D.mo(k,16);if(hl<=t&&m===-2)post(lg,{type:"EXP",amount:M.c(3200),categoryId:"health",occurredOn:hl,opId:O(),title:"دواء"});}
 materialize(lg,45);
 lg.occurrences.filter(function(o){return o.dueOn<t}).forEach(function(o,i){if(i%3===2)return;
  var part=i%4===1?M.c(20000):o.amount;
  post(lg,{type:"EXP",amount:part,categoryId:"home",occurredOn:D.add(o.dueOn,i%4===1?7:1),opId:O(),
   title:"إيجار — "+D.ml(o.periodKey),partyId:landlord,occurrenceId:o.id})});
 var g1=uid("gl"),g2=uid("gl"),g3=uid("gl");
 lg.goals.push({id:g1,name:"هاتف جديد",icon:"📱",target:M.c(90000),startOn:D.mr(mk(-4)).start,dueOn:D.am(D.mk(t),3)+"-01",status:"ACTIVE",note:"",createdAt:D.now()});
 lg.goals.push({id:g2,name:"صندوق الطوارئ",icon:"🛡",target:M.c(200000),startOn:D.mr(mk(-4)).start,dueOn:null,status:"ACTIVE",note:"3 أشهر مصاريف",createdAt:D.now()});
 lg.goals.push({id:g3,name:"سفر الصيف",icon:"✈",target:M.c(120000),startOn:D.mr(mk(-2)).start,dueOn:D.am(D.mk(t),5)+"-01",status:"ACTIVE",note:"",createdAt:D.now()});
 for(var n=-4;n<=0;n++){var on=D.mo(mk(n),21);if(on>t)continue;
  alloc(lg,{goalId:g1,amount:M.c(6000),occurredOn:on,opId:O(),note:"مساهمة شهرية",unfunded:true});
  alloc(lg,{goalId:g2,amount:M.c(8000),occurredOn:on,opId:O(),note:"مساهمة شهرية",unfunded:true});
  if(n>=-2)alloc(lg,{goalId:g3,amount:M.c(4000),occurredOn:on,opId:O(),note:"",unfunded:true})}
 [["food",18000],["veg",12000],["meat",9000],["transport",6000],["home",25000],["net",2500],["fun",4000]].forEach(function(b){
  var c=CATS.filter(function(x){return x[0]===b[0]})[0];
  lg.budgets.push({id:uid("bd"),name:c[1],categoryId:b[0],amount:M.c(b[1]),
   periodStart:D.mr(D.mk(t)).start,periodEnd:D.mr(D.mk(t)).end,note:"",createdAt:D.now()})});
 post(lg,{type:"BRW",amount:M.c(40000),partyId:karim,occurredOn:D.mo(mk(-3),7),opId:O(),title:"قرض من كريم",note:"بدون فوائد"});
 post(lg,{type:"DPY",amount:M.c(10000),principal:M.c(10000),fees:0,partyId:karim,occurredOn:D.mo(mk(-1),9),opId:O(),title:"تسديد لكريم"});
 post(lg,{type:"LND",amount:M.c(15000),partyId:amina,occurredOn:D.mo(mk(-2),15),opId:O(),title:"إقراض أمينة"});
 post(lg,{type:"COL",amount:M.c(5000),partyId:amina,occurredOn:D.mo(mk(0),3),opId:O(),title:"تحصيل من أمينة"});
 lg.commitments.push({id:uid("cm"),name:"اشتراك نادي",amount:M.c(3000),anchorDay:25,startOn:D.mr(mk(-2)).start,
  endOn:null,categoryId:"fun",payeeId:null,graceDays:2,status:"ACTIVE",note:"",createdAt:D.now()});
 materialize(lg,45);
 var tgt=null;for(var z=0;z<lg.transactions.length;z++)if(lg.transactions[z].type==="EXP"&&lg.transactions[z].categoryId==="clothes")tgt=lg.transactions[z];
 var ron=D.mo(mk(-1),26);
 if(tgt&&ron<=t)post(lg,{type:"REF",amount:M.c(1500),categoryId:"clothes",originalTxId:tgt.id,occurredOn:ron,opId:O(),title:"استرجاع قطعة ملابس"});
 return lg}
/* ══════════ 6. الحالة والأدوات ══════════ */
var LG=null,route="home",sub="",busy=false,snap=null;
var ui={q:"",filter:"all",sort:"new",bulk:false,sel:{},rep:"flow",dt:"debt",inv:[],per:null,cust:null};
var PAL=["#E0A458","#5FBF7F","#D96C6C","#5B8FF9","#9B7EDE","#4ECDC4","#F06292","#C9A227","#7986CB","#FF8A65","#A1887F","#BA68C8","#90A4AE","#6C8EBF","#8FA0B8"];
function $(i){return document.getElementById(i)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function F(c){return M.f(c,{cur:true})}function N(c){return M.f(c)}
function cat(id){var a=LG.settings.categories;for(var i=0;i<a.length;i++)if(a[i][0]===id)return a[i];return["other","أخرى","📦","#8FA0B8"]}
function src(id){var a=LG.settings.sources;for(var i=0;i<a.length;i++)if(a[i][0]===id)return a[i];return["other","أخرى","📥"]}
function party(id){return find(LG.parties,id)}function goal(id){return find(LG.goals,id)}
function today(){return D.today()}
function per(){if(ui.cust)return{start:ui.cust.start,end:ui.cust.end,label:"فترة مخصصة",key:"custom"};
 var k=ui.per||LG.settings.period||"month";
 return k==="cycle"?D.cyc(today(),LG.settings.payday||18):D.per(k,today(),LG.settings.weekStart)}
function oid(){return"op_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function clone(o){return JSON.parse(JSON.stringify(o))}
function commit(fn,msg,undo){if(busy)return false;busy=true;snap=clone(LG);var r;
 try{r=fn(LG)}catch(e){busy=false;snap=null;toast(e.message||"تعذّر التنفيذ","err");return false}
 render();
 return save(LG).then(function(){busy=false;var s=snap;snap=null;
  if(msg)toast(msg,"ok",undo?function(){LG=s;render();save(LG).then(function(){toast("تم التراجع","ok")})}:null);
  return r===undefined?true:r},function(e){LG=snap;snap=null;busy=false;render();
  toast("فشل الحفظ — لم يتغيّر شيء: "+(e.message||""),"err");return false})}
var tt=null;
function toast(m,k,u){var t=$("tst");t.className="tst on "+(k||"");
 t.innerHTML="<span>"+esc(m)+"</span>"+(u?'<button class="un" id="ub">تراجع</button>':"");
 if(u)$("ub").onclick=function(){t.classList.remove("on");u()};
 clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("on")},u?6500:3000)}
function scrim(on){$("scrim").classList.toggle("on",!!on)}
function closeAll(){$("drw").classList.remove("on");$("mdl").classList.remove("on");$("sht").classList.remove("on");scrim(false)}
function drw(ti,b){$("drw").innerHTML='<div class="dh"><h3>'+esc(ti)+'</h3><button class="ico" data-a="close">✕</button></div><div class="db">'+b+'</div>';
 $("drw").classList.add("on");scrim(true);$("drw").scrollTop=0}
function mdl(ti,su,b,f){$("mdl").innerHTML='<div class="mh"><h3>'+esc(ti)+'</h3>'+(su?'<p>'+esc(su)+'</p>':"")+'</div><div class="mb">'+b+'</div><div class="mf">'+f+'</div>';
 $("mdl").classList.add("on");scrim(true);$("mdl").scrollTop=0;
 var x=$("mdl").querySelector("input,select,textarea");if(x)setTimeout(function(){x.focus()},120)}
function sht(h){$("sht").innerHTML='<div class="grb"></div>'+h;$("sht").classList.add("on");scrim(true)}
/* ══════════ 7. نموذج عام ══════════ */
function form(cfg){var fs=cfg.fields;
 var body=fs.map(function(f){var id="f_"+f.k,v=f.val==null?"":f.val;
  if(f.t==="pick")return'<div class="fl" data-w="'+f.k+'"><label>'+esc(f.label)+'</label><div class="pk" data-p="'+f.k+'">'+
   f.opts.map(function(o){return'<button type="button" data-v="'+esc(o[0])+'"'+(String(o[0])===String(v)?' class="on"':"")+'>'+esc(o[1])+'</button>'}).join("")+
   '</div><input type="hidden" id="'+id+'" value="'+esc(v)+'">'+(f.hint?'<div class="ht">'+esc(f.hint)+'</div>':"")+'<div class="fe" hidden></div></div>';
  if(f.t==="select")return'<div class="fl" data-w="'+f.k+'"><label>'+esc(f.label)+'</label><select id="'+id+'">'+
   f.opts.map(function(o){return'<option value="'+esc(o[0])+'"'+(String(o[0])===String(v)?" selected":"")+'>'+esc(o[1])+'</option>'}).join("")+
   '</select>'+(f.hint?'<div class="ht">'+esc(f.hint)+'</div>':"")+'<div class="fe" hidden></div></div>';
  if(f.t==="area")return'<div class="fl" data-w="'+f.k+'"><label>'+esc(f.label)+'</label><textarea id="'+id+'" placeholder="'+esc(f.ph||"")+'">'+esc(v)+'</textarea><div class="fe" hidden></div></div>';
  if(f.t==="tog")return'<div class="sw"><div><b>'+esc(f.label)+'</b>'+(f.hint?'<small>'+esc(f.hint)+'</small>':"")+'</div><button type="button" class="tg'+(v?" on":"")+'" data-g="'+f.k+'"></button><input type="hidden" id="'+id+'" value="'+(v?1:"")+'"></div>';
  var ty=f.t==="money"?"text":(f.t||"text"),im=f.t==="money"?' inputmode="decimal"':(f.t==="number"?' inputmode="numeric"':"");
  return'<div class="fl" data-w="'+f.k+'"><label>'+esc(f.label)+'</label><input id="'+id+'" type="'+ty+'"'+im+
   ' value="'+esc(v)+'" placeholder="'+esc(f.ph||"")+'">'+(f.hint?'<div class="ht">'+esc(f.hint)+'</div>':"")+'<div class="fe" hidden></div></div>'}).join("");
 mdl(cfg.title,cfg.sub,body+(cfg.extra||""),'<button class="btn" data-a="close">إلغاء</button><button class="btn p" id="ok">'+esc(cfg.ok||"حفظ")+'</button>');
 var mp=$("mdl");
 mp.querySelectorAll("[data-p]").forEach(function(p){p.querySelectorAll("button").forEach(function(b){
  b.onclick=function(){p.querySelectorAll("button").forEach(function(x){x.classList.remove("on")});
   b.classList.add("on");$("f_"+p.dataset.p).value=b.dataset.v}})});
 mp.querySelectorAll("[data-g]").forEach(function(t){t.onclick=function(){
  var i=$("f_"+t.dataset.g);i.value=i.value?"":"1";t.classList.toggle("on",!!i.value)}});
 function fail(k,m){var w=mp.querySelector('[data-w="'+k+'"]');if(!w)return;
  w.classList.add("bad");var e=w.querySelector(".fe");if(e){e.textContent=m;e.hidden=false}}
 $("ok").onclick=function(){var vals={},bad=false;
  mp.querySelectorAll(".fl").forEach(function(w){w.classList.remove("bad");var e=w.querySelector(".fe");if(e)e.hidden=true});
  fs.forEach(function(f){var el=$("f_"+f.k),v=el?el.value:"";
   if(f.t==="money"){try{v=M.c(v||"0")}catch(err){fail(f.k,err.message);bad=true;return}
    if(f.min!=null&&v<f.min){fail(f.k,"المبلغ غير صالح");bad=true;return}}
   else if(f.t==="number"){v=Number(v);if(!isFinite(v)){fail(f.k,"رقم غير صالح");bad=true;return}}
   else if(f.t==="tog")v=!!v;
   else if(f.t==="date"){if(!D.ok(v)){fail(f.k,"تاريخ غير صالح");bad=true;return}}
   else v=String(v).trim();
   if(f.req&&(v===""||v==null||(f.t==="money"&&v===0))){fail(f.k,"هذا الحقل مطلوب");bad=true;return}
   vals[f.k]=v});
  if(bad)return;
  var r=cfg.onSubmit(vals);
  if(r&&r.errors){Object.keys(r.errors).forEach(function(k){fail(k,r.errors[k])});return}
  if(r!==false)closeAll()}}
function catOpts(){return LG.settings.categories.map(function(c){return[c[0],c[2]+" "+c[1]]})}
function srcOpts(){return LG.settings.sources.map(function(s){return[s[0],s[2]+" "+s[1]]})}
function pOpts(){return LG.parties.map(function(p){return[p.id,p.name]})}
/* ══════════ 8. الرسوم ══════════ */
function ring(p,col,sz){sz=sz||56;var r=(sz-8)/2,c=2*Math.PI*r,x=Math.max(0,Math.min(1,p||0));
 return'<div class="ring" style="width:'+sz+'px;height:'+sz+'px"><svg width="'+sz+'" height="'+sz+'">'+
 '<circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="var(--ln2)" stroke-width="5"/>'+
 '<circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+(c*(1-x))+'" style="transition:stroke-dashoffset .6s"/></svg></div>'}
function bars(dt){var h=150,w=340,n=dt.length||1,g=10,bw=Math.max(8,(w-g*(n-1))/n/2-3);
 var mx=Math.max.apply(null,[1].concat(dt.map(function(d){return Math.max(d.income,d.expense)})));
 var s='<svg class="ch" viewBox="0 0 '+w+' '+(h+26)+'">';
 for(var i=0;i<=3;i++){var y=h-h*i/3;s+='<line x1="0" y1="'+y+'" x2="'+w+'" y2="'+y+'" stroke="var(--ln)" stroke-dasharray="3 4"/>'}
 dt.forEach(function(d,i){var x=i*(w/n),hi=h*d.income/mx,he=h*d.expense/mx;
  s+='<rect x="'+(x+bw/2)+'" y="'+(h-hi)+'" width="'+bw+'" height="'+Math.max(1,hi)+'" rx="4" fill="url(#gi)"><title>دخل '+F(d.income)+'</title></rect>';
  s+='<rect x="'+(x+bw*1.7)+'" y="'+(h-he)+'" width="'+bw+'" height="'+Math.max(1,he)+'" rx="4" fill="url(#ge)"><title>مصروف '+F(d.expense)+'</title></rect>';
  s+='<text x="'+(x+w/n/2)+'" y="'+(h+17)+'" text-anchor="middle" font-size="10" fill="var(--mut)">'+esc(d.label)+'</text>'});
 return s+'<defs><linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2FC79B"/><stop offset="1" stop-color="#159A75"/></linearGradient>'+
 '<linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F08A8A"/><stop offset="1" stop-color="#D96C6C"/></linearGradient></defs></svg>'}
function area(pts){var h=140,w=340;if(!pts.length)return"";
 var vs=pts.map(function(p){return p.v}),mx=Math.max.apply(null,vs.concat([1])),mn=Math.min.apply(null,vs.concat([0])),rg=mx-mn||1;
 var X=function(i){return pts.length<2?w/2:i*w/(pts.length-1)},Y=function(v){return h-((v-mn)/rg)*(h-14)-7};
 var d="",ar="";pts.forEach(function(p,i){d+=(i?" L":"M")+X(i)+" "+Y(p.v)});
 ar=d+" L"+X(pts.length-1)+" "+h+" L"+X(0)+" "+h+" Z";
 var s='<svg class="ch" viewBox="0 0 '+w+' '+(h+24)+'"><path d="'+ar+'" fill="url(#ga)"/><path d="'+d+'" fill="none" stroke="var(--gold)" stroke-width="2.4" stroke-linejoin="round"/>';
 pts.forEach(function(p,i){s+='<circle cx="'+X(i)+'" cy="'+Y(p.v)+'" r="3.4" fill="var(--navy)" stroke="var(--gold)" stroke-width="2"><title>'+esc(p.label)+": "+F(p.v)+'</title></circle>'+
  '<text x="'+X(i)+'" y="'+(h+16)+'" text-anchor="middle" font-size="10" fill="var(--mut)">'+esc(p.label)+'</text>'});
 return s+'<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6B779" stop-opacity=".34"/><stop offset="1" stop-color="#D6B779" stop-opacity="0"/></linearGradient></defs></svg>'}
function donut(es,tot){var R=64,r=42,cx=80,cy=80,a=-Math.PI/2,s='<svg class="ch" viewBox="0 0 160 160" style="max-width:190px;margin:0 auto">';
 if(!es.length)s+='<circle cx="80" cy="80" r="64" fill="none" stroke="var(--ln)" stroke-width="22"/>';
 es.forEach(function(e){var fr=e.value/tot,an=fr*Math.PI*2,b=a+an,lg2=an>Math.PI?1:0;
  var x1=cx+R*Math.cos(a),y1=cy+R*Math.sin(a),x2=cx+R*Math.cos(b),y2=cy+R*Math.sin(b),
   x3=cx+r*Math.cos(b),y3=cy+r*Math.sin(b),x4=cx+r*Math.cos(a),y4=cy+r*Math.sin(a);
  if(fr>1e-4)s+='<path d="M'+x1+' '+y1+' A'+R+' '+R+' 0 '+lg2+' 1 '+x2+' '+y2+' L'+x3+' '+y3+' A'+r+' '+r+' 0 '+lg2+' 0 '+x4+' '+y4+' Z" fill="'+e.color+'" opacity=".92"><title>'+esc(e.name)+" "+F(e.value)+'</title></path>';
  a=b});
 return s+'<text x="80" y="76" text-anchor="middle" font-size="10" fill="var(--mut)">الإجمالي</text>'+
 '<text x="80" y="94" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">'+esc(M.sh(tot))+'</text></svg>'}
/* ══════════ 9. العرض ══════════ */
function render(){var p=per();
 $("demo").hidden=!LG.settings.demo;
 document.body.classList.toggle("light",LG.settings.theme==="light");
 $("tico").textContent=LG.settings.theme==="light"?"☀":"◐";
 var html;
 try{html=route==="more"&&sub?vSub():({home:vHome,tx:vTx,reports:vRep,more:vMore}[route]||vHome)(p)}
 catch(e){html='<div class="al bad"><span class="ai">✕</span><div><b>خطأ في العرض</b><small>'+esc(e.message)+'</small></div></div>'+
  '<button class="btn p w" data-a="go" data-to="home">العودة للرئيسية</button>'}
 $("app").innerHTML='<div class="v">'+html+'</div>';
 document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.dataset.to===route)});
 var d=$("tdy");if(d)d.textContent=D.full(today())}
function hd(ti,su,dt){return'<div class="hd"><div>'+(dt?'<div class="dt" id="tdy">'+esc(D.full(today()))+'</div>':"")+
 '<h1>'+esc(ti)+'</h1>'+(su?'<p>'+esc(su)+'</p>':"")+'</div></div>'}
function pchips(){var cur=ui.cust?"custom":(ui.per||LG.settings.period||"month");
 var o=[["today","اليوم"],["week","الأسبوع"],["month","الشهر"],["lastMonth","السابق"],["cycle","دورة الراتب"],["year","السنة"],["all","الكل"]];
 return'<div class="chips">'+o.map(function(x){return'<button class="chip'+(cur===x[0]?" on":"")+'" data-a="per" data-k="'+x[0]+'">'+x[1]+'</button>'}).join("")+
 '<button class="chip'+(cur==="custom"?" on":"")+'" data-a="cust">⚙ مخصص</button></div>'}
function emp(ti,su,btn,act){return'<div class="emp"><span class="ei">◌</span><b>'+esc(ti)+'</b>'+esc(su)+
 (btn?'<div style="margin-top:14px"><button class="btn p sm" data-a="'+act+'">'+esc(btn)+'</button></div>':"")+'</div>'}
function budStat(){var r=D.mr(D.mk(today()));
 return LG.budgets.map(function(b){var sp=0;
  for(var i=0;i<LG.lines.length;i++){var l=LG.lines[i];
   if(l.account!=="EXP"||l.sub!==b.categoryId||l.occurredOn<r.start||l.occurredOn>r.end)continue;
   sp+=l.side===DR?l.amount:-l.amount}
  return Object.assign({},b,{spent:sp,left:b.amount-sp,pct:b.amount?sp/b.amount:0})})}
function visTx(){var a=LG.transactions.slice(),mp={income:["INC"],expense:["EXP"],refund:["REF"],
  debt:["BRW","DPY","FRG"],recv:["LND","COL","WOF"],other:["ADJ","REV"]};
 if(ui.filter!=="all")a=a.filter(function(t){return(mp[ui.filter]||[]).indexOf(t.type)>=0});
 if(ui.q){var q=ui.q.trim().toLowerCase();
  a=a.filter(function(t){var pn=t.partyId?(party(t.partyId)||{name:""}).name:"";
   return(t.title||"").toLowerCase().indexOf(q)>=0||(t.note||"").toLowerCase().indexOf(q)>=0||pn.toLowerCase().indexOf(q)>=0})}
 var s=ui.sort;
 a.sort(function(x,y){return s==="old"?(x.occurredOn<y.occurredOn?-1:x.occurredOn>y.occurredOn?1:x.createdAt<y.createdAt?-1:1)
  :s==="big"?y.amount-x.amount:s==="small"?x.amount-y.amount
  :(x.occurredOn>y.occurredOn?-1:x.occurredOn<y.occurredOn?1:x.createdAt>y.createdAt?-1:1)});
 return a}
function txRow(t){var inc=INC_T.indexOf(t.type)>=0,c=t.categoryId?cat(t.categoryId):null;
 var ic=t.type==="INC"?src(t.sourceId)[2]:(c?c[2]:(t.type==="REF"?"↩":t.type==="BRW"||t.type==="DPY"?"🤝":t.type==="LND"||t.type==="COL"?"🫱":t.type==="ADJ"?"⚖":"↺"));
 var col=t.type==="INC"?"var(--em2)":t.type==="REF"?"var(--teal)":t.type==="EXP"?"var(--cor2)":"var(--gold2)";
 var su=[D.dn(t.occurredOn)+" "+t.occurredOn,LBL[t.type]];
 if(t.partyId)su.push((party(t.partyId)||{name:""}).name);
 if(t.status==="REVERSED")su.push("معكوسة");
 if(t.goalId)su.push("هدف: "+(goal(t.goalId)||{name:""}).name);
 var sel=!!ui.sel[t.id];
 return'<div class="row'+(t.status==="REVERSED"?" rv":"")+(sel?" sel":"")+'">'+
 (ui.bulk?'<button class="ri" data-a="bsel" data-id="'+t.id+'" style="border-color:'+(sel?"var(--gold)":"var(--ln)")+';color:'+(sel?"var(--gold)":"var(--fnt)")+'">'+(sel?"✓":"")+'</button>':"")+
 '<button class="ri" data-a="tx" data-id="'+t.id+'" style="color:'+col+'">'+ic+'</button>'+
 '<button class="rm" data-a="tx" data-id="'+t.id+'"><b>'+esc(t.title)+'</b><small>'+esc(su.join(" · "))+'</small></button>'+
 '<button class="ra" data-a="tx" data-id="'+t.id+'" style="color:'+col+'">'+(inc?"+":"−")+N(t.amount)+'<small>دج</small></button></div>'}
function cmName(o){var c=find(LG.commitments,o.commitmentId);return c?c.name:"التزام"}
function vHome(p){var P=pos(LG),f=flow(LG,p.start,p.end),now=p.end>=today(),sh=now?P:pos(LG,p.end);
 var occ=LG.occurrences.filter(function(o){return["DUE","OVERDUE","PARTIAL","SCHEDULED"].indexOf(o.status)>=0});
 var over=occ.filter(function(o){return o.status==="OVERDUE"});
 var soon=occ.filter(function(o){return o.status!=="OVERDUE"&&o.dueOn<=D.add(today(),7)});
 var gs=LG.goals.filter(function(g){return g.status==="ACTIVE"}),bs=budStat(),ob=bs.filter(function(b){return b.spent>b.amount});
 var h=hd("ملخصك المالي",null,true)+pchips();
 if(!now)h+='<div class="al info"><span class="ai">◷</span><div><b>عرض فترة سابقة</b><small>الأرصدة أدناه رصيد نهاية '+esc(p.end)+' وليست رصيدك الحالي.</small></div></div>';
 h+='<article class="hero"><div class="lb">'+(now?"النقد الفعلي الآن":"النقد في نهاية الفترة")+'</div>'+
 '<button class="big'+(sh.cash<0?" n":"")+'" data-a="cash">'+N(sh.cash)+'<small>دج</small></button>'+
 '<div class="sp"><button data-a="avail"><span>المتاح للإنفاق</span><b class="e">'+N(sh.available)+'</b></button>'+
 '<button data-a="go" data-to="more" data-sub="savings"><span>مخصص للادخار</span><b class="g">'+N(sh.reserved)+'</b></button></div>'+
 '<div class="nw"><span>صافي الثروة = نقد + حقوق − ديون</span><b>'+N(sh.net)+' دج</b></div></article>';
 if(sh.gap>0)h+='<button class="al warn" data-a="go" data-to="more" data-sub="savings"><span class="ai">⚠</span><div><b>أهداف غير ممولة بمقدار '+F(sh.gap)+'</b><small>التخصيص أكبر من النقد المتاح — لا يُعرض كمال موجود.</small></div></button>';
 if(sh.cash<0)h+='<div class="al bad"><span class="ai">⚠</span><div><b>النقد سالب</b><small>راجع دخلاً غير مسجّل أو مصروفاً مكرراً.</small></div></div>';
 h+='<div class="g2" style="margin-bottom:6px">'+
 '<button class="met" data-a="fl" data-k="income"><span>دخل '+esc(p.label)+'</span><b class="pos">'+N(f.income)+'</b><small>اضغط للتفاصيل</small></button>'+
 '<button class="met" data-a="fl" data-k="expense"><span>مصروف '+esc(p.label)+'</span><b class="neg">'+N(f.expense)+'</b><small>اضغط للتفاصيل</small></button></div>';
 h+='<div class="g3" style="margin-top:11px">'+
 '<button class="met" data-a="go" data-to="more" data-sub="debts"><span>ديون عليّ</span><b class="neg" style="font-size:16px">'+N(P.debt)+'</b></button>'+
 '<button class="met" data-a="go" data-to="more" data-sub="debts"><span>حقوق لي</span><b class="pos" style="font-size:16px">'+N(P.recv)+'</b></button>'+
 '<button class="met" data-a="go" data-to="more" data-sub="commit"><span>التزامات مفتوحة</span><b class="gld" style="font-size:16px">'+occ.length+'</b></button></div>';
 if(over.length||soon.length||ob.length){h+='<div class="sec"><h2>يحتاج انتباهك</h2></div>';
  if(over.length)h+='<button class="al bad" data-a="go" data-to="more" data-sub="commit"><span class="ai">⏰</span><div><b>'+over.length+' التزام متأخر — '+F(over.reduce(function(s,o){return s+o.amount-o.paid},0))+'</b><small>'+esc(over.slice(0,2).map(cmName).join("، "))+'</small></div></button>';
  if(soon.length)h+='<button class="al warn" data-a="go" data-to="more" data-sub="commit"><span class="ai">◷</span><div><b>'+soon.length+' التزام خلال 7 أيام — '+F(soon.reduce(function(s,o){return s+o.amount-o.paid},0))+'</b><small>أقربها '+esc(soon.slice().sort(function(a,b){return a.dueOn<b.dueOn?-1:1})[0].dueOn)+'</small></div></button>';
  if(ob.length)h+='<button class="al warn" data-a="go" data-to="more" data-sub="budgets"><span class="ai">📊</span><div><b>'+ob.length+' ميزانية متجاوزة</b><small>'+esc(ob.map(function(b){return b.name}).join("، "))+' — التجاوز لا ينشئ ديناً ولا يخصم نقداً.</small></div></button>'}
 if(gs.length){h+='<div class="sec"><h2>أهداف الادخار</h2><button class="lnk" data-a="go" data-to="more" data-sub="savings">إدارة</button></div><div class="rows stg">';
  gs.slice(0,3).forEach(function(g){var b=gbal(LG,g.id),pc=g.target?b/g.target:0;
   h+='<button class="goal" data-a="goal" data-id="'+g.id+'">'+ring(pc,pc>=1?"var(--em2)":"var(--gold)")+
   '<div class="gi"><b>'+esc(g.icon||"🎯")+" "+esc(g.name)+'</b><small>'+N(b)+(g.target?" من "+N(g.target):"")+' دج</small>'+
   '<div class="bar"><i style="width:'+Math.min(100,pc*100)+'%;background:linear-gradient(90deg,var(--gold),var(--em2))"></i></div></div>'+
   '<div class="gv">'+Math.round(pc*100)+'%</div></button>'});h+='</div>'}
 if(bs.length){h+='<div class="sec"><h2>ميزانيات الشهر</h2><button class="lnk" data-a="go" data-to="more" data-sub="budgets">الكل</button></div><div class="card">';
  bs.slice(0,4).forEach(function(b){var pc=b.amount?b.spent/b.amount:0,c=pc>1?"var(--cor)":pc>.8?"var(--amb)":"var(--em2)";
   h+='<button data-a="bud" data-id="'+b.id+'" style="width:100%;text-align:start;margin-bottom:11px;display:block">'+
   '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px"><span>'+esc(cat(b.categoryId)[2])+" "+esc(b.name)+'</span>'+
   '<b style="font-family:var(--nm);color:'+c+'">'+N(b.spent)+' / '+N(b.amount)+'</b></div>'+
   '<div class="bar"><i style="width:'+Math.min(100,pc*100)+'%;background:'+c+'"></i></div>'+
   '<div class="pg"><span>'+Math.round(pc*100)+'% مستهلك</span><span>'+(b.left<0?"تجاوز "+N(-b.left):"متبقٍ "+N(b.left))+' دج</span></div></button>'});h+='</div>'}
 var rc=visTx().slice(0,5);
 h+='<div class="sec"><h2>آخر الحركات</h2><button class="lnk" data-a="go" data-to="tx">عرض الكل</button></div>';
 return h+(rc.length?'<div class="rows stg">'+rc.map(txRow).join("")+'</div>':emp("لا حركات بعد","ابدأ بتسجيل دخل أو مصروف من زر ＋","إضافة عملية","add"))}
function vTx(){var ls=visTx();
 var h=hd("الحركات","كل حركة مسجّلة مرة واحدة ومشتقة من قيد متوازن.");
 h+='<div class="tb"><div class="srch"><span>⌕</span><input id="q" placeholder="ابحث بالعنوان أو الملاحظة أو الجهة…" value="'+esc(ui.q)+'"></div>'+
 '<select class="sl" id="srt">'+[["new","الأحدث"],["old","الأقدم"],["big","الأكبر مبلغاً"],["small","الأصغر مبلغاً"]].map(function(o){
  return'<option value="'+o[0]+'"'+(ui.sort===o[0]?" selected":"")+'>'+o[1]+'</option>'}).join("")+'</select>'+
 '<button class="btn sm'+(ui.bulk?" p":"")+'" data-a="bulk">'+(ui.bulk?"إلغاء":"تحديد")+'</button></div>';
 h+='<div class="chips">'+[["all","الكل"],["income","دخل"],["expense","مصروف"],["refund","استرجاع"],["debt","ديون"],["recv","حقوق"],["other","تسويات وعكس"]]
 .map(function(o){return'<button class="chip'+(ui.filter===o[0]?" on":"")+'" data-a="flt" data-k="'+o[0]+'">'+o[1]+'</button>'}).join("")+'</div>';
 var ns=Object.keys(ui.sel);
 if(ui.bulk&&ns.length)h+='<div class="bulk"><b>'+ns.length+'</b> محددة<span class="s"></span>'+
 '<button class="btn sm" data-a="ball">تحديد الكل</button><button class="btn sm d" data-a="brev">عكس المحدد</button></div>';
 var sm=ls.reduce(function(a,t){if(t.status==="REVERSED")return a;
  a[INC_T.indexOf(t.type)>=0?0:1]+=t.amount;return a},[0,0]);
 h+='<div class="g2" style="margin:10px 0 14px"><div class="met"><span>مجموع الداخل</span><b class="pos">'+N(sm[0])+'</b></div>'+
 '<div class="met"><span>مجموع الخارج</span><b class="neg">'+N(sm[1])+'</b></div></div>';
 return h+(ls.length?'<div class="rows" id="txls">'+ls.slice(0,300).map(txRow).join("")+'</div>'+
 (ls.length>300?'<div class="emp" style="margin-top:10px">عرض أول 300 من '+ls.length+' — ضيّق البحث للبقية</div>':"")
 :emp("لا نتائج","جرّب تغيير البحث أو المرشّح","إضافة عملية","add"))}
function vRep(p){var P=pos(LG),f=flow(LG,p.start,p.end),ms=[],i;
 for(i=5;i>=0;i--)ms.push(D.am(D.mk(today()),-i));
 var se=ms.map(function(k){var r=D.mr(k),fl=flow(LG,r.start,r.end);
  return{label:D.ms(k),key:k,income:fl.income,expense:fl.expense,cash:rebuild(LG,r.end).nat.CASH}});
 var h=hd("التقارير والتحليل","كل رقم هنا يمكن تتبعه إلى سجلاته الأصلية.");
 h+='<div class="t2">'+[["flow","التدفق"],["cats","التصنيفات"],["trend","التطور"],["ins","تحليل"]]
 .map(function(o){return'<button class="'+(ui.rep===o[0]?"on":"")+'" data-a="rep" data-k="'+o[0]+'">'+o[1]+'</button>'}).join("")+'</div>';
 if(ui.rep==="flow"){h+=pchips();
  h+='<div class="card"><div class="sec" style="margin:0 0 12px"><h2>آخر 6 أشهر</h2><span style="font-size:10.5px;color:var(--mut)">أخضر دخل · أحمر مصروف</span></div>'+bars(se)+'</div>';
  h+='<div class="g3" style="margin-top:12px"><div class="met"><span>دخل الفترة</span><b class="pos" style="font-size:16px">'+N(f.income)+'</b></div>'+
  '<div class="met"><span>مصروف الفترة</span><b class="neg" style="font-size:16px">'+N(f.expense)+'</b></div>'+
  '<div class="met"><span>الصافي</span><b class="'+(f.net>=0?"pos":"neg")+'" style="font-size:16px">'+N(f.net)+'</b></div></div>';
  h+='<div class="sec"><h2>مقارنة الأشهر</h2></div><div class="card">';
  se.slice().reverse().forEach(function(s){var nt=s.income-s.expense;
   h+='<button class="kv" data-a="mon" data-k="'+s.key+'"><span>'+esc(D.ml(s.key))+'</span><b><span class="pos">'+N(s.income)+'</span> / <span class="neg">'+N(s.expense)+'</span> = <span class="'+(nt>=0?"pos":"neg")+'">'+N(nt)+'</span></b></button>'});
  h+='</div>';
  var ss=Object.keys(f.bySrc).map(function(k){return[k,f.bySrc[k]]}).filter(function(e){return e[1]>0}).sort(function(a,b){return b[1]-a[1]});
  if(ss.length){h+='<div class="sec"><h2>الدخل حسب المصدر</h2></div><div class="card"><div class="lgd">'+
   ss.map(function(e,i){var s=src(e[0]);return'<button class="lg" data-a="srcd" data-id="'+esc(e[0])+'" data-f="'+p.start+'" data-t="'+p.end+'">'+
   '<span class="dot" style="background:'+PAL[i%PAL.length]+'"></span><span class="nm">'+s[2]+" "+esc(s[1])+'</span>'+
   '<span class="vl">'+N(e[1])+'</span><span class="pc">'+Math.round(e[1]/f.income*100)+'%</span></button>'}).join("")+'</div></div>'}}
 if(ui.rep==="cats"){h+=pchips();
  var es=Object.keys(f.byCat).map(function(k){return[k,f.byCat[k]]}).filter(function(e){return e[1]>0})
   .sort(function(a,b){return b[1]-a[1]}).map(function(e,i){var c=cat(e[0]);
    return{id:e[0],name:c[1],icon:c[2],value:e[1],color:c[3]||PAL[i%PAL.length]}});
  if(!es.length)h+=emp("لا مصروفات في هذه الفترة","اختر فترة أخرى أو سجّل مصروفاً","إضافة عملية","add");
  else{h+='<div class="card">'+donut(es,f.expense)+'<div class="lgd">'+
   es.map(function(e){return'<button class="lg" data-a="catd" data-id="'+esc(e.id)+'" data-f="'+p.start+'" data-t="'+p.end+'">'+
   '<span class="dot" style="background:'+e.color+'"></span><span class="nm">'+e.icon+" "+esc(e.name)+'</span>'+
   '<span class="vl">'+N(e.value)+'</span><span class="pc">'+Math.round(e.value/f.expense*100)+'%</span></button>'}).join("")+'</div></div>';
   var dy=Math.max(1,D.diff(p.start,p.end)+1);
   h+='<div class="g2" style="margin-top:12px"><div class="met"><span>متوسط يومي</span><b class="gld">'+N(Math.round(f.expense/dy))+'</b><small>على '+dy+' يوم</small></div>'+
   '<div class="met"><span>أكثر تصنيف</span><b style="font-size:15px">'+es[0].icon+" "+esc(es[0].name)+'</b><small>'+Math.round(es[0].value/f.expense*100)+'% من الإنفاق</small></div></div>'}}
 if(ui.rep==="trend"){h+='<div class="card"><div class="sec" style="margin:0 0 10px"><h2>تطور النقد</h2><span style="font-size:10.5px;color:var(--mut)">رصيد نهاية كل شهر</span></div>'+
  area(se.map(function(s){return{label:s.label,v:s.cash}}))+'</div>';
  h+='<div class="card" style="margin-top:12px"><div class="sec" style="margin:0 0 10px"><h2>تطور صافي الثروة</h2></div>'+
  area(ms.map(function(k){return{label:D.ms(k),v:pos(LG,D.mr(k).end).net}}))+'</div>';
  h+='<div class="sec"><h2>مراكز مالية</h2></div><div class="card">'+
  [["النقد الفعلي",P.cash],["حقوق لدى الغير",P.recv],["ديون عليّ",-P.debt],["مخصص للادخار (داخل النقد)",P.reserved],["صافي الثروة",P.net]]
  .map(function(r){return'<div class="kv"><span>'+esc(r[0])+'</span><b class="'+(r[1]>=0?"pos":"neg")+'">'+N(r[1])+' دج</b></div>'}).join("")+'</div>'}
 if(ui.rep==="ins")h+=insights(p);
 return h}
function insights(p){var f=flow(LG,p.start,p.end),P=pos(LG),ms=[],i;
 for(i=3;i>=1;i--)ms.push(D.am(D.mk(today()),-i));
 var av={};ms.forEach(function(k){var r=D.mr(k),fl=flow(LG,r.start,r.end);
  Object.keys(fl.byCat).forEach(function(c){av[c]=(av[c]||0)+fl.byCat[c]})});
 Object.keys(av).forEach(function(k){av[k]=Math.round(av[k]/ms.length)});
 var h='<div class="al info"><span class="ai">◈</span><div><b>تحليل محلي بالكامل</b><small>قواعد حسابية على بياناتك، بلا اتصال ولا ذكاء اصطناعي. التوقعات تقديرات لا حقائق.</small></div></div>',out=[];
 Object.keys(f.byCat).forEach(function(c){var a=av[c];
  if(a>0&&f.byCat[c]>a*1.35)out.push({i:"📈",t:"ارتفاع في "+cat(c)[1],s:"أنفقت "+F(f.byCat[c])+" مقابل متوسط "+F(a)+" في الأشهر الثلاثة السابقة (+"+Math.round((f.byCat[c]/a-1)*100)+"%)."})});
 var big=LG.transactions.filter(function(t){return t.type==="EXP"&&t.status==="POSTED"&&t.occurredOn>=p.start&&t.occurredOn<=p.end})
  .sort(function(a,b){return b.amount-a.amount})[0];
 if(big&&f.expense>0&&big.amount>f.expense*.3)out.push({i:"🔎",t:"حركة كبيرة غير معتادة",s:"«"+big.title+"» بقيمة "+F(big.amount)+" تمثل "+Math.round(big.amount/f.expense*100)+"% من إنفاق الفترة."});
 if(f.income>0){var sr=Math.round((f.income-f.expense)/f.income*100);
  out.push({i:sr>=20?"✅":"⚠",t:"نسبة الادخار من الدخل "+sr+"%",s:sr>=20?"معدل جيد. استمر.":"أقل من 20%. راجع أكبر تصنيفين في إنفاقك."})}
 var oo=LG.occurrences.filter(function(o){return["DUE","OVERDUE","PARTIAL","SCHEDULED"].indexOf(o.status)>=0});
 var cs=oo.reduce(function(s,o){return s+o.amount-o.paid},0);
 if(f.income>0&&cs>0)out.push({i:"🧾",t:"نسبة الالتزامات إلى الدخل "+Math.round(cs/f.income*100)+"%",s:"التزامات مفتوحة بقيمة "+F(cs)+" مقابل دخل الفترة "+F(f.income)+"."});
 if(D.mk(p.start)===D.mk(today())&&p.end>=today()){var dd=D.p(today()).d,dim=D.dim(D.p(today()).y,D.p(today()).m);
  if(dd>=5){var pj=Math.round(f.expense/dd*dim);
   out.push({i:"🔮",t:"توقع إنفاق الشهر ≈ "+F(pj),est:true,s:"تقدير خطي بناءً على "+dd+" يوماً من أصل "+dim+". ليس رقماً مؤكداً."});
   if(P.cash<pj-f.income)out.push({i:"💧",t:"تنبيه سيولة محتمل",est:true,s:"إن استمر النمط الحالي قد لا يكفي النقد لتغطية باقي الشهر. راجع الالتزامات القادمة."})}
  else out.push({i:"⏳",t:"بيانات غير كافية للتوقع",s:"نحتاج 5 أيام على الأقل من الشهر الحالي قبل إصدار أي تقدير."})}
 var dw={};LG.transactions.forEach(function(t){if(t.type!=="EXP"||t.status!=="POSTED")return;
  var k=D.dn(t.occurredOn);dw[k]=(dw[k]||0)+t.amount});
 var tp=Object.keys(dw).map(function(k){return[k,dw[k]]}).sort(function(a,b){return b[1]-a[1]})[0];
 if(tp)out.push({i:"📅",t:"أثقل أيامك: "+tp[0],s:"مجموع "+F(tp[1])+" من المصروفات المسجّلة في هذا اليوم عبر كل الفترات."});
 if(!out.length)return h+emp("لا تحليل بعد","سجّل عدة حركات عبر أسابيع ليصبح التحليل ذا معنى","إضافة عملية","add");
 return h+out.map(function(o){return'<div class="ins"><span class="ii">'+o.i+'</span><div><b>'+esc(o.t)+(o.est?' <span class="est">تقدير</span>':"")+'</b><small>'+esc(o.s)+'</small></div></div>'}).join("")}
function vMore(){var P=pos(LG);
 var cn={budgets:LG.budgets.length,savings:LG.goals.filter(function(g){return g.status==="ACTIVE"}).length,
  commit:LG.occurrences.filter(function(o){return["DUE","OVERDUE","PARTIAL"].indexOf(o.status)>=0}).length,
  debts:LG.parties.filter(function(p){return pbal(LG,p.id,"DEBT")>0||pbal(LG,p.id,"RECV")>0}).length,
  food:LG.items.length,audit:LG.audit.length};
 var tl=[["budgets","📊","الميزانيات","حدود تخطيطية لا تخصم نقداً","var(--blue)",cn.budgets],
 ["savings","🎯","الادخار والأهداف","تخصيص داخل نقدك لا حساب منفصل","var(--gold)",cn.savings],
 ["commit","🗓","الالتزامات","استحقاقات ودفعات جزئية ومتأخرات","var(--vio)",cn.commit],
 ["debts","🤝","الديون والحقوق","ما عليك وما لك، بأصل ورسوم","var(--teal)",cn.debts],
 ["food","🛒","الطعام والأسعار","دليل المواد وسجل الأسعار والفواتير","var(--amb)",cn.food],
 ["audit","🧾","سجل التدقيق","كل تغيير موثّق قبل وبعد","var(--rose)",cn.audit],
 ["backup","💾","البيانات والنسخ","تصدير واستعادة مع تحقق كامل","var(--em2)",""],
 ["settings","⚙","الإعدادات","المظهر والأسبوع والدورة والفحوص","var(--mut)",""]];
 var h=hd("المزيد","أقسام النظام الكاملة — كل واحد محرك حقيقي لا صفحة شكلية.");
 h+='<div class="card" style="margin-bottom:14px"><div class="g2">'+
 '<div><span style="font-size:11px;color:var(--mut)">صافي الثروة</span><div style="font-size:22px;font-family:var(--nm);color:var(--gold2)">'+N(P.net)+'</div></div>'+
 '<div><span style="font-size:11px;color:var(--mut)">سطور القيود</span><div style="font-size:22px;font-family:var(--nm)">'+P.count+'</div></div></div>'+
 '<div class="pg" style="margin-top:10px"><span>ميزان المراجعة</span><span class="'+(P.trial.ok?"pos":"neg")+'">'+(P.trial.ok?"✓ متوازن":"✗ غير متوازن")+' · '+N(P.trial.d)+' = '+N(P.trial.c)+'</span></div></div>';
 return h+'<div class="hub stg">'+tl.map(function(t){return'<button data-a="go" data-to="more" data-sub="'+t[0]+'" style="--c:'+t[4]+'">'+
 (t[5]!==""?'<span class="cnt">'+t[5]+'</span>':"")+'<span class="hi">'+t[1]+'</span><b>'+t[2]+'</b><small>'+t[3]+'</small></button>'}).join("")+'</div>'}
function bb(t){return'<div class="hd"><div><button class="lnk" data-a="go" data-to="more">→ المزيد</button><h1 style="margin-top:6px">'+esc(t)+'</h1></div></div>'}
function vSub(){return{sBudgets:sBud,sSavings:sSav,sCommit:sCmt,sDebts:sDbt,sFood:sFood,sAudit:sAud,sBackup:sBak,sSettings:sSet}[sub]?
 {sBudgets:sBud,sSavings:sSav,sCommit:sCmt,sDebts:sDbt,sFood:sFood,sAudit:sAud,sBackup:sBak,sSettings:sSet}[sub]():
 ({budgets:sBud,savings:sSav,commit:sCmt,debts:sDbt,food:sFood,audit:sAud,backup:sBak,settings:sSet}[sub]||vMore)()}
function sBud(){var bs=budStat(),tt=bs.reduce(function(s,b){return s+b.amount},0),sp=bs.reduce(function(s,b){return s+b.spent},0);
 var h=bb("الميزانيات")+'<div class="al info"><span class="ai">◈</span><div><b>الميزانية خطة لا حركة نقدية</b><small>لا تخصم من النقد ولا ينشئ تجاوزها ديناً. الحجز الفعلي عبر أهداف الادخار فقط.</small></div></div>'+
 '<div class="tot"><span>مجموع الحدود الشهرية<br><small style="color:var(--mut)">المستهلك '+N(sp)+' دج</small></span><b>'+N(tt)+'</b></div>'+
 '<button class="btn p w" data-a="budnew">＋ ميزانية جديدة</button>';
 if(!bs.length)return h+emp("لا ميزانيات","حدّد حداً شهرياً لكل تصنيف","＋ ميزانية","budnew");
 h+='<div class="rows" style="margin-top:14px">';
 var dy=D.diff(D.mr(D.mk(today())).start,today())+1;
 bs.forEach(function(b){var pc=b.amount?b.spent/b.amount:0,c=pc>1?"var(--cor)":pc>.8?"var(--amb)":"var(--em2)";
  h+='<div class="card"><button data-a="bud" data-id="'+b.id+'" style="width:100%;text-align:start">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:14px">'+esc(cat(b.categoryId)[2])+" "+esc(b.name)+'</b>'+
  '<span class="tag '+(pc>1?"bad":pc>.8?"warn":"ok")+'">'+Math.round(pc*100)+'%</span></div>'+
  '<div class="bar"><i style="width:'+Math.min(100,pc*100)+'%;background:'+c+'"></i></div>'+
  '<div class="pg"><span>مستهلك '+N(b.spent)+'</span><span>الحد '+N(b.amount)+'</span></div>'+
  '<div class="pg"><span>متوسط يومي '+N(Math.round(b.spent/Math.max(1,dy)))+'</span><span style="color:'+c+'">'+(b.left<0?"تجاوز "+N(-b.left):"متبقٍ "+N(b.left))+' دج</span></div></button>'+
  '<div style="display:flex;gap:8px;margin-top:11px"><button class="btn sm" data-a="budedit" data-id="'+b.id+'">تعديل الحد</button>'+
  '<button class="btn sm d" data-a="buddel" data-id="'+b.id+'">حذف</button></div></div>'});
 return h+'</div>'}
function sSav(){var P=pos(LG);
 var h=bb("الادخار والأهداف")+'<div class="al info"><span class="ai">◈</span><div><b>الادخار تخصيص داخل نقدك</b><small>المساهمة لا تنقل مالاً ولا تغيّر النقد. الشراء من هدف يسجّل مصروفاً واحداً فقط.</small></div></div>'+
 '<div class="g3"><div class="met"><span>مخصص</span><b class="gld" style="font-size:16px">'+N(P.reserved)+'</b></div>'+
 '<div class="met"><span>متاح حر</span><b class="pos" style="font-size:16px">'+N(P.available)+'</b></div>'+
 '<div class="met"><span>غير ممول</span><b class="'+(P.gap>0?"neg":"")+'" style="font-size:16px">'+N(P.gap)+'</b></div></div>'+
 '<button class="btn p w" style="margin-top:13px" data-a="goalnew">＋ هدف جديد</button>';
 if(!LG.goals.length)return h+emp("لا أهداف","أنشئ هدفاً وخصّص له من نقدك المتاح","＋ هدف","goalnew");
 h+='<div class="rows" style="margin-top:14px">';
 LG.goals.forEach(function(g){var b=gbal(LG,g.id),pc=g.target?b/g.target:0,ad=0,rl=0,us=0;
  LG.savings.forEach(function(s){if(s.goalId!==g.id)return;
   if(s.kind==="ADD")ad+=s.amount;else if(s.kind==="REL")rl+=s.amount;else us+=s.amount});
  h+='<div class="card" style="'+(g.status!=="ACTIVE"?"opacity:.6":"")+'">'+
  '<button data-a="goal" data-id="'+g.id+'" style="width:100%;text-align:start;display:flex;gap:13px;align-items:center">'+
  ring(pc,pc>=1?"var(--em2)":"var(--gold)")+'<div style="flex:1;min-width:0"><b style="font-size:14px">'+esc(g.icon||"🎯")+" "+esc(g.name)+'</b>'+
  '<div style="font-size:11px;color:var(--mut);margin-top:3px">'+N(b)+(g.target?" / "+N(g.target):"")+' دج · '+Math.round(pc*100)+'%</div>'+
  (g.target?'<div class="pg"><span>المتبقي للهدف</span><span>'+N(Math.max(0,g.target-b))+' دج</span></div>':"")+'</div></button>'+
  '<div class="g3" style="margin-top:11px;font-size:10.5px">'+
  '<div><span style="color:var(--mut)">ساهم</span><div class="pos" style="font-family:var(--nm)">'+N(ad)+'</div></div>'+
  '<div><span style="color:var(--mut)">حرّر</span><div style="font-family:var(--nm)">'+N(rl)+'</div></div>'+
  '<div><span style="color:var(--mut)">اشترى</span><div class="neg" style="font-family:var(--nm)">'+N(us)+'</div></div></div>'+
  '<div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">'+
  '<button class="btn sm e" data-a="alloc" data-id="'+g.id+'">＋ مساهمة</button>'+
  '<button class="btn sm" data-a="rel" data-id="'+g.id+'">تحرير</button>'+
  '<button class="btn sm" data-a="buy" data-id="'+g.id+'">شراء من الهدف</button>'+
  '<button class="btn sm" data-a="gtog" data-id="'+g.id+'">'+(g.status==="ACTIVE"?"إيقاف":"تفعيل")+'</button></div></div>'});
 return h+'</div>'}
function sCmt(){materialize(LG,45);
 var gr=[["OVERDUE","متأخرة","bad"],["DUE","مستحقة اليوم","warn"],["PARTIAL","مدفوعة جزئياً","info"],["SCHEDULED","قادمة",""],["PAID","مدفوعة","ok"],["SKIPPED","متخطاة",""]];
 var h=bb("الالتزامات والفواتير")+'<div class="al info"><span class="ai">◈</span><div><b>الاستحقاق ليس مصروفاً</b><small>لا يتحوّل إلى دفع تلقائي. الدفع بتاريخه الفعلي والاستحقاق بتاريخه الأصلي.</small></div></div>'+
 '<button class="btn p w" data-a="cmnew">＋ التزام متكرر</button>';
 var op=LG.occurrences.filter(function(o){return["OVERDUE","DUE","PARTIAL"].indexOf(o.status)>=0});
 if(op.length)h+='<div class="tot" style="margin-top:13px"><span>مطلوب دفعه الآن<br><small style="color:var(--mut)">'+op.length+' استحقاق</small></span><b>'+N(op.reduce(function(s,o){return s+o.amount-o.paid},0))+'</b></div>';
 gr.forEach(function(g){var ls=LG.occurrences.filter(function(o){return o.status===g[0]}).sort(function(a,b){return a.dueOn<b.dueOn?-1:1});
  if(!ls.length)return;
  h+='<div class="sec"><h2>'+g[1]+' <span class="tag '+g[2]+'">'+ls.length+'</span></h2></div><div class="rows">';
  ls.slice(0,20).forEach(function(o){var c=find(LG.commitments,o.commitmentId)||{name:"—",categoryId:"other"},lf=o.amount-o.paid;
   h+='<div class="row"><div class="ri">'+cat(c.categoryId)[2]+'</div>'+
   '<button class="rm" data-a="occ" data-id="'+o.id+'"><b>'+esc(c.name)+'</b><small>استحقاق '+esc(o.dueOn)+' · '+esc(D.ml(o.periodKey))+(o.paid?' · مدفوع '+N(o.paid):"")+'</small></button>'+
   '<div style="text-align:end"><div class="ra '+(g[0]==="PAID"?"pos":"neg")+'">'+N(lf)+'</div>'+
   (["DUE","OVERDUE","PARTIAL"].indexOf(o.status)>=0?'<button class="btn sm e" style="margin-top:5px" data-a="pay" data-id="'+o.id+'">دفع</button>':"")+'</div></div>'});
  h+='</div>'});
 h+='<div class="sec"><h2>القواعد المتكررة</h2></div><div class="rows">';
 if(!LG.commitments.length)h+=emp("لا التزامات","أضف الإيجار أو الكهرباء أو الاشتراكات","＋ التزام","cmnew");
 LG.commitments.forEach(function(c){h+='<div class="row"><div class="ri">'+cat(c.categoryId)[2]+'</div>'+
  '<div class="rm"><b>'+esc(c.name)+'</b><small>يوم '+c.anchorDay+' شهرياً · '+N(c.amount)+' دج · سماح '+(c.graceDays||0)+' يوم'+(c.status!=="ACTIVE"?" · موقوف":"")+'</small></div>'+
  '<button class="btn sm" data-a="cmedit" data-id="'+c.id+'">تعديل</button>'+
  '<button class="btn sm" data-a="cmtog" data-id="'+c.id+'">'+(c.status==="ACTIVE"?"إيقاف":"تفعيل")+'</button></div>'});
 return h+'</div>'}
function sDbt(){var isD=ui.dt==="debt";
 var ls=LG.parties.map(function(p){return{p:p,d:pbal(LG,p.id,"DEBT"),r:pbal(LG,p.id,"RECV")}})
  .filter(function(x){return isD?x.d>0:x.r>0});
 var tt=ls.reduce(function(s,x){return s+(isD?x.d:x.r)},0);
 var h=bb("الديون والحقوق")+'<div class="t2"><button class="'+(isD?"on":"")+'" data-a="dtab" data-k="debt">ديون عليّ</button>'+
 '<button class="'+(!isD?"on":"")+'" data-a="dtab" data-k="recv">حقوق لي</button></div>'+
 '<div class="tot"><span>'+(isD?"إجمالي أصل الدين المتبقي":"إجمالي الحقوق المستحقة")+'<br><small style="color:var(--mut)">أساس نقدي — الفوائد تُعترف عند دفعها</small></span><b>'+N(tt)+'</b></div>'+
 '<div style="display:flex;gap:9px"><button class="btn p" style="flex:1" data-a="'+(isD?"brw":"lnd")+'">'+(isD?"＋ قرض مستلم":"＋ إقراض جديد")+'</button>'+
 '<button class="btn" data-a="pnew">＋ جهة</button></div>';
 if(!ls.length)return h+emp(isD?"لا ديون عليك":"لا حقوق لك","",isD?"＋ قرض":"＋ إقراض",isD?"brw":"lnd");
 h+='<div class="rows" style="margin-top:14px">';
 ls.forEach(function(x){var b=isD?x.d:x.r,tx=LG.transactions.filter(function(t){return t.partyId===x.p.id&&t.status==="POSTED"});
  h+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'+
  '<b style="font-size:14px">'+(isD?"🤝":"🫱")+" "+esc(x.p.name)+'</b><b class="'+(isD?"neg":"pos")+'" style="font-family:var(--nm);font-size:17px">'+N(b)+'</b></div>'+
  '<div class="pg"><span>'+tx.length+' حركة</span><span>آخرها '+esc(tx.length?tx[tx.length-1].occurredOn:"—")+'</span></div>'+
  '<div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">'+
  (isD?'<button class="btn sm e" data-a="dpy" data-id="'+x.p.id+'">تسديد</button><button class="btn sm" data-a="frg" data-id="'+x.p.id+'">إعفاء</button>'
   :'<button class="btn sm e" data-a="col" data-id="'+x.p.id+'">تحصيل</button><button class="btn sm d" data-a="wof" data-id="'+x.p.id+'">إعدام جزء</button>')+
  '<button class="btn sm" data-a="pt" data-id="'+x.p.id+'">كشف</button></div></div>'});
 return h+'</div>'}
function sFood(){var h=bb("الطعام والأسعار")+'<div class="al info"><span class="ai">◈</span><div><b>لا أسعار مخترعة</b><small>كل سعر مصدره شراء فعلي أو إدخال موثّق. تعديل الدليل لا يغيّر الفواتير القديمة.</small></div></div>'+
 '<div style="display:flex;gap:9px"><button class="btn p" style="flex:1" data-a="inv">＋ فاتورة تفصيلية</button><button class="btn" data-a="itnew">＋ مادة</button></div>'+
 '<div class="sec"><h2>دليل المواد <span class="tag">'+LG.items.length+'</span></h2></div>';
 if(!LG.items.length)h+=emp("الدليل فارغ","أضف المواد التي تشتريها","＋ مادة","itnew");
 else{h+='<div class="rows">';
  LG.items.slice(0,60).forEach(function(it){var ps=LG.prices.filter(function(p){return p.itemId===it.id}).sort(function(a,b){return a.on<b.on?1:-1});
   var la=ps[0],fi=ps[ps.length-1],tr=la&&fi&&fi.amount>0?Math.round((la.amount/fi.amount-1)*100):0;
   h+='<button class="row" data-a="it" data-id="'+it.id+'"><div class="ri">'+cat(it.categoryId)[2]+'</div>'+
   '<div class="rm"><b>'+esc(it.name)+(it.nameFr?' <span style="color:var(--fnt);font-size:10.5px">'+esc(it.nameFr)+'</span>':"")+'</b>'+
   '<small>'+esc(it.unit)+' · '+ps.length+' سعر'+(la?" · "+esc(la.store):"")+'</small></div>'+
   '<div style="text-align:end"><div class="ra">'+(la?N(la.amount):"—")+'</div>'+
   (ps.length>1?'<small style="font-size:9.5px;color:'+(tr>0?"var(--cor2)":"var(--em2)")+'">'+(tr>0?"+":"")+tr+'%</small>':"")+'</div></button>'});
  h+='</div>'}
 var iv=LG.invoices.slice().sort(function(a,b){return a.on<b.on?1:-1}).slice(0,12);
 if(iv.length){h+='<div class="sec"><h2>فواتير حديثة</h2></div><div class="rows">';
  iv.forEach(function(v){h+='<button class="row" data-a="ivd" data-id="'+v.id+'"><div class="ri">🧾</div>'+
   '<div class="rm"><b>'+esc(v.store||"فاتورة")+'</b><small>'+esc(v.on)+' · '+(v.lines||[]).length+' عناصر</small></div>'+
   '<div class="ra neg">'+N(v.total)+'</div></button>'});h+='</div>'}
 return h}
function sAud(){var ls=LG.audit.slice().sort(function(a,b){return a.at<b.at?1:-1}).slice(0,200);
 var h=bb("سجل التدقيق")+'<div class="al info"><span class="ai">◈</span><div><b>لا حذف صامت</b><small>كل ترحيل وعكس وتخصيص موثّق بقيمته قبل وبعد وسببه ووقته.</small></div></div>'+
 '<div class="g2" style="margin-bottom:13px"><div class="met"><span>إجمالي الأحداث</span><b>'+LG.audit.length+'</b></div>'+
 '<div class="met"><span>حركات معكوسة</span><b class="neg">'+LG.transactions.filter(function(t){return t.status==="REVERSED"}).length+'</b></div></div>';
 if(!ls.length)return h+emp("السجل فارغ","ستظهر هنا كل العمليات","","");
 return h+ls.map(function(a){return'<div class="au"><div class="ah"><span class="aa">'+esc(a.action)+'</span><span class="at">'+esc(a.at.slice(0,19).replace("T"," "))+'</span></div>'+
 '<div class="ar">'+esc(a.entity)+" · "+esc((a.after&&(a.after.title||a.after.note))||a.entityId)+(a.reason?' · السبب: '+esc(a.reason):"")+'</div>'+
 (a.before&&a.after&&a.before.status?'<div class="ar" style="margin-top:4px;color:var(--fnt)">'+esc(a.before.status)+' → '+esc(a.after.status)+'</div>':"")+'</div>'}).join("")}
function sBak(){var h=bb("البيانات والنسخ");
 h+='<div class="card"><div class="sec" style="margin:0 0 10px"><h2>تصدير</h2></div>'+
 '<p style="font-size:12px;color:var(--mut);margin:0 0 13px">ملف JSON كامل يشمل الحركات والقيود والتخصيصات وسجل التدقيق — صالح للاستعادة الكاملة.</p>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn p" data-a="exj">⬇ نسخة JSON كاملة</button>'+
 '<button class="btn" data-a="exc" data-k="tx">CSV الحركات</button><button class="btn" data-a="exc" data-k="lines">CSV القيود</button>'+
 '<button class="btn" data-a="exc" data-k="prices">CSV الأسعار</button></div></div>';
 h+='<div class="card" style="margin-top:13px"><div class="sec" style="margin:0 0 10px"><h2>استعادة</h2></div>'+
 '<p style="font-size:12px;color:var(--mut);margin:0 0 13px">تُفحص البنية والمعرّفات وتوازن القيود ويُعاد بناء الرصيد قبل أي استبدال، وتُؤخذ نسخة من بياناتك أولاً.</p>'+
 '<button class="btn w" data-a="imp">⬆ اختر ملف نسخة</button></div>';
 h+='<div class="card" style="margin-top:13px"><div class="sec" style="margin:0 0 10px"><h2>التخزين</h2></div>'+
 '<div class="kv" id="sti"><span>جارٍ القياس…</span><b></b></div>'+
 '<button class="btn w" style="margin-top:11px" data-a="persist">طلب حماية التخزين من الإخلاء</button>'+
 '<p style="font-size:10.5px;color:var(--fnt);margin-top:9px;line-height:1.7">بعض المتصفحات تمسح بيانات المواقع غير المثبّتة بعد فترة عدم استخدام. ثبّت التطبيق على الشاشة الرئيسية وصدّر نسخة دورياً.</p></div>';
 h+='<div class="card" style="margin-top:13px;border-color:#D96C6C44"><div class="sec" style="margin:0 0 10px"><h2 class="neg">منطقة الخطر</h2></div>'+
 '<p style="font-size:12px;color:var(--mut);margin:0 0 13px">المسح يبدأ دفترك من الصفر. تُصدَّر نسخة تلقائياً قبله.</p>'+
 '<button class="btn d w" data-a="wipe">مسح كل البيانات والبدء من صفر</button></div>';
 setTimeout(stInfo,60);return h}
function stInfo(){var el=$("sti");if(!el)return;
 Promise.resolve().then(function(){return navigator.storage&&navigator.storage.estimate?navigator.storage.estimate():null})
 .then(function(e){return Promise.all([e,navigator.storage&&navigator.storage.persisted?navigator.storage.persisted():false])})
 .then(function(r){el.innerHTML='<span>المستخدم '+(r[0]?(r[0].usage/1048576).toFixed(2)+" م.ب":"غير معروف")+'</span><b>'+(r[1]?"✓ محمي":"غير محمي")+'</b>'})
 .catch(function(){el.innerHTML='<span>القياس غير متاح</span><b>—</b>'})}
function sSet(){var s=LG.settings,P=pos(LG);
 var h=bb("الإعدادات")+'<div class="card"><div class="sec" style="margin:0 0 6px"><h2>العرض</h2></div>'+
 '<div class="sw"><div><b>المظهر الفاتح</b><small>الوضع الداكن افتراضي</small></div><button class="tg'+(s.theme==="light"?" on":"")+'" data-a="theme"></button></div>'+
 '<div class="fl" style="margin-top:13px"><label>بداية الأسبوع</label><select id="swk">'+
 ARD.map(function(d,i){return'<option value="'+i+'"'+(s.weekStart===i?" selected":"")+'>'+d+'</option>'}).join("")+'</select></div>'+
 '<div class="fl"><label>يوم استلام الراتب</label><input id="spd" type="number" min="1" max="31" value="'+s.payday+'">'+
 '<div class="ht">الدورة الحالية: '+esc(D.cyc(today(),s.payday).start)+' ← '+esc(D.cyc(today(),s.payday).end)+'</div></div>'+
 '<div class="fl"><label>الفترة الافتراضية</label><select id="spr">'+
 [["today","اليوم"],["week","الأسبوع"],["month","الشهر"],["cycle","دورة الراتب"],["year","السنة"]].map(function(o){
  return'<option value="'+o[0]+'"'+(s.period===o[0]?" selected":"")+'>'+o[1]+'</option>'}).join("")+'</select></div></div>';
 h+='<div class="card" style="margin-top:13px"><div class="sec" style="margin:0 0 10px"><h2>سلامة البيانات</h2></div>'+
 '<div class="kv"><span>ميزان المراجعة</span><b class="'+(P.trial.ok?"pos":"neg")+'">'+(P.trial.ok?"✓ متوازن":"✗ خلل")+'</b></div>'+
 '<div class="kv"><span>مدين = دائن</span><b>'+N(P.trial.d)+' = '+N(P.trial.c)+'</b></div>'+
 '<div class="kv"><span>سطور القيود</span><b>'+P.count+'</b></div>'+
 '<div class="kv"><span>العملة والدقة</span><b>DZD · سنتيم صحيح</b></div>'+
 '<button class="btn p w" style="margin-top:12px" data-a="check">▶ تشغيل فحوص القبول</button><div id="cko" style="margin-top:12px"></div></div>';
 h+='<div class="card" style="margin-top:13px"><div class="sec" style="margin:0 0 10px"><h2>التصنيفات والمصادر</h2></div>'+
 '<div class="chips">'+s.categories.map(function(c){return'<span class="chip" style="border-color:'+c[3]+'55">'+c[2]+" "+esc(c[1])+'</span>'}).join("")+'</div>'+
 '<button class="btn sm" style="margin-top:10px" data-a="catnew">＋ تصنيف</button>'+
 '<div class="chips" style="margin-top:12px">'+s.sources.map(function(x){return'<span class="chip">'+x[2]+" "+esc(x[1])+'</span>'}).join("")+'</div>'+
 '<button class="btn sm" style="margin-top:10px" data-a="srcnew">＋ مصدر دخل</button></div>';
 h+='<div class="card" style="margin-top:13px"><div class="sec" style="margin:0 0 10px"><h2>وضع الاستكشاف</h2></div>'+
 '<div class="sw"><div><b>بيانات تجريبية</b><small>'+(s.demo?"مفعّل — هذه ليست أموالك":"مطفأ — حسابك حقيقي")+'</small></div>'+
 '<button class="tg'+(s.demo?" on":"")+'" data-a="demo"></button></div>'+
 '<p style="font-size:10.5px;color:var(--fnt);margin-top:10px;line-height:1.7">لا تُخلط البيانات التجريبية بحسابك الحقيقي أبداً. التفعيل يولّد نسخة استكشاف منفصلة والإطفاء يبدأ دفتراً فارغاً.</p></div>';
 return h+'<div class="card" style="margin-top:13px"><div class="sec" style="margin:0 0 8px"><h2>عن التطبيق</h2></div>'+
 '<div class="kv"><span>الإصدار</span><b>4.0</b></div><div class="kv"><span>المحرك</span><b>قيد مزدوج · append-only</b></div>'+
 '<div class="kv"><span>التخزين</span><b>IndexedDB · محلي</b></div><div class="kv"><span>الشبكة</span><b>لا اتصال خارجي</b></div></div>'}
/* ══════════ 10. لوحات التفاصيل ══════════ */
function dCash(){var st=stmt(LG,today()),P=pos(LG);
 var b='<div class="tot"><span>الرصيد الحالي</span><b>'+N(P.cash)+'</b></div>'+
 '<div class="kv"><span>حركات النقد</span><b>'+st.rows.length+'</b></div>'+
 '<div class="kv"><span>مدين = دائن</span><b class="'+(P.trial.ok?"pos":"neg")+'">'+N(P.trial.d)+' = '+N(P.trial.c)+'</b></div>'+
 '<div class="sec"><h2>كشف الحساب</h2></div>';
 b+=st.rows.slice(-60).reverse().map(function(r){return'<button class="jl" data-a="tx" data-id="'+r.txId+'"><span class="sd '+(r.delta>0?"d":"c")+'">'+(r.delta>0?"قبض":"صرف")+'</span>'+
 '<span class="an">'+esc(r.title)+'<br><small style="color:var(--fnt)">'+esc(r.date)+'</small></span>'+
 '<span class="vv" style="color:'+(r.delta>0?"var(--em2)":"var(--cor2)")+'">'+(r.delta>0?"+":"")+N(r.delta)+'<br><small style="color:var(--fnt);font-weight:400">رصيد '+N(r.run)+'</small></span></button>'}).join("");
 drw("كشف النقد",b)}
function dAvail(){var P=pos(LG);
 var b='<div class="tot"><span>المتاح للإنفاق</span><b>'+N(P.available)+'</b></div>'+
 '<div class="kv"><span>النقد الفعلي</span><b>'+N(P.cash)+'</b></div>'+
 '<div class="kv"><span>مخصص لأهداف نشطة</span><b class="gld">'+N(P.reserved)+'</b></div>'+
 '<div class="kv"><span>المخصص الممول فعلياً</span><b>'+N(P.funded)+'</b></div>'+
 (P.gap>0?'<div class="kv"><span>تخصيص غير ممول</span><b class="neg">'+N(P.gap)+'</b></div>':"")+
 '<p style="font-size:11.5px;color:var(--mut);line-height:1.8;margin-top:14px">المتاح = النقد − التخصيص الممول. الميزانيات لا تخصم من المتاح لأنها خطط. الادخار ليس حساباً منفصلاً بل مطالبة على نفس النقد.</p>'+
 '<div class="sec"><h2>الأهداف الحاجزة</h2></div>';
 LG.goals.filter(function(g){return g.status==="ACTIVE"}).forEach(function(g){
  b+='<div class="kv"><span>'+esc(g.icon||"🎯")+" "+esc(g.name)+'</span><b>'+N(gbal(LG,g.id))+'</b></div>'});
 drw("المتاح للإنفاق",b)}
function dFlow(kind,f,t){var p=per();f=f||p.start;t=t||p.end;
 var acc=kind==="income"?"INC":"EXP",sg=acc==="INC"?CR:DR;
 var ls=LG.lines.filter(function(l){return l.account===acc&&l.occurredOn>=f&&l.occurredOn<=t});
 var tt=ls.reduce(function(s,l){return s+(l.side===sg?l.amount:-l.amount)},0);
 var b='<div class="tot"><span>'+(kind==="income"?"دخل":"مصروف")+" "+esc(f)+" ← "+esc(t)+'</span><b>'+N(tt)+'</b></div>',seen={};
 ls.forEach(function(l){var tx=find(LG.transactions,l.txId);if(!tx||seen[tx.id+l.sub])return;seen[tx.id+l.sub]=1;
  var v=l.side===sg?l.amount:-l.amount;
  b+='<button class="row" data-a="tx" data-id="'+tx.id+'" style="margin-bottom:7px"><div class="ri">'+
  (kind==="income"?src(l.sub)[2]:cat(l.sub)[2])+'</div><div class="rm"><b>'+esc(tx.title)+'</b><small>'+esc(l.occurredOn)+'</small></div>'+
  '<div class="ra '+(v>=0?(kind==="income"?"pos":"neg"):"")+'">'+N(v)+'</div></button>'});
 drw(kind==="income"?"تفاصيل الدخل":"تفاصيل المصروف",b)}
function dCat(id,f,t){var ls=LG.lines.filter(function(l){return l.account==="EXP"&&l.sub===id&&l.occurredOn>=f&&l.occurredOn<=t});
 var tt=ls.reduce(function(s,l){return s+(l.side===DR?l.amount:-l.amount)},0);
 var b='<div class="tot"><span>'+cat(id)[2]+" "+esc(cat(id)[1])+'</span><b>'+N(tt)+'</b></div><div class="sec"><h2>الحركات</h2></div>',seen={};
 ls.forEach(function(l){var tx=find(LG.transactions,l.txId);if(!tx||seen[tx.id])return;seen[tx.id]=1;
  var v=l.side===DR?l.amount:-l.amount;
  b+='<button class="row" data-a="tx" data-id="'+tx.id+'" style="margin-bottom:7px"><div class="ri">'+cat(id)[2]+
  '</div><div class="rm"><b>'+esc(tx.title)+'</b><small>'+esc(l.occurredOn)+'</small></div><div class="ra">'+N(v)+'</div></button>'});
 drw("تصنيف "+cat(id)[1],b)}
function dSrc(id,f,t){var ls=LG.lines.filter(function(l){return l.account==="INC"&&l.sub===id&&l.occurredOn>=f&&l.occurredOn<=t});
 var tt=ls.reduce(function(s,l){return s+(l.side===CR?l.amount:-l.amount)},0);
 var b='<div class="tot"><span>'+src(id)[2]+" "+esc(src(id)[1])+'</span><b>'+N(tt)+'</b></div>';
 ls.forEach(function(l){var tx=find(LG.transactions,l.txId);if(!tx)return;
  b+='<button class="row" data-a="tx" data-id="'+tx.id+'" style="margin-bottom:7px"><div class="ri">'+src(id)[2]+
  '</div><div class="rm"><b>'+esc(tx.title)+'</b><small>'+esc(l.occurredOn)+'</small></div><div class="ra pos">'+N(l.amount)+'</div></button>'});
 drw("مصدر الدخل",b)}
function dTx(id){var t=find(LG.transactions,id);if(!t)return;
 var e=find(LG.entries,id,"txId"),ls=LG.lines.filter(function(l){return l.entryId===(e&&e.id)});
 var inc=INC_T.indexOf(t.type)>=0;
 var b='<div class="tot"><span>'+esc(LBL[t.type])+(t.status==="REVERSED"?" · معكوسة":"")+'</span><b class="'+(inc?"pos":"neg")+'">'+N(t.amount)+'</b></div>';
 b+='<div class="kv"><span>تاريخ الوقوع</span><b>'+esc(t.occurredOn)+'</b></div>'+
 '<div class="kv"><span>تاريخ التسجيل</span><b style="font-size:11px">'+esc(t.createdAt.slice(0,19).replace("T"," "))+'</b></div>'+
 (t.categoryId?'<div class="kv"><span>التصنيف</span><b>'+cat(t.categoryId)[2]+" "+esc(cat(t.categoryId)[1])+'</b></div>':"")+
 (t.sourceId?'<div class="kv"><span>المصدر</span><b>'+src(t.sourceId)[2]+" "+esc(src(t.sourceId)[1])+'</b></div>':"")+
 (t.partyId?'<div class="kv"><span>الجهة</span><b>'+esc((party(t.partyId)||{name:""}).name)+'</b></div>':"")+
 (t.goalId?'<div class="kv"><span>هدف الادخار</span><b>'+esc((goal(t.goalId)||{name:""}).name)+'</b></div>':"")+
 (t.principal?'<div class="kv"><span>أصل الدين</span><b>'+N(t.principal)+'</b></div>':"")+
 (t.fees?'<div class="kv"><span>فوائد ورسوم</span><b>'+N(t.fees)+'</b></div>':"")+
 (t.note?'<div class="kv"><span>ملاحظة</span><b style="font-family:var(--ff)">'+esc(t.note)+'</b></div>':"")+
 (t.reason?'<div class="kv"><span>السبب</span><b style="font-family:var(--ff)">'+esc(t.reason)+'</b></div>':"");
 b+='<div class="sec"><h2>القيد المحاسبي</h2></div>';
 b+=ls.map(function(l){var sn=l.sub?(l.sub===SF?"فوائد ورسوم":l.sub===SB?"حق معدوم":(ACC[l.account].k==="E"?cat(l.sub)[1]:l.sub)):"";
  return'<div class="jl"><span class="sd '+(l.side===DR?"d":"c")+'">'+(l.side===DR?"مدين":"دائن")+'</span>'+
  '<span class="an">'+esc(ACC[l.account].l)+(sn?'<br><small style="color:var(--fnt)">'+esc(sn)+'</small>':"")+'</span><span class="vv">'+N(l.amount)+'</span></div>'}).join("");
 var dd=ls.filter(function(l){return l.side===DR}).reduce(function(s,l){return s+l.amount},0),
  cc=ls.filter(function(l){return l.side===CR}).reduce(function(s,l){return s+l.amount},0);
 b+='<div class="kv" style="margin-top:8px"><span>التوازن</span><b class="'+(dd===cc?"pos":"neg")+'">'+N(dd)+' = '+N(cc)+'</b></div>';
 if(t.invoiceId){var iv=find(LG.invoices,t.invoiceId);
  if(iv)b+='<div class="sec"><h2>عناصر الفاتورة</h2></div>'+iv.lines.map(function(l){
   return'<div class="jl"><span class="an">'+esc(l.name)+'<br><small style="color:var(--fnt)">'+M.fq(l.qty)+" "+esc(l.unit)+" × "+N(l.price)+'</small></span><span class="vv">'+N(l.total)+'</span></div>'}).join("")}
 if(t.type==="EXP"){var dn=0;LG.transactions.forEach(function(x){if(x.type==="REF"&&x.originalTxId===t.id&&x.status==="POSTED")dn+=x.amount});
  b+='<div class="kv"><span>مسترجع</span><b>'+N(dn)+'</b></div><div class="kv"><span>قابل للاسترجاع</span><b class="pos">'+N(t.amount-dn)+'</b></div>'}
 b+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">';
 if(t.status==="POSTED"&&t.type!=="REV"){b+='<button class="btn sm" data-a="txedit" data-id="'+t.id+'">تعديل</button>';
  if(t.type==="EXP")b+='<button class="btn sm" data-a="ref" data-id="'+t.id+'">استرجاع</button>';
  b+='<button class="btn sm d" data-a="rev" data-id="'+t.id+'">عكس الحركة</button>'}
 if(t.reversalOf)b+='<button class="btn sm" data-a="tx" data-id="'+t.reversalOf+'">الأصل</button>';
 if(t.reversedBy)b+='<button class="btn sm" data-a="tx" data-id="'+t.reversedBy+'">قيد العكس</button>';
 drw("تفاصيل الحركة",b+'</div>')}
function dGoal(id){var g=goal(id);if(!g)return;var b=gbal(LG,id);
 var ev=LG.savings.filter(function(s){return s.goalId===id}).sort(function(a,x){return a.occurredOn<x.occurredOn?1:-1});
 var h='<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">'+ring(g.target?b/g.target:0,"var(--gold)",70)+
 '<div><b style="font-size:17px">'+esc(g.icon||"🎯")+" "+esc(g.name)+'</b><div style="font-size:12px;color:var(--mut)">'+N(b)+(g.target?" من "+N(g.target):"")+' دج</div></div></div>';
 if(g.target)h+='<div class="kv"><span>المتبقي للهدف</span><b>'+N(Math.max(0,g.target-b))+'</b></div>';
 if(g.dueOn)h+='<div class="kv"><span>الموعد المستهدف</span><b>'+esc(g.dueOn)+'</b></div>';
 h+='<div class="kv"><span>الحالة</span><b>'+(g.status==="ACTIVE"?"نشط":"موقوف")+'</b></div><div class="sec"><h2>سجل الهدف</h2></div>';
 h+=ev.length?ev.map(function(e){return'<div class="jl"><span class="sd '+(e.kind==="ADD"?"d":"c")+'">'+
  (e.kind==="ADD"?"＋":e.kind==="REL"?"تحرير":"شراء")+'</span><span class="an">'+esc(e.note||e.kind)+
  '<br><small style="color:var(--fnt)">'+esc(e.occurredOn)+'</small></span><span class="vv" style="color:'+(e.kind==="ADD"?"var(--em2)":"var(--cor2)")+'">'+
  (e.kind==="ADD"?"+":"−")+N(e.amount)+'</span></div>'}).join(""):'<div class="emp">لا مساهمات بعد</div>';
 drw("هدف الادخار",h+'<div style="display:flex;gap:8px;margin-top:15px;flex-wrap:wrap"><button class="btn sm e" data-a="alloc" data-id="'+id+'">＋ مساهمة</button>'+
 '<button class="btn sm" data-a="rel" data-id="'+id+'">تحرير</button><button class="btn sm" data-a="buy" data-id="'+id+'">شراء</button></div>')}
function dBud(id){var b=null,bs=budStat();for(var i=0;i<bs.length;i++)if(bs[i].id===id)b=bs[i];if(!b)return;
 var r=D.mr(D.mk(today())),ls=LG.lines.filter(function(l){return l.account==="EXP"&&l.sub===b.categoryId&&l.occurredOn>=r.start&&l.occurredOn<=r.end});
 var h='<div class="tot"><span>المتبقي</span><b class="'+(b.left<0?"neg":"pos")+'">'+N(b.left)+'</b></div>'+
 '<div class="kv"><span>الحد</span><b>'+N(b.amount)+'</b></div><div class="kv"><span>المستهلك</span><b>'+N(b.spent)+'</b></div>'+
 '<div class="kv"><span>الفترة</span><b style="font-size:11px">'+esc(r.start)+" ← "+esc(r.end)+'</b></div><div class="sec"><h2>الحركات المؤهلة</h2></div>',seen={};
 ls.forEach(function(l){var t=find(LG.transactions,l.txId);if(!t||seen[t.id])return;seen[t.id]=1;
  h+='<button class="row" data-a="tx" data-id="'+t.id+'" style="margin-bottom:7px"><div class="ri">'+cat(b.categoryId)[2]+
  '</div><div class="rm"><b>'+esc(t.title)+'</b><small>'+esc(l.occurredOn)+'</small></div><div class="ra">'+N(l.side===DR?l.amount:-l.amount)+'</div></button>'});
 drw("ميزانية "+b.name,h||'<div class="emp">لا مصروف في هذا التصنيف</div>')}
function dOcc(id){var o=find(LG.occurrences,id);if(!o)return;var c=find(LG.commitments,o.commitmentId)||{};
 var h='<div class="tot"><span>المتبقي</span><b class="'+(o.amount-o.paid>0?"neg":"pos")+'">'+N(o.amount-o.paid)+'</b></div>'+
 '<div class="kv"><span>الالتزام</span><b>'+esc(c.name||"—")+'</b></div>'+
 '<div class="kv"><span>تاريخ الاستحقاق</span><b>'+esc(o.dueOn)+'</b></div>'+
 '<div class="kv"><span>الفترة</span><b>'+esc(D.ml(o.periodKey))+'</b></div>'+
 '<div class="kv"><span>المبلغ المتوقع</span><b>'+N(o.amount)+'</b></div>'+
 '<div class="kv"><span>المدفوع</span><b class="pos">'+N(o.paid)+'</b></div>'+
 '<div class="kv"><span>الحالة</span><b>'+esc(o.status)+'</b></div><div class="sec"><h2>الدفعات</h2></div>';
 var tx=(o.txIds||[]).map(function(i){return find(LG.transactions,i)}).filter(Boolean);
 h+=tx.length?tx.map(function(t){return'<button class="row" data-a="tx" data-id="'+t.id+'" style="margin-bottom:7px"><div class="ri">💸</div>'+
  '<div class="rm"><b>'+esc(t.title)+'</b><small>دُفع في '+esc(t.occurredOn)+'</small></div><div class="ra neg">'+N(t.amount)+'</div></button>'}).join("")
  :'<div class="emp">لم تُدفع أي دفعة بعد</div>';
 if(["DUE","OVERDUE","PARTIAL"].indexOf(o.status)>=0)h+='<div style="display:flex;gap:8px;margin-top:15px">'+
  '<button class="btn sm e" data-a="pay" data-id="'+id+'">تسجيل دفعة</button><button class="btn sm" data-a="skip" data-id="'+id+'">تخطي بموافقة</button></div>';
 drw("استحقاق",h)}
function dParty(id){var p=party(id);if(!p)return;
 var tx=LG.transactions.filter(function(t){return t.partyId===id}).sort(function(a,b){return a.occurredOn<b.occurredOn?1:-1});
 var h='<div class="kv"><span>الجهة</span><b>'+esc(p.name)+'</b></div>'+
 '<div class="kv"><span>دين عليك</span><b class="neg">'+N(pbal(LG,id,"DEBT"))+'</b></div>'+
 '<div class="kv"><span>حق لك</span><b class="pos">'+N(pbal(LG,id,"RECV"))+'</b></div><div class="sec"><h2>كل الحركات</h2></div>';
 h+=tx.map(function(t){return'<button class="row" data-a="tx" data-id="'+t.id+'" style="margin-bottom:7px"><div class="ri">🤝</div>'+
 '<div class="rm"><b>'+esc(t.title)+'</b><small>'+esc(t.occurredOn)+" · "+esc(LBL[t.type])+'</small></div><div class="ra">'+N(t.amount)+'</div></button>'}).join("");
 drw("كشف "+p.name,h)}
function dItem(id){var it=find(LG.items,id);if(!it)return;
 var ps=LG.prices.filter(function(p){return p.itemId===id}).sort(function(a,b){return a.on<b.on?1:-1});
 var h='<div class="kv"><span>الاسم</span><b>'+esc(it.name)+'</b></div>'+
 (it.nameFr?'<div class="kv"><span>بالفرنسية</span><b>'+esc(it.nameFr)+'</b></div>':"")+
 '<div class="kv"><span>الوحدة</span><b>'+esc(it.unit)+'</b></div>'+
 '<div class="kv"><span>التصنيف</span><b>'+cat(it.categoryId)[2]+" "+esc(cat(it.categoryId)[1])+'</b></div>'+
 '<div class="sec"><h2>سجل الأسعار ('+ps.length+')</h2></div>';
 h+=ps.length?ps.map(function(p){return'<div class="jl"><span class="an">'+esc(p.store||"—")+'<br><small style="color:var(--fnt)">'+esc(p.on)+" · "+esc(p.source)+'</small></span>'+
 '<span class="vv">'+N(p.amount)+'<br><small style="color:var(--fnt);font-weight:400">/ '+esc(p.unit)+'</small></span></div>'}).join(""):'<div class="emp">لا أسعار</div>';
 drw(it.name,h+'<button class="btn p w" style="margin-top:14px" data-a="pradd" data-id="'+id+'">＋ تسجيل سعر جديد</button>')}
function dInv(id){var iv=find(LG.invoices,id);if(!iv)return;
 var h='<div class="tot"><span>الإجمالي</span><b>'+N(iv.total)+'</b></div>'+
 '<div class="kv"><span>المتجر</span><b>'+esc(iv.store||"—")+'</b></div><div class="kv"><span>التاريخ</span><b>'+esc(iv.on)+'</b></div>'+
 '<div class="sec"><h2>العناصر</h2></div>';
 h+=(iv.lines||[]).map(function(l){return'<div class="jl"><span class="an">'+esc(l.name)+'<br><small style="color:var(--fnt)">'+
  M.fq(l.qty)+" "+esc(l.unit)+" × "+N(l.price)+'</small></span><span class="vv">'+N(l.total)+'</span></div>'}).join("");
 var s=M.sum((iv.lines||[]).map(function(l){return l.total}));
 h+='<div class="kv" style="margin-top:9px"><span>مجموع الأسطر = الإجمالي</span><b class="'+(s===iv.total?"pos":"neg")+'">'+N(s)+' = '+N(iv.total)+'</b></div>';
 drw("فاتورة",h+'<button class="btn w" style="margin-top:14px" data-a="tx" data-id="'+iv.txId+'">فتح الحركة المرتبطة</button>')}
function dMon(k){var r=D.mr(k),f=flow(LG,r.start,r.end),P=pos(LG,r.end);
 var h='<div class="g2"><div class="met"><span>الدخل</span><b class="pos">'+N(f.income)+'</b></div>'+
 '<div class="met"><span>المصروف</span><b class="neg">'+N(f.expense)+'</b></div></div>'+
 '<div class="kv" style="margin-top:12px"><span>رصيد نهاية الشهر</span><b>'+N(P.cash)+'</b></div>'+
 '<div class="kv"><span>صافي الثروة</span><b>'+N(P.net)+'</b></div><div class="sec"><h2>التصنيفات</h2></div>';
 Object.keys(f.byCat).map(function(c){return[c,f.byCat[c]]}).sort(function(a,b){return b[1]-a[1]}).forEach(function(e){
  h+='<button class="lg" data-a="catd" data-id="'+esc(e[0])+'" data-f="'+r.start+'" data-t="'+r.end+'">'+
  '<span class="dot" style="background:'+cat(e[0])[3]+'"></span><span class="nm">'+cat(e[0])[2]+" "+esc(cat(e[0])[1])+'</span><span class="vl">'+N(e[1])+'</span></button>'});
 drw(D.ml(k),h)}
/* ══════════ 11. النماذج ══════════ */
function fInc(){form({title:"تسجيل دخل",sub:"يزيد النقد ويُحتسب دخلاً مكتسباً",ok:"تسجيل",
 fields:[{k:"amount",label:"المبلغ (دج)",t:"money",req:1,min:1,ph:"0"},
 {k:"sourceId",label:"المصدر",t:"pick",val:"salary",opts:srcOpts()},
 {k:"occurredOn",label:"تاريخ الوقوع",t:"date",val:today(),req:1},
 {k:"title",label:"الوصف",ph:"راتب نوفمبر"},{k:"note",label:"ملاحظة",t:"area"}],
 onSubmit:function(v){return commit(function(lg){return post(lg,{type:"INC",amount:v.amount,sourceId:v.sourceId,
  occurredOn:v.occurredOn,opId:oid(),title:v.title||src(v.sourceId)[1],note:v.note})},"تم تسجيل دخل "+F(v.amount))}})}
function fExp(){form({title:"تسجيل مصروف",sub:"يخفض النقد مرة واحدة",ok:"تسجيل",
 fields:[{k:"amount",label:"المبلغ (دج)",t:"money",req:1,min:1,ph:"0"},
 {k:"categoryId",label:"التصنيف",t:"pick",val:"food",opts:catOpts()},
 {k:"occurredOn",label:"تاريخ الوقوع",t:"date",val:today(),req:1},
 {k:"title",label:"الوصف",ph:"مشتريات"},
 {k:"partyId",label:"الجهة (اختياري)",t:"select",val:"",opts:[["","— بدون —"]].concat(pOpts())},
 {k:"note",label:"ملاحظة",t:"area"}],
 onSubmit:function(v){return commit(function(lg){return post(lg,{type:"EXP",amount:v.amount,categoryId:v.categoryId,
  occurredOn:v.occurredOn,opId:oid(),title:v.title||cat(v.categoryId)[1],partyId:v.partyId||null,note:v.note})},"تم تسجيل مصروف "+F(v.amount))}})}
function fRef(id){var t=find(LG.transactions,id),dn=0;
 LG.transactions.forEach(function(x){if(x.type==="REF"&&x.originalTxId===id&&x.status==="POSTED")dn+=x.amount});
 var rm=t.amount-dn;
 form({title:"استرجاع مصروف",sub:"المتبقي "+F(rm)+" — يزيد النقد ويخفض صافي الإنفاق ولا يظهر كدخل",ok:"استرجاع",
 fields:[{k:"amount",label:"المبلغ المسترجع (دج)",t:"money",req:1,min:1,val:M.f(rm)},
 {k:"occurredOn",label:"تاريخ الاسترجاع",t:"date",val:today(),req:1},{k:"note",label:"السبب",t:"area",val:"استرجاع جزئي"}],
 onSubmit:function(v){if(v.amount>rm)return{errors:{amount:"يتجاوز المتبقي "+F(rm)}};
  return commit(function(lg){return post(lg,{type:"REF",amount:v.amount,categoryId:t.categoryId,originalTxId:id,
   occurredOn:v.occurredOn,opId:oid(),title:"استرجاع: "+t.title,note:v.note})},"تم الاسترجاع "+F(v.amount))}})}
function fAdj(){form({title:"تسوية موثقة",sub:"تصحيح فرق حقيقي بمبرر — الطرف المقابل حقوق ملكية لا دخل",ok:"ترحيل",
 fields:[{k:"amount",label:"الفرق (دج، موجب يزيد النقد)",t:"money",req:1,ph:"500 أو -500"},
 {k:"occurredOn",label:"التاريخ",t:"date",val:today(),req:1},
 {k:"reason",label:"المبرر (إلزامي)",t:"area",req:1,ph:"فرق صندوق بعد الجرد"}],
 onSubmit:function(v){if(!v.amount)return{errors:{amount:"لا تسوية بمبلغ صفري"}};
  return commit(function(lg){return post(lg,{type:"ADJ",amount:v.amount,occurredOn:v.occurredOn,opId:oid(),title:"تسوية",reason:v.reason})},"تمت التسوية")}})}
function fParty(cb){form({title:"جهة جديدة",ok:"حفظ",
 fields:[{k:"name",label:"الاسم",req:1,ph:"كريم — جار"},
 {k:"kind",label:"النوع",t:"pick",val:"person",opts:[["person","شخص"],["payee","مستفيد"],["lender","مقرض"],["employer","جهة عمل"]]},
 {k:"note",label:"ملاحظة"}],
 onSubmit:function(v){var id=uid("pt");LG.parties.push({id:id,name:v.name,kind:v.kind,note:v.note,createdAt:D.now()});
  save(LG).then(function(){toast("تمت إضافة الجهة","ok");if(cb)cb(id)},function(){toast("فشل الحفظ","err")});return true}})}
function fBrw(){if(!LG.parties.length){fParty(fBrw);return}
 form({title:"قرض مستلم",sub:"يزيد النقد والالتزام معاً — ليس دخلاً مكتسباً",ok:"تسجيل",
 fields:[{k:"amount",label:"المبلغ (دج)",t:"money",req:1,min:1},
 {k:"partyId",label:"المقرض",t:"select",val:LG.parties[0].id,opts:pOpts(),req:1},
 {k:"occurredOn",label:"تاريخ الاستلام",t:"date",val:today(),req:1},{k:"note",label:"شروط وملاحظات",t:"area"}],
 onSubmit:function(v){return commit(function(lg){return post(lg,{type:"BRW",amount:v.amount,partyId:v.partyId,
  occurredOn:v.occurredOn,opId:oid(),title:"قرض من "+party(v.partyId).name,note:v.note})},"تم تسجيل القرض")}})}
function fDpy(pid){var b=pbal(LG,pid,"DEBT");
 form({title:"تسديد دين",sub:"أصل الدين المتبقي "+F(b)+" — الأصل يخفض الالتزام والرسوم مصروف",ok:"تسديد",
 fields:[{k:"principal",label:"أصل الدين (دج)",t:"money",req:1,val:M.f(b)},
 {k:"fees",label:"فوائد ورسوم (دج)",t:"money",val:"0"},
 {k:"occurredOn",label:"تاريخ الدفع",t:"date",val:today(),req:1},{k:"note",label:"ملاحظة",t:"area"}],
 onSubmit:function(v){if(v.principal>b)return{errors:{principal:"يتجاوز المتبقي "+F(b)}};
  if(v.principal+v.fees<=0)return{errors:{principal:"دفعة صفرية"}};
  return commit(function(lg){return post(lg,{type:"DPY",amount:v.principal+v.fees,principal:v.principal,fees:v.fees,
   partyId:pid,occurredOn:v.occurredOn,opId:oid(),title:"تسديد لـ"+party(pid).name,note:v.note})},"تم التسديد "+F(v.principal+v.fees))}})}
function fFrg(pid){var b=pbal(LG,pid,"DEBT");
 form({title:"إعفاء من دين",sub:"الدائن أسقط جزءاً — يخفض الالتزام بلا نقد ويُسجّل مكسباً لا دخلاً تشغيلياً",ok:"تسجيل",
 fields:[{k:"amount",label:"المبلغ المُعفى (دج)",t:"money",req:1,min:1,val:M.f(b)},
 {k:"occurredOn",label:"التاريخ",t:"date",val:today(),req:1},{k:"reason",label:"السبب",t:"area",req:1}],
 onSubmit:function(v){if(v.amount>b)return{errors:{amount:"يتجاوز الدين "+F(b)}};
  return commit(function(lg){return post(lg,{type:"FRG",amount:v.amount,partyId:pid,occurredOn:v.occurredOn,opId:oid(),
   title:"إعفاء من "+party(pid).name,reason:v.reason})},"تم تسجيل الإعفاء")}})}
function fLnd(){if(!LG.parties.length){fParty(fLnd);return}
 form({title:"إقراض شخص",sub:"النقد ينخفض والحق يرتفع — صافي الثروة لا يتغير",ok:"تسجيل",
 fields:[{k:"amount",label:"المبلغ (دج)",t:"money",req:1,min:1},
 {k:"partyId",label:"المقترض",t:"select",val:LG.parties[0].id,opts:pOpts(),req:1},
 {k:"occurredOn",label:"التاريخ",t:"date",val:today(),req:1},{k:"note",label:"ملاحظات",t:"area"}],
 onSubmit:function(v){return commit(function(lg){return post(lg,{type:"LND",amount:v.amount,partyId:v.partyId,
  occurredOn:v.occurredOn,opId:oid(),title:"إقراض "+party(v.partyId).name,note:v.note})},"تم تسجيل الإقراض")}})}
function fCol(pid){var b=pbal(LG,pid,"RECV");
 form({title:"تحصيل حق",sub:"المستحق "+F(b)+" — النقد يرتفع والحق ينخفض وليس دخلاً جديداً",ok:"تحصيل",
 fields:[{k:"amount",label:"المبلغ (دج)",t:"money",req:1,min:1,val:M.f(b)},
 {k:"occurredOn",label:"تاريخ التحصيل",t:"date",val:today(),req:1},{k:"note",label:"ملاحظة"}],
 onSubmit:function(v){if(v.amount>b)return{errors:{amount:"يتجاوز الحق "+F(b)}};
  return commit(function(lg){return post(lg,{type:"COL",amount:v.amount,partyId:pid,occurredOn:v.occurredOn,opId:oid(),
   title:"تحصيل من "+party(pid).name,note:v.note})},"تم التحصيل")}})}
function fWof(pid){var b=pbal(LG,pid,"RECV");
 form({title:"إعدام جزء من حق",sub:"خسارة مؤكدة تخفض صافي الثروة — تُصنّف حقاً معدوماً لا مصروفاً استهلاكياً",ok:"تسجيل",
 fields:[{k:"amount",label:"المبلغ المعدوم (دج)",t:"money",req:1,min:1},
 {k:"occurredOn",label:"التاريخ",t:"date",val:today(),req:1},{k:"reason",label:"السبب (إلزامي)",t:"area",req:1}],
 onSubmit:function(v){if(v.amount>b)return{errors:{amount:"يتجاوز الحق "+F(b)}};
  return commit(function(lg){return post(lg,{type:"WOF",amount:v.amount,partyId:pid,occurredOn:v.occurredOn,opId:oid(),
   title:"إعدام حق: "+party(pid).name,reason:v.reason})},"تم تسجيل الخسارة")}})}
function fGoal(){form({title:"هدف ادخار جديد",ok:"إنشاء",
 fields:[{k:"name",label:"اسم الهدف",req:1,ph:"هاتف جديد"},
 {k:"icon",label:"أيقونة",t:"pick",val:"🎯",opts:[["🎯","🎯 هدف"],["📱","📱 هاتف"],["💻","💻 حاسوب"],["🛡","🛡 طوارئ"],["✈","✈ سفر"],["🏠","🏠 منزل"],["🚗","🚗 سيارة"],["🎓","🎓 تعليم"]]},
 {k:"target",label:"المبلغ المستهدف (دج)",t:"money",min:1,req:1},
 {k:"startOn",label:"تاريخ البداية",t:"date",val:today(),req:1},
 {k:"dueOn",label:"الموعد المستهدف",t:"date",val:D.am(D.mk(today()),6)+"-01"},{k:"note",label:"ملاحظة",t:"area"}],
 onSubmit:function(v){return commit(function(lg){lg.goals.push({id:uid("gl"),name:v.name,icon:v.icon,target:v.target,
  startOn:v.startOn,dueOn:v.dueOn||null,note:v.note,status:"ACTIVE",createdAt:D.now()})},"تم إنشاء الهدف")}})}
function fAlloc(gid){var g=goal(gid),fr=Math.max(0,pos(LG).available);
 form({title:"مساهمة في "+g.name,sub:"المتاح غير المخصص "+F(fr)+" — المساهمة تخصيص لا حركة نقدية",ok:"تخصيص",
 fields:[{k:"amount",label:"المبلغ (دج)",t:"money",req:1,min:1},
 {k:"occurredOn",label:"التاريخ",t:"date",val:today(),req:1},
 {k:"unfunded",label:"تخصيص غير ممول",t:"tog",hint:"يسمح بتجاوز المتاح ويُعرض صراحة كغير ممول"},
 {k:"note",label:"ملاحظة",val:"مساهمة"}],
 onSubmit:function(v){return commit(function(lg){return alloc(lg,{goalId:gid,amount:v.amount,occurredOn:v.occurredOn,
  opId:oid(),note:v.note,unfunded:v.unfunded})},"تم تخصيص "+F(v.amount))}})}
function fRel(gid){var b=gbal(LG,gid);
 form({title:"تحرير من الهدف",sub:"الرصيد "+F(b)+" — يعود المتاح للإنفاق والنقد لا يتغير",ok:"تحرير",
 fields:[{k:"amount",label:"المبلغ (دج)",t:"money",req:1,min:1},
 {k:"occurredOn",label:"التاريخ",t:"date",val:today(),req:1},{k:"reason",label:"السبب",t:"area",val:"تعديل خطة"}],
 onSubmit:function(v){if(v.amount>b)return{errors:{amount:"يتجاوز رصيد الهدف"}};
  return commit(function(lg){return release(lg,{goalId:gid,amount:v.amount,occurredOn:v.occurredOn,opId:oid(),reason:v.reason})},"تم التحرير")}})}
function fBuy(gid){var b=gbal(LG,gid);
 form({title:"شراء من الهدف",sub:"رصيد الهدف "+F(b)+" — مصروف واحد فقط والنقد ينخفض مرة واحدة",ok:"تسجيل الشراء",
 fields:[{k:"amount",label:"ثمن الشراء (دج)",t:"money",req:1,min:1},
 {k:"categoryId",label:"التصنيف",t:"pick",val:"other",opts:catOpts()},
 {k:"occurredOn",label:"التاريخ",t:"date",val:today(),req:1},
 {k:"title",label:"ماذا اشتريت؟",req:1,ph:"هاتف سامسونغ"},{k:"note",label:"ملاحظة",t:"area"}],
 onSubmit:function(v){return commit(function(lg){return goalBuy(lg,{goalId:gid,amount:v.amount,categoryId:v.categoryId,
  occurredOn:v.occurredOn,opId:oid(),title:v.title,note:v.note})},"تم الشراء — حُرّر "+F(Math.min(v.amount,b))+" من الهدف")}})}
function fBud(id){var b=id?find(LG.budgets,id):null;
 form({title:b?"تعديل ميزانية":"ميزانية جديدة",sub:"حد تخطيطي — لا يخصم نقداً ولا ينشئ ديناً عند تجاوزه",ok:"حفظ",
 fields:[{k:"categoryId",label:"التصنيف",t:"pick",val:b?b.categoryId:"food",opts:catOpts()},
 {k:"amount",label:"الحد الشهري (دج)",t:"money",req:1,min:1,val:b?M.f(b.amount):""},
 {k:"name",label:"الاسم",val:b?b.name:"",ph:"يُشتق من التصنيف إن تُرك"}],
 onSubmit:function(v){return commit(function(lg){
  if(b){var t=find(lg.budgets,id);t.amount=v.amount;t.categoryId=v.categoryId;t.name=v.name||cat(v.categoryId)[1]}
  else{var r=D.mr(D.mk(today()));lg.budgets.push({id:uid("bd"),name:v.name||cat(v.categoryId)[1],categoryId:v.categoryId,
   amount:v.amount,periodStart:r.start,periodEnd:r.end,note:"",createdAt:D.now()})}
  lg.audit.push({id:uid("au"),at:D.now(),action:b?"BUDGET_EDIT":"BUDGET_NEW",entity:"budget",entityId:b?b.id:"new",
   opId:oid(),before:b?{amount:b.amount}:null,after:{amount:v.amount},reason:null})},b?"تم تعديل الحد":"تم إنشاء الميزانية")}})}
function fCmt(id){var c=id?find(LG.commitments,id):null;
 form({title:c?"تعديل التزام":"التزام متكرر",sub:"التغيير يسري على الاستحقاقات القادمة فقط — السابقة محفوظة",ok:"حفظ",
 fields:[{k:"name",label:"الاسم",req:1,val:c?c.name:"",ph:"إيجار الشقة"},
 {k:"amount",label:"المبلغ المتوقع (دج)",t:"money",req:1,min:1,val:c?M.f(c.amount):""},
 {k:"anchorDay",label:"يوم الاستحقاق شهرياً",t:"number",val:c?c.anchorDay:5,req:1,hint:"إن لم يوجد اليوم في شهر قصير يُستخدم آخر يوم فيه"},
 {k:"categoryId",label:"التصنيف",t:"pick",val:c?c.categoryId:"home",opts:catOpts()},
 {k:"startOn",label:"تاريخ البداية",t:"date",val:c?c.startOn:today(),req:1},
 {k:"graceDays",label:"فترة السماح (أيام)",t:"number",val:c?c.graceDays:3},
 {k:"payeeId",label:"المستفيد",t:"select",val:c?c.payeeId||"":"",opts:[["","— بدون —"]].concat(pOpts())}],
 onSubmit:function(v){var dy=Math.min(31,Math.max(1,Math.round(v.anchorDay)));
  return commit(function(lg){
   if(c){var t=find(lg.commitments,id);t.name=v.name;t.amount=v.amount;t.anchorDay=dy;t.categoryId=v.categoryId;
    t.graceDays=v.graceDays;t.payeeId=v.payeeId||null;
    lg.occurrences.forEach(function(o){if(o.commitmentId===id&&o.paid===0&&o.dueOn>=today())o.amount=v.amount})}
   else lg.commitments.push({id:uid("cm"),name:v.name,amount:v.amount,anchorDay:dy,startOn:v.startOn,endOn:null,
    categoryId:v.categoryId,payeeId:v.payeeId||null,graceDays:v.graceDays,status:"ACTIVE",note:"",createdAt:D.now()});
   materialize(lg,45)},c?"تم التعديل":"تم إنشاء الالتزام")}})}
function fPay(oid2){var o=find(LG.occurrences,oid2),c=find(LG.commitments,o.commitmentId)||{},lf=o.amount-o.paid;
 form({title:"دفع "+(c.name||"التزام"),sub:"المتبقي "+F(lf)+" — يُسجّل مصروف بتاريخ الدفع والاستحقاق يحتفظ بتاريخه",ok:"تسجيل الدفع",
 fields:[{k:"amount",label:"المبلغ المدفوع (دج)",t:"money",req:1,min:1,val:M.f(lf)},
 {k:"occurredOn",label:"تاريخ الدفع الفعلي",t:"date",val:today(),req:1},{k:"note",label:"ملاحظة",t:"area"}],
 onSubmit:function(v){if(v.amount>lf)return{errors:{amount:"يتجاوز المتبقي "+F(lf)}};
  return commit(function(lg){materialize(lg,45);
   return post(lg,{type:"EXP",amount:v.amount,categoryId:c.categoryId||"other",occurredOn:v.occurredOn,opId:oid(),
    title:(c.name||"التزام")+" — "+D.ml(o.periodKey),partyId:c.payeeId||null,occurrenceId:oid2,note:v.note})},
   v.amount>=lf?"تم الدفع بالكامل":"دفع جزئي — يتبقى "+F(lf-v.amount))}})}
function fItem(){form({title:"مادة جديدة",ok:"حفظ",
 fields:[{k:"name",label:"الاسم بالعربية",req:1,ph:"طماطم"},{k:"nameFr",label:"الاسم بالفرنسية",ph:"Tomate"},
 {k:"categoryId",label:"التصنيف",t:"pick",val:"veg",opts:catOpts()},
 {k:"unit",label:"وحدة القياس",t:"pick",val:"كغ",opts:[["كغ","كغ"],["غ","غ"],["لتر","لتر"],["مل","مل"],["حبة","حبة"],["علبة","علبة"],["كيس","كيس"],["ربطة","ربطة"]]},
 {k:"brand",label:"العلامة التجارية"},{k:"note",label:"ملاحظات",t:"area"}],
 onSubmit:function(v){return commit(function(lg){lg.items.push({id:uid("it"),name:v.name,nameFr:v.nameFr,
  categoryId:v.categoryId,unit:v.unit,brand:v.brand,note:v.note,status:"ACTIVE",createdAt:D.now()})},"تمت إضافة المادة")}})}
function fPrice(iid){var it=find(LG.items,iid);
 form({title:"سعر جديد — "+it.name,sub:"يُضاف إلى السجل ولا يستبدل السعر السابق",ok:"تسجيل",
 fields:[{k:"amount",label:"السعر (دج) لكل "+it.unit,t:"money",req:1,min:1},
 {k:"store",label:"المتجر",req:1,ph:"سوق المدينة"},{k:"on",label:"التاريخ",t:"date",val:today(),req:1},
 {k:"source",label:"المصدر",t:"pick",val:"شراء فعلي",opts:[["شراء فعلي","شراء فعلي"],["مشاهدة","مشاهدة مباشرة"],["إعلان","إعلان موثّق"]]}],
 onSubmit:function(v){return commit(function(lg){lg.prices.push({id:uid("pr"),itemId:iid,store:v.store,amount:v.amount,
  unit:it.unit,on:v.on,source:v.source,createdAt:D.now()})},"تم تسجيل السعر")}})}
function fInv(){ui.inv=[];
 function draw(){var tt=M.sum(ui.inv.map(function(l){return l.total})),el=$("ivb");if(!el)return;
  el.innerHTML=(ui.inv.length?ui.inv.map(function(l,i){return'<div class="ivl"><div><b>'+esc(l.name)+'</b><small>'+
   M.fq(l.qty)+" "+esc(l.unit)+" × "+N(l.price)+'</small></div><b style="font-family:var(--nm)">'+N(l.total)+
   '</b><button class="rm2" data-r="'+i+'">×</button></div>'}).join(""):'<div class="emp" style="padding:18px">لم تضف عناصر بعد</div>')+
   '<div class="tot"><span>الإجمالي · '+ui.inv.length+' عنصر</span><b>'+N(tt)+'</b></div>';
  el.querySelectorAll("[data-r]").forEach(function(b){b.onclick=function(){ui.inv.splice(+b.dataset.r,1);draw()}})}
 var io=LG.items.length?LG.items.map(function(i){return[i.id,i.name+" ("+i.unit+")"]}):[["","— لا مواد —"]];
 mdl("فاتورة تفصيلية","تنتج مصروفاً واحداً فقط مرتبطاً بها — لا مصروف لكل عنصر.",
 '<div class="fl"><label>المتجر</label><input id="ivs" value="سوق المدينة"></div>'+
 '<div class="fl"><label>التاريخ</label><input id="ivd" type="date" value="'+today()+'"></div>'+
 '<div class="fl"><label>المادة</label><select id="ivi">'+io.map(function(o){return'<option value="'+o[0]+'">'+esc(o[1])+'</option>'}).join("")+'</select></div>'+
 '<div class="f2"><div class="fl"><label>الكمية</label><input id="ivq" value="1" inputmode="decimal"></div>'+
 '<div class="fl"><label>سعر الوحدة (دج)</label><input id="ivp" inputmode="decimal" placeholder="0"></div></div>'+
 '<button class="btn w" id="iva">＋ إضافة عنصر</button><div id="ivb" style="margin-top:14px"></div>',
 '<button class="btn" data-a="close">إلغاء</button><button class="btn p" id="ivok">تأكيد الفاتورة</button>');
 draw();
 function auto(){var it=find(LG.items,$("ivi").value);if(!it)return;
  var ps=LG.prices.filter(function(p){return p.itemId===it.id}).sort(function(a,b){return a.on<b.on?1:-1});
  if(ps[0])$("ivp").value=M.f(ps[0].amount)}
 $("ivi").onchange=auto;auto();
 $("iva").onclick=function(){var it=find(LG.items,$("ivi").value);
  if(!it){toast("أضف مادة إلى الدليل أولاً","err");return}
  var q,p;try{q=M.q($("ivq").value);p=M.c($("ivp").value||"0")}catch(e){toast(e.message,"err");return}
  if(q<=0){toast("الكمية يجب أن تكون موجبة","err");return}
  ui.inv.push({itemId:it.id,name:it.name,unit:it.unit,qty:q,price:p,total:M.ln(q,p),categoryId:it.categoryId});
  $("ivq").value="1";draw()};
 $("ivok").onclick=function(){if(!ui.inv.length){toast("أضف عنصراً واحداً على الأقل","err");return}
  var on=$("ivd").value,st=$("ivs").value.trim();
  if(!D.ok(on)){toast("تاريخ غير صالح","err");return}
  var ls=ui.inv.slice(),tt=M.sum(ls.map(function(l){return l.total}));closeAll();
  commit(function(lg){var iv=uid("iv");
   var r=post(lg,{type:"EXP",amount:tt,categoryId:ls[0].categoryId,occurredOn:on,opId:oid(),
    title:"فاتورة "+(st||"مشتريات"),invoiceId:iv,note:ls.length+" عناصر"});
   lg.invoices.push({id:iv,txId:r.txId,store:st,on:on,detailed:true,lines:ls,total:tt,createdAt:D.now()});
   ls.forEach(function(l){lg.prices.push({id:uid("pr"),itemId:l.itemId,store:st,amount:l.price,unit:l.unit,on:on,source:"فاتورة",createdAt:D.now()})})},
   "تم تسجيل الفاتورة "+F(tt))}}
function fEdit(id){var t=find(LG.transactions,id);
 var fs=[{k:"amount",label:"المبلغ (دج)",t:"money",req:1,min:1,val:M.f(t.amount)},
 {k:"occurredOn",label:"تاريخ الوقوع",t:"date",val:t.occurredOn,req:1},
 {k:"title",label:"الوصف",val:t.title},{k:"reason",label:"سبب التصحيح (إلزامي)",t:"area",req:1,ph:"خطأ في المبلغ"}];
 if(t.type==="EXP")fs.push({k:"categoryId",label:"التصنيف",t:"pick",val:t.categoryId,opts:catOpts()});
 form({title:"تعديل الحركة",sub:"يُنشأ قيد عكس ثم قيد جديد — الأثر القديم محفوظ ولا يُمحى",ok:"ترحيل التصحيح",fields:fs,
 onSubmit:function(v){return commit(function(lg){return correct(lg,id,{type:t.type,amount:v.amount,occurredOn:v.occurredOn,
  title:v.title,categoryId:v.categoryId||t.categoryId,sourceId:t.sourceId,partyId:t.partyId,
  originalTxId:t.originalTxId,goalId:t.goalId,note:t.note},{reason:v.reason,opId:oid()})},"تم التصحيح مع حفظ الأثر")}})}
function fRev(ids){var arr=Array.isArray(ids)?ids:[ids];
 form({title:arr.length>1?"عكس "+arr.length+" حركة":"عكس الحركة",sub:"لا حذف نهائي — يُنشأ قيد مرآة موثّق ويظل الأصل محفوظاً",ok:"عكس",
 fields:[{k:"reason",label:"السبب (إلزامي)",t:"area",req:1,ph:"إدخال مكرر"},
 {k:"occurredOn",label:"تاريخ العكس",t:"date",val:today(),req:1}],
 onSubmit:function(v){return commit(function(lg){var n=0;
  arr.forEach(function(id){var t=find(lg.transactions,id);
   if(t&&t.status==="POSTED"&&t.type!=="REV"){reverse(lg,id,{reason:v.reason,occurredOn:v.occurredOn,opId:oid()});n++}});
  ui.sel={};ui.bulk=false;return n},"تم عكس "+arr.length+" حركة",true)}})}
function fCust(){var p=per();
 form({title:"فترة مخصصة",ok:"تطبيق",fields:[{k:"start",label:"من",t:"date",val:p.start,req:1},{k:"end",label:"إلى",t:"date",val:p.end,req:1}],
 onSubmit:function(v){if(v.start>v.end)return{errors:{end:"يجب أن يكون بعد البداية"}};
  ui.cust={start:v.start,end:v.end};ui.per=null;render();return true}})}
/* ══════════ 12. التصدير والاستعادة ══════════ */
function dl(n,tx,mm){var b=new Blob([tx],{type:mm||"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");
 a.href=u;a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1500)}
function exJ(){var keys=["transactions","entries","lines","goals","savings","budgets","commitments","occurrences","parties","items","prices","invoices","audit"];
 var o={schemaVersion:5,appVersion:"4.0",exportedAt:D.now(),currency:"DZD",scale:2,settings:LG.settings,meta:LG.meta};
 keys.forEach(function(k){o[k]=LG[k]});
 dl("mizanati-backup-"+today()+".json",JSON.stringify(o));toast("تم تصدير النسخة الكاملة","ok")}
function cv(v){var s=String(v==null?"":v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function exC(k){var rows;
 if(k==="lines")rows=[["id","entryId","txId","account","sub","side","amount_centimes","occurredOn"]].concat(
  LG.lines.map(function(l){return[l.id,l.entryId,l.txId,l.account,l.sub||"",l.side,l.amount,l.occurredOn]}));
 else if(k==="prices"){var mp={};LG.items.forEach(function(i){mp[i.id]=i.name});
  rows=[["item","store","amount_centimes","unit","date","source"]].concat(
   LG.prices.map(function(p){return[mp[p.itemId]||p.itemId,p.store,p.amount,p.unit,p.on,p.source]}))}
 else rows=[["id","type","title","amount_centimes","occurredOn","createdAt","category","source","party","status","note"]].concat(
  LG.transactions.map(function(t){return[t.id,t.type,t.title,t.amount,t.occurredOn,t.createdAt,
   t.categoryId?cat(t.categoryId)[1]:"",t.sourceId?src(t.sourceId)[1]:"",t.partyId?(party(t.partyId)||{name:""}).name:"",t.status,t.note]}));
 dl("mizanati-"+k+"-"+today()+".csv","\uFEFF"+rows.map(function(r){return r.map(cv).join(",")}).join("\n"),"text/csv;charset=utf-8");
 toast("تم تصدير CSV","ok")}
function validate(o){var er=[];
 if(!o||typeof o!=="object")er.push("الملف ليس كائن JSON");
 if(o.schemaVersion!==5)er.push("إصدار المخطط غير مدعوم: "+o.schemaVersion+" (المتوقع 5)");
 ["transactions","entries","lines"].forEach(function(k){if(!Array.isArray(o[k]))er.push("مخزن مفقود أو تالف: "+k)});
 if(er.length)return{ok:false,errs:er};
 var ids={};o.transactions.forEach(function(t){if(ids[t.id])er.push("معرّف حركة مكرر");ids[t.id]=1;
  if(!D.ok(t.occurredOn))er.push("تاريخ وقوع غير صالح");if(!M.is(t.amount))er.push("مبلغ غير صحيح")});
 var ei={};o.entries.forEach(function(e){ei[e.id]=1});
 o.lines.forEach(function(l){if(!ei[l.entryId])er.push("سطر يتيم");
  if(!M.is(l.amount)||l.amount<=0)er.push("مبلغ سطر غير صالح");if(!ACC[l.account])er.push("حساب غير معروف: "+l.account)});
 var be={};o.lines.forEach(function(l){(be[l.entryId]=be[l.entryId]||[]).push(l)});
 var dr=0,cr=0;
 Object.keys(be).forEach(function(k){try{bal(be[k])}catch(e){er.push("قيد غير متوازن: "+e.message)}});
 o.lines.forEach(function(l){if(l.side===DR)dr+=l.amount;else cr+=l.amount});
 if(dr!==cr)er.push("ميزان المراجعة غير متوازن");
 return{ok:!er.length,errs:er.slice(0,20),d:dr,c:cr}}
function imp(file){file.text().then(function(txt){var o;
 try{o=JSON.parse(txt)}catch(e){toast("الملف ليس JSON صالحاً","err");return}
 var v=validate(o);
 if(!v.ok){mdl("نسخة مرفوضة","لم تُمسّ بياناتك الحالية",
  '<div class="al bad"><span class="ai">✕</span><div><b>فشل التحقق</b><small>لن تُستبدل بياناتك بملف تالف.</small></div></div>'+
  v.errs.map(function(e){return'<div class="ck f"><span class="cm">✕</span><span class="cn">'+esc(e)+'</span></div>'}).join(""),
  '<button class="btn w" data-a="close">إغلاق</button>');return}
 var tmp=fresh();["transactions","entries","lines","goals","savings","budgets","commitments","occurrences","parties","items","prices","invoices","audit"]
  .forEach(function(k){tmp[k]=o[k]||[]});
 tmp.settings=Object.assign(tmp.settings,o.settings||{});
 var P=pos(tmp);
 mdl("معاينة الاستعادة","تحقّق كامل قبل الاستبدال",
 '<div class="al ok"><span class="ai">✓</span><div><b>الملف سليم ومتوازن</b><small>مدين '+N(v.d)+' = دائن '+N(v.c)+'</small></div></div>'+
 '<div class="kv"><span>الحركات</span><b>'+o.transactions.length+'</b></div>'+
 '<div class="kv"><span>سطور القيود</span><b>'+o.lines.length+'</b></div>'+
 '<div class="kv"><span>الأهداف</span><b>'+(o.goals||[]).length+'</b></div>'+
 '<div class="kv"><span>النقد المعاد بناؤه</span><b class="pos">'+N(P.cash)+' دج</b></div>'+
 '<div class="kv"><span>صافي الثروة</span><b>'+N(P.net)+' دج</b></div>'+
 '<div class="al warn" style="margin-top:13px"><span class="ai">⚠</span><div><b>سيُستبدل دفترك الحالي</b><small>ستُصدَّر نسخة من بياناتك تلقائياً قبل الاستبدال.</small></div></div>',
 '<button class="btn" data-a="close">إلغاء</button><button class="btn p" id="doimp">استعادة الآن</button>');
 $("doimp").onclick=function(){closeAll();exJ();var bk=clone(LG);LG=tmp;LG.meta.init=true;
  save(LG).then(function(){var c=integrity(LG);
   if(!c.ok){LG=bk;return save(LG).then(function(){render();toast("فشل التحقق بعد الاستعادة — تم التراجع","err")})}
   render();toast("تمت الاستعادة بنجاح","ok")},function(){LG=bk;render();toast("فشلت الاستعادة — بياناتك كما هي","err")})}},
 function(){toast("تعذّر قراءة الملف","err")})}
/* ══════════ 13. فحوص القبول ══════════ */
function checks(){var out=$("cko");if(!out)return;
 out.innerHTML='<div style="padding:20px"><div class="spin"></div></div>';
 var R=[],C=function(n){return M.c(n)};
 function t(n,f){try{f();R.push({n:n,p:true})}catch(e){R.push({n:n,p:false,e:e.message})}}
 function eq(a,b,m){if(a!==b)throw new Error((m||"")+" المتوقع "+b+" والفعلي "+a)}
 function thr(f,c){var x=null;try{f()}catch(e){x=e}
  if(!x)throw new Error("لم يُرفض كما يجب");if(x.code!==c)throw new Error("رمز خاطئ: "+x.code)}
 setTimeout(function(){
 t("1 · دفتر فارغ: الرصيد صفر",function(){var g=fresh();eq(pos(g).cash,0);eq(pos(g).net,0)});
 t("2 · دخل 50,000 − مصروف 10,000 = 40,000",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"salary",occurredOn:"2026-01-01",opId:"k1"});
  post(g,{type:"EXP",amount:C(10000),categoryId:"food",occurredOn:"2026-01-02",opId:"k2"});eq(pos(g).cash,C(40000))});
 t("3 · تخصيص 2,000 لا يغيّر النقد",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"k3"});
  g.goals.push({id:"G",name:"t",target:C(9000),startOn:"2026-01-01",status:"ACTIVE"});
  alloc(g,{goalId:"G",amount:C(2000),occurredOn:"2026-01-02",opId:"k4"});
  eq(pos(g).cash,C(50000));eq(pos(g).available,C(48000))});
 t("4 · تحرير 500 لا يغيّر النقد",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"k5"});
  g.goals.push({id:"G",name:"t",target:0,startOn:"2026-01-01",status:"ACTIVE"});
  alloc(g,{goalId:"G",amount:C(2000),occurredOn:"2026-01-02",opId:"k6"});
  release(g,{goalId:"G",amount:C(500),occurredOn:"2026-01-03",opId:"k7"});
  eq(pos(g).cash,C(50000));eq(gbal(g,"G"),C(1500))});
 t("5 · قرض 10,000: صافي الثروة ثابت",function(){var g=fresh();
  post(g,{type:"BRW",amount:C(10000),partyId:"p",occurredOn:"2026-01-01",opId:"k8"});
  eq(pos(g).cash,C(10000));eq(pos(g).debt,C(10000));eq(pos(g).net,0);eq(pos(g).income,0)});
 t("6 · تسديد أصل 2,000 ليس مصروفاً",function(){var g=fresh();
  post(g,{type:"BRW",amount:C(10000),partyId:"p",occurredOn:"2026-01-01",opId:"k9"});
  post(g,{type:"DPY",amount:C(2000),principal:C(2000),fees:0,partyId:"p",occurredOn:"2026-01-02",opId:"k10"});
  eq(pos(g).cash,C(8000));eq(pos(g).debt,C(8000));eq(pos(g).expense,0)});
 t("6ب · دفعة 3,000 = 2,500 أصل + 500 رسوم",function(){var g=fresh();
  post(g,{type:"BRW",amount:C(10000),partyId:"p",occurredOn:"2026-01-01",opId:"k11"});
  post(g,{type:"DPY",amount:C(3000),principal:C(2500),fees:C(500),partyId:"p",occurredOn:"2026-01-02",opId:"k12"});
  eq(pos(g).cash,C(7000));eq(pos(g).debt,C(7500));eq(pos(g).expense,C(500))});
 t("7 · إقراض 3,000 يرفع الحقوق",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"k13"});
  post(g,{type:"LND",amount:C(3000),partyId:"p",occurredOn:"2026-01-02",opId:"k14"});
  eq(pos(g).cash,C(47000));eq(pos(g).recv,C(3000));eq(pos(g).net,C(50000))});
 t("8 · تحصيل 1,000 ليس دخلاً",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"k15"});
  post(g,{type:"LND",amount:C(3000),partyId:"p",occurredOn:"2026-01-02",opId:"k16"});
  post(g,{type:"COL",amount:C(1000),partyId:"p",occurredOn:"2026-01-03",opId:"k17"});
  eq(pos(g).cash,C(48000));eq(pos(g).recv,C(2000));eq(pos(g).income,C(50000))});
 t("9 · شراء من هدف: خصم مرة واحدة",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"k18"});
  g.goals.push({id:"G",name:"t",target:C(30000),startOn:"2026-01-01",status:"ACTIVE"});
  alloc(g,{goalId:"G",amount:C(30000),occurredOn:"2026-01-02",opId:"k19"});
  goalBuy(g,{goalId:"G",amount:C(30000),categoryId:"other",occurredOn:"2026-01-03",opId:"k20",title:"شراء"});
  eq(pos(g).cash,C(20000));eq(pos(g).expense,C(30000));eq(gbal(g,"G"),0);
  eq(g.transactions.filter(function(x){return x.type==="EXP"}).length,1)});
 t("10 · استرجاع 500 من 1,000 → الصافي 500",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"k21"});
  var r=post(g,{type:"EXP",amount:C(1000),categoryId:"food",occurredOn:"2026-01-02",opId:"k22"});
  post(g,{type:"REF",amount:C(500),categoryId:"food",originalTxId:r.txId,occurredOn:"2026-01-03",opId:"k23"});
  eq(pos(g).expense,C(500));eq(pos(g).income,C(50000))});
 t("10ب · الاسترجاع فوق المتبقي مرفوض",function(){var g=fresh();
  var r=post(g,{type:"EXP",amount:C(1000),categoryId:"food",occurredOn:"2026-01-02",opId:"k24"});
  thr(function(){post(g,{type:"REF",amount:C(1500),categoryId:"food",originalTxId:r.txId,occurredOn:"2026-01-03",opId:"k25"})},"REF_BIG")});
 t("16 · يوم 31 في الأشهر القصيرة بلا انزلاق",function(){eq(D.mo("2026-02",31),"2026-02-28");
  eq(D.mo("2026-03",31),"2026-03-31");eq(D.mo("2024-02",31),"2024-02-29");eq(D.mo("2026-04",31),"2026-04-30")});
 t("25 · السنة الكبيسة",function(){eq(D.dim(2024,2),29);eq(D.dim(2026,2),28);eq(D.dim(1900,2),28);
  eq(D.dim(2000,2),29);eq(D.diff("2024-02-28","2024-03-01"),2)});
 t("22 · حركة قديمة في فترة وقوعها",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"s",occurredOn:"2026-03-01",opId:"k26"});
  post(g,{type:"EXP",amount:C(7000),categoryId:"f",occurredOn:"2026-01-15",opId:"k27"});
  eq(pos(g,"2026-01-31").cash,C(-7000));eq(pos(g,"2026-03-31").cash,C(43000))});
 t("24 · فلاتر الشهر والسنة عبر الحدود",function(){eq(D.per("lastMonth","2026-01-05").start,"2025-12-01");
  eq(D.mr("2026-02").end,"2026-02-28");eq(D.am("2026-12",1),"2027-01")});
 t("26 · تكرار العملية مرفوض",function(){var g=fresh();
  post(g,{type:"INC",amount:C(1000),sourceId:"s",occurredOn:"2026-01-01",opId:"dup"});
  thr(function(){post(g,{type:"INC",amount:C(1000),sourceId:"s",occurredOn:"2026-01-01",opId:"dup"})},"DUP");
  eq(g.transactions.length,1)});
 t("27 · فشل التحقق لا يترك نصف عملية",function(){var g=fresh();var n=g.lines.length,a=g.audit.length;
  thr(function(){post(g,{type:"DPY",amount:C(3000),principal:C(2000),fees:C(500),partyId:"p",occurredOn:"2026-01-01",opId:"k28"})},"SPLIT");
  eq(g.lines.length,n);eq(g.audit.length,a)});
 t("28 · عكس الحركة مرتين ممنوع",function(){var g=fresh();
  var r=post(g,{type:"EXP",amount:C(1000),categoryId:"f",occurredOn:"2026-01-01",opId:"k29"});
  reverse(g,r.txId,{reason:"خطأ",opId:"k30"});eq(pos(g).cash,0);
  thr(function(){reverse(g,r.txId,{reason:"ثانٍ",opId:"k31"})},"ALREADY")});
 t("32 · إعادة البناء تطابق المعروض",function(){var g=fresh();
  post(g,{type:"INC",amount:C(50000),sourceId:"s",occurredOn:"2026-01-01",opId:"k32"});
  post(g,{type:"EXP",amount:C(12345),categoryId:"f",occurredOn:"2026-01-02",opId:"k33"});
  post(g,{type:"BRW",amount:C(10000),partyId:"p",occurredOn:"2026-01-03",opId:"k34"});
  post(g,{type:"ADJ",amount:C(150),occurredOn:"2026-01-04",opId:"k35",reason:"جرد"});
  var p=pos(g),s=rebuild(g);eq(p.cash,s.nat.CASH);eq(s.debit,s.credit);eq(integrity(g).ok,true)});
 t("38 · مجموع الأسطر المعروضة = الإجمالي",function(){var q=M.q("1"),a=M.ln(q,C("10.40")),b=M.ln(q,C("10.40"));
  eq(M.f(a),"10.40");eq(M.f(M.sum([a,b])),"20.80");eq(M.c(M.f(a))+M.c(M.f(b)),M.c(M.f(M.sum([a,b]))))});
 t("مال · لا تقريب صامت لأدق من السنتيم",function(){thr(function(){M.c("10.455")},"SUB_CENT");
  eq(M.parse("10.455",{round:true}).cents,1046)});
 t("التزام · لا استحقاق مكرر للفترة",function(){var g=fresh();
  g.commitments.push({id:"C",name:"إيجار",amount:C(25000),anchorDay:5,startOn:"2026-01-01",endOn:null,
   categoryId:"home",graceDays:3,status:"ACTIVE"});
  materialize(g,45);var n=g.occurrences.length;materialize(g,45);eq(g.occurrences.length,n);eq(integrity(g).ok,true)});
 t("التزام · دفع جزئي يبقي الباقي",function(){var g=fresh();
  g.commitments.push({id:"C",name:"إيجار",amount:C(25000),anchorDay:5,startOn:"2026-01-01",endOn:null,
   categoryId:"home",graceDays:3,status:"ACTIVE"});
  materialize(g,45);var o=g.occurrences[0];
  post(g,{type:"EXP",amount:C(20000),categoryId:"home",occurredOn:D.today(),opId:"k36",occurrenceId:o.id});
  eq(o.status,"PARTIAL");eq(o.amount-o.paid,C(5000))});
 t("دورة الراتب 31 لا تتداخل",function(){var a=D.cyc("2026-01-31",31),b=D.cyc("2026-03-01",31);
  eq(a.end,"2026-02-27");eq(b.start,"2026-02-28");if(!(a.end<b.start))throw new Error("تداخل")});
 t("سلامة دفترك الحالي",function(){var c=integrity(LG);if(!c.ok)throw new Error(c.problems.join(" · "))});
 var ps=R.filter(function(r){return r.p}).length;
 out.innerHTML='<div class="al '+(ps===R.length?"ok":"bad")+'"><span class="ai">'+(ps===R.length?"✓":"✕")+
 '</span><div><b>'+ps+" / "+R.length+" اختبار ناجح</b><small>نُفّذت الآن في متصفحك على المحرك الفعلي</small></div></div>'+
 R.map(function(r){return'<div class="ck '+(r.p?"p":"f")+'"><span class="cm">'+(r.p?"✓":"✕")+'</span><span class="cn">'+esc(r.n)+
 (r.p?"":'<br><small style="color:var(--cor2)">'+esc(r.e)+'</small>')+'</span></div>'}).join("")},40)}
/* ══════════ 14. الإجراءات ══════════ */
var A={
 go:function(d){closeAll();route=d.to;sub=d.sub||"";ui.sel={};ui.bulk=false;G.scrollTo(0,0);render()},
 close:closeAll,
 theme:function(){LG.settings.theme=LG.settings.theme==="light"?"dark":"light";
  document.body.classList.toggle("light",LG.settings.theme==="light");
  $("tico").textContent=LG.settings.theme==="light"?"☀":"◐";save(LG);render()},
 add:function(){var a=[["inc","💵","دخل","var(--em2)"],["exp","💸","مصروف","var(--cor)"],
  ["inv","🧾","فاتورة","var(--amb)"],["aq","🎯","ادخار","var(--gold)"],["oq","🗓","دفع التزام","var(--vio)"],
  ["brw","🤝","دين","var(--teal)"],["lnd","🫱","حق مالي","var(--blue)"],["adj","⚖","تسوية","var(--mut)"]];
  sht('<h3>إضافة عملية</h3><div class="sub">كل إجراء نموذج حقيقي بتحقق كامل قبل الحفظ</div><div class="acts">'+
  a.map(function(x){return'<button data-a="'+x[0]+'" style="--c:'+x[3]+'"><span class="ai">'+x[1]+'</span><small>'+x[2]+'</small></button>'}).join("")+'</div>')},
 inc:function(){closeAll();fInc()},exp:function(){closeAll();fExp()},inv:function(){closeAll();fInv()},
 adj:function(){closeAll();fAdj()},brw:function(){closeAll();fBrw()},lnd:function(){closeAll();fLnd()},
 pnew:function(){fParty()},
 aq:function(){closeAll();var gs=LG.goals.filter(function(g){return g.status==="ACTIVE"});
  if(!gs.length){fGoal();return}if(gs.length===1){fAlloc(gs[0].id);return}
  sht('<h3>اختر الهدف</h3><div class="sub">المساهمة تخصيص داخل نقدك</div><div class="rows">'+
  gs.map(function(g){return'<button class="row" data-a="alloc" data-id="'+g.id+'"><div class="ri">'+(g.icon||"🎯")+'</div>'+
   '<div class="rm"><b>'+esc(g.name)+'</b><small>الرصيد '+N(gbal(LG,g.id))+' دج</small></div></button>'}).join("")+'</div>')},
 alloc:function(d){closeAll();fAlloc(d.id)},rel:function(d){closeAll();fRel(d.id)},buy:function(d){closeAll();fBuy(d.id)},
 goalnew:function(){fGoal()},goal:function(d){dGoal(d.id)},
 gtog:function(d){commit(function(lg){var g=find(lg.goals,d.id);g.status=g.status==="ACTIVE"?"PAUSED":"ACTIVE"},"تم تحديث حالة الهدف")},
 oq:function(){closeAll();materialize(LG,45);
  var os=LG.occurrences.filter(function(o){return["DUE","OVERDUE","PARTIAL"].indexOf(o.status)>=0});
  if(!os.length){toast("لا استحقاقات مفتوحة الآن","ok");return}
  sht('<h3>دفع استحقاق</h3><div class="sub">اختر الالتزام المراد دفعه</div><div class="rows">'+
  os.map(function(o){var c=find(LG.commitments,o.commitmentId)||{};
   return'<button class="row" data-a="pay" data-id="'+o.id+'"><div class="ri">'+cat(c.categoryId||"other")[2]+'</div>'+
   '<div class="rm"><b>'+esc(c.name||"التزام")+'</b><small>'+esc(o.dueOn)+' · متبقٍ '+N(o.amount-o.paid)+'</small></div></button>'}).join("")+'</div>')},
 pay:function(d){closeAll();fPay(d.id)},occ:function(d){dOcc(d.id)},
 skip:function(d){closeAll();commit(function(lg){var o=find(lg.occurrences,d.id);o.status="SKIPPED";
  lg.audit.push({id:uid("au"),at:D.now(),action:"SKIP",entity:"occurrence",entityId:d.id,opId:oid(),
   before:{status:"DUE"},after:{status:"SKIPPED"},reason:"تخطي بموافقة المستخدم"})},"تم التخطي بموافقتك",true)},
 cmnew:function(){fCmt()},cmedit:function(d){fCmt(d.id)},
 cmtog:function(d){commit(function(lg){var c=find(lg.commitments,d.id);c.status=c.status==="ACTIVE"?"PAUSED":"ACTIVE";
  if(c.status!=="ACTIVE")lg.occurrences=lg.occurrences.filter(function(o){return o.commitmentId!==d.id||o.paid>0||o.dueOn<today()});
  materialize(lg,45)},"تم تحديث الالتزام")},
 budnew:function(){fBud()},budedit:function(d){fBud(d.id)},
 buddel:function(d){commit(function(lg){lg.budgets=lg.budgets.filter(function(b){return b.id!==d.id})},"تم حذف الميزانية",true)},
 bud:function(d){dBud(d.id)},dpy:function(d){fDpy(d.id)},frg:function(d){fFrg(d.id)},
 col:function(d){fCol(d.id)},wof:function(d){fWof(d.id)},pt:function(d){dParty(d.id)},
 itnew:function(){fItem()},it:function(d){dItem(d.id)},pradd:function(d){closeAll();fPrice(d.id)},
 ivd:function(d){dInv(d.id)},tx:function(d){dTx(d.id)},txedit:function(d){closeAll();fEdit(d.id)},
 rev:function(d){closeAll();fRev(d.id)},ref:function(d){closeAll();fRef(d.id)},
 cash:dCash,avail:dAvail,fl:function(d){dFlow(d.k)},
 catd:function(d){dCat(d.id,d.f,d.t)},srcd:function(d){dSrc(d.id,d.f,d.t)},mon:function(d){dMon(d.k)},
 per:function(d){ui.per=d.k;ui.cust=null;LG.settings.period=d.k;save(LG);render()},
 cust:function(){fCust()},flt:function(d){ui.filter=d.k;render()},
 rep:function(d){ui.rep=d.k;render()},dtab:function(d){ui.dt=d.k;render()},
 bulk:function(){ui.bulk=!ui.bulk;ui.sel={};render()},
 bsel:function(d){if(ui.sel[d.id])delete ui.sel[d.id];else ui.sel[d.id]=1;render()},
 ball:function(){visTx().forEach(function(t){if(t.status==="POSTED"&&t.type!=="REV")ui.sel[t.id]=1});render()},
 brev:function(){fRev(Object.keys(ui.sel))},
 exj:exJ,exc:function(d){exC(d.k)},imp:function(){$("fp").click()},
 persist:function(){Promise.resolve(navigator.storage&&navigator.storage.persist?navigator.storage.persist():false)
  .then(function(ok){toast(ok?"تم تفعيل حماية التخزين":"المتصفح رفض الحماية — صدّر نسخاً دورياً",ok?"ok":"err");stInfo()})
  .catch(function(){toast("الحماية غير مدعومة هنا","err")})},
 wipe:function(){mdl("مسح كل البيانات","لا يمكن التراجع بعد التأكيد",
  '<div class="al bad"><span class="ai">⚠</span><div><b>سيُمسح دفترك بالكامل</b><small>الحركات والقيود والأهداف والالتزامات وسجل التدقيق.</small></div></div>'+
  '<p style="font-size:12.5px;color:var(--mut);line-height:1.8">سنصدّر نسخة JSON من بياناتك الحالية تلقائياً قبل المسح.</p>',
  '<button class="btn" data-a="close">إلغاء</button><button class="btn d" id="dw">صدّر ثم امسح</button>');
  $("dw").onclick=function(){closeAll();exJ();
   wipe().then(function(){LG=fresh();LG.meta.init=true;return save(LG)})
   .then(function(){route="home";sub="";render();toast("تم المسح — دفترك يبدأ من صفر","ok")},function(){toast("فشل المسح","err")})}},
 real:function(){mdl("بدء حسابك الحقيقي","سيُزال وضع الاستكشاف",
  '<div class="al info"><span class="ai">◈</span><div><b>البيانات التجريبية ستُزال</b><small>لن تُخلط أبداً بأموالك الحقيقية.</small></div></div>'+
  '<p style="font-size:12.5px;color:var(--mut);line-height:1.8">دفتر جديد فارغ تماماً: نقد صفر، لا حركات، لا أهداف. التصنيفات الافتراضية فقط.</p>',
  '<button class="btn" data-a="close">إلغاء</button><button class="btn p" id="dr2">ابدأ من الصفر</button>');
  $("dr2").onclick=function(){closeAll();
   wipe().then(function(){LG=fresh();LG.meta.init=true;LG.settings.demo=false;return save(LG)})
   .then(function(){route="home";sub="";render();toast("دفترك الحقيقي جاهز — ابدأ بتسجيل دخل","ok")},function(){toast("تعذّر البدء","err")})}},
 demo:function(){if(LG.settings.demo){A.real();return}
  mdl("تفعيل وضع الاستكشاف","بيانات تجريبية منفصلة",
  '<div class="al warn"><span class="ai">⚗</span><div><b>سيُستبدل دفترك الحالي ببيانات تجريبية</b><small>سنصدّر نسخة من بياناتك الحقيقية أولاً.</small></div></div>',
  '<button class="btn" data-a="close">إلغاء</button><button class="btn p" id="dd">صدّر ثم فعّل</button>');
  $("dd").onclick=function(){closeAll();exJ();LG=seed();
   save(LG).then(function(){render();toast("وضع الاستكشاف مفعّل","ok")},function(){toast("تعذّر التفعيل","err")})}},
 check:checks,
 catnew:function(){form({title:"تصنيف جديد",ok:"إضافة",fields:[{k:"name",label:"الاسم",req:1},{k:"icon",label:"أيقونة",val:"📦"},
  {k:"color",label:"اللون",t:"pick",val:"#5B8FF9",opts:PAL.slice(0,8).map(function(c){return[c,"●"]})}],
  onSubmit:function(v){return commit(function(lg){lg.settings.categories.push(["c_"+Date.now().toString(36),v.name,v.icon||"📦",v.color])},"تمت إضافة التصنيف")}})},
 srcnew:function(){form({title:"مصدر دخل جديد",ok:"إضافة",fields:[{k:"name",label:"الاسم",req:1},{k:"icon",label:"أيقونة",val:"📥"}],
  onSubmit:function(v){return commit(function(lg){lg.settings.sources.push(["s_"+Date.now().toString(36),v.name,v.icon||"📥"])},"تمت إضافة المصدر")}})}
};
/* ══════════ 15. الهيكل والأحداث ══════════ */
function shell(){document.body.innerHTML=
 '<div class="aur" aria-hidden="true"><i></i><i></i><i></i></div><div class="grain" aria-hidden="true"></div>'+
 '<header class="top"><div class="brand"><div class="mark">م</div><div><b>ميزانيتي</b><small>دفتر مالي قابل للمراجعة</small></div></div>'+
 '<div class="tacts"><button class="ico" data-a="go" data-to="tx" aria-label="بحث">⌕</button>'+
 '<button class="ico" data-a="theme" id="tico" aria-label="المظهر">◐</button></div></header>'+
 '<div id="demo" class="demo" hidden><span>⚗ وضع الاستكشاف — بيانات تجريبية ليست أموالك</span><button data-a="real">ابدأ حسابي الحقيقي</button></div>'+
 '<main id="app"><div style="padding:80px 0;text-align:center;color:var(--mut)"><div class="spin"></div><p style="font-size:12px;margin-top:14px">جارٍ فتح دفترك…</p></div></main>'+
 '<nav class="tabbar"><button class="tab on" data-a="go" data-to="home"><span>◈</span><small>الرئيسية</small></button>'+
 '<button class="tab" data-a="go" data-to="tx"><span>≡</span><small>الحركات</small></button>'+
 '<button class="fab" data-a="add" aria-label="إضافة">＋</button>'+
 '<button class="tab" data-a="go" data-to="reports"><span>◔</span><small>التقارير</small></button>'+
 '<button class="tab" data-a="go" data-to="more"><span>⋯</span><small>المزيد</small></button></nav>'+
 '<div id="scrim" class="scrim" data-a="close"></div>'+
 '<aside id="drw" class="drw" role="dialog" aria-modal="true"></aside>'+
 '<div id="mdl" class="mdl" role="dialog" aria-modal="true"></div>'+
 '<div id="sht" class="sht" role="dialog" aria-modal="true"></div>'+
 '<div id="tst" class="tst" role="status" aria-live="polite"></div>'+
 '<input type="file" id="fp" accept="application/json,.json" hidden>'}
document.addEventListener("click",function(e){
 var b=e.target.closest?e.target.closest("[data-a]"):null;if(!b)return;
 var a=b.dataset.a;if(A[a]){e.preventDefault();A[a](b.dataset,b,e)}});
document.addEventListener("change",function(e){var t=e.target;
 if(t.id==="srt"){ui.sort=t.value;render()}
 if(t.id==="fp"&&t.files[0]){imp(t.files[0]);t.value=""}
 if(t.id==="swk"){LG.settings.weekStart=Number(t.value);save(LG);render()}
 if(t.id==="spd"){LG.settings.payday=Math.min(31,Math.max(1,Number(t.value)||18));save(LG);render()}
 if(t.id==="spr"){LG.settings.period=t.value;ui.per=t.value;ui.cust=null;save(LG);render()}});
document.addEventListener("input",function(e){if(e.target.id!=="q")return;
 ui.q=e.target.value;var box=$("txls");if(!box)return;
 var ls=visTx();box.innerHTML=ls.slice(0,300).map(txRow).join("")||'<div class="emp">لا نتائج</div>'});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeAll()});
document.addEventListener("visibilitychange",function(){if(!document.hidden&&LG)render()});
setInterval(function(){var d=$("tdy");if(d&&LG&&d.textContent!==D.full(today()))render()},60000);
/* ══════════ 16. الإقلاع ══════════ */
shell();
load().then(function(lg){
 if(lg.meta.empty&&!lg.transactions.length){LG=seed();return save(LG)}
 LG=lg;LG.meta.init=true;materialize(LG,45);return save(LG)})
.then(function(){render();
 var c=integrity(LG);if(!c.ok)toast("تنبيه سلامة: "+c.problems[0],"err");
 if("serviceWorker" in navigator&&location.protocol.indexOf("http")===0)
  navigator.serviceWorker.register("./sw.js").then(function(r){
   r.addEventListener("updatefound",function(){var w=r.installing;if(!w)return;
    w.addEventListener("statechange",function(){if(w.state==="installed"&&navigator.serviceWorker.controller)
     toast("يتوفر تحديث — أغلق التطبيق وأعد فتحه","ok")})})}).catch(function(){})})
.catch(function(e){$("app").innerHTML='<div class="v"><div class="al bad"><span class="ai">✕</span><div>'+
 '<b>تعذّر فتح قاعدة البيانات</b><small>'+esc(e&&e.message||String(e))+'</small></div></div>'+
 '<div class="card"><p style="font-size:12.5px;line-height:1.9;color:var(--mut)">لم نبدأ دفتری فارغاً فوق بياناتك — هذا مقصود لحمايتها. '+
 'أغلق التبويبات الأخرى للتطبيق ثم أعد المحاولة.</p>'+
 '<button class="btn p w" style="margin-top:12px" onclick="location.reload()">إعادة المحاولة</button></div></div>'});
})(window);
