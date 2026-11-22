/* المال = سنتيم صحيح. لا BigInt (يكسر JSON). لا float. التقريب HALF_UP عند سطر الفاتورة فقط. */
export const CURRENCY="DZD",SCALE=2,QTY_SCALE=1000;
export class MoneyError extends Error{constructor(c,m){super(m);this.name="MoneyError";this.code=c}}
export const isMoney=v=>Number.isSafeInteger(v);
export function assertMoney(v,l="amount"){if(!Number.isSafeInteger(v))throw new MoneyError("NOT_INTEGER_MINOR",l+": يجب عدد صحيح بالسنتيم، وصل "+String(v));return v}
export function parseMoney(input,opts={}){
 const{allowRounding=false,allowNegative=true}=opts;
 if(input===null||input===undefined||input==="")throw new MoneyError("EMPTY","المبلغ فارغ");
 if(typeof input==="number"&&!Number.isFinite(input))throw new MoneyError("NOT_FINITE","مبلغ غير منتهٍ");
 let s=String(input).trim().replace(/[\s\u00A0\u202F,_']/g,"");
 if(!s||s==="-")throw new MoneyError("EMPTY","المبلغ فارغ");
 let neg=false;
 if(s[0]==="-"){neg=true;s=s.slice(1)}else if(s[0]==="+")s=s.slice(1);
 if(!/^\d+(\.\d+)?$/.test(s))throw new MoneyError("BAD_FORMAT","صيغة مبلغ غير صالحة: "+String(input));
 if(neg&&!allowNegative)throw new MoneyError("NEGATIVE_NOT_ALLOWED","المبلغ السالب غير مسموح هنا");
 const dot=s.indexOf("."),ip=dot<0?s:s.slice(0,dot),fr=dot<0?"":s.slice(dot+1);
 let cents=Number(ip)*100+Number((fr+"00").slice(0,2));
 const extra=fr.slice(2);let exact=true,rounded=false;
 if(/[1-9]/.test(extra)){
  exact=false;
  if(!allowRounding)throw new MoneyError("SUB_CENT_PRECISION","«"+String(input)+"» أدق من السنتيم — حدّد سياسة تقريب صريحة");
  if(Number(extra[0])>=5)cents+=1;rounded=true;
 }
 assertMoney(cents,"parsed");
 return{cents:neg?-cents:cents,exact,rounded,original:String(input)};
}
export const toCents=(i,o={})=>parseMoney(i,o).cents;
export function formatMoney(c,o={}){
 assertMoney(c,"format");
 const{withCurrency=false,alwaysMinor=false}=o,neg=c<0,a=Math.abs(c);
 const maj=String(Math.floor(a/100)).replace(/\B(?=(\d{3})+(?!\d))/g,","),min=a%100;
 return(neg?"−":"")+maj+((min||alwaysMinor)?"."+String(min).padStart(2,"0"):"")+(withCurrency?" دج":"");
}
export function parseQty(i){
 if(i===null||i===undefined||i==="")throw new MoneyError("EMPTY_QTY","الكمية فارغة");
 const s=String(i).trim().replace(/[\s\u00A0\u202F,]/g,"");
 if(!/^\d+(\.\d{1,3})?$/.test(s))throw new MoneyError("BAD_QTY","كمية غير صالحة (3 منازل عشرية كحد أقصى): "+i);
 const dot=s.indexOf("."),ip=dot<0?s:s.slice(0,dot),fp=((dot<0?"":s.slice(dot+1))+"000").slice(0,3);
 const q=Number(ip)*1000+Number(fp);
 if(!Number.isSafeInteger(q))throw new MoneyError("QTY_OVERFLOW","كمية خارج المدى الآمن");
 return q;
}
export function divRoundHalfUp(n,d){
 if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d<=0)throw new MoneyError("BAD_DIV","قسمة غير صالحة");
 return(n<0?-1:1)*Math.floor((Math.abs(n)+Math.floor(d/2))/d);
}
export function lineTotal(q,price){
 assertMoney(q,"qty");assertMoney(price,"unitPrice");
 if(q<0||price<0)throw new MoneyError("NEGATIVE_LINE","كمية أو سعر سالب");
 const p=q*price;
 if(!Number.isSafeInteger(p))throw new MoneyError("LINE_OVERFLOW","حاصل ضرب الكمية في السعر تجاوز المدى");
 return divRoundHalfUp(p,1000);
}
export function sumLines(arr){let s=0;for(const v of arr)s+=assertMoney(v,"line");return assertMoney(s,"total")}
export function roundingAdjustment(receipt,sum,max=5){
 assertMoney(receipt,"receipt");assertMoney(sum,"sum");
 const d=receipt-sum;
 if(!d)return{needed:false,amount:0};
 if(Math.abs(d)>max)throw new MoneyError("TOTAL_MISMATCH","فرق الإجمالي "+d+" سنتيم أكبر من سقف التسوية المسموح");
 return{needed:true,amount:d};
}
