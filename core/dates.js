/* occurredOn = "YYYY-MM-DD" محلي وهو مرجع التقارير. createdAt = UTC للتدقيق فقط.
   ممنوع اشتقاق occurredOn من toISOString(). لا كائن Date في أي حساب تقويمي. */
export const DEFAULT_WEEK_START=6;
export class DateError extends Error{constructor(c,m){super(m);this.name="DateError";this.code=c}}
export function daysFromCivil(y,m,d){const yy=y-(m<=2?1:0),era=Math.floor(yy/400),yoe=yy-era*400,mp=m+(m>2?-3:9);
 const doy=Math.floor((153*mp+2)/5)+d-1,doe=yoe*365+Math.floor(yoe/4)-Math.floor(yoe/100)+doy;
 return era*146097+doe-719468}
export function civilFromDays(z0){const z=z0+719468,era=Math.floor(z/146097),doe=z-era*146097;
 const yoe=Math.floor((doe-Math.floor(doe/1460)+Math.floor(doe/36524)-Math.floor(doe/146096))/365);
 const y=yoe+era*400,doy=doe-(365*yoe+Math.floor(yoe/4)-Math.floor(yoe/100)),mp=Math.floor((5*doy+2)/153);
 const d=doy-Math.floor((153*mp+2)/5)+1,m=mp+(mp<10?3:-9);return{y:y+(m<=2?1:0),m,d}}
export const isLeapYear=y=>(y%4===0&&y%100!==0)||y%400===0;
export function daysInMonth(y,m){if(m<1||m>12)throw new DateError("BAD_MONTH","شهر غير صالح: "+m);
 return[31,isLeapYear(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1]}
export function isISODate(s){if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const[y,m,d]=s.split("-").map(Number);return m>=1&&m<=12&&d>=1&&d<=daysInMonth(y,m)}
export function assertISODate(s,l="date"){if(!isISODate(s))throw new DateError("BAD_DATE","تاريخ غير صالح ("+l+"): "+String(s));return s}
export function parseISO(s){assertISODate(s);const[y,m,d]=s.split("-").map(Number);return{y,m,d}}
export const toISO=(y,m,d)=>assertISODate(String(y).padStart(4,"0")+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0"));
export const dayNumber=iso=>{const{y,m,d}=parseISO(iso);return daysFromCivil(y,m,d)};
export const fromDayNumber=n=>{const{y,m,d}=civilFromDays(n);return toISO(y,m,d)};
export const addDays=(iso,n)=>fromDayNumber(dayNumber(iso)+n);
export const diffDays=(a,b)=>dayNumber(b)-dayNumber(a);
export const dayOfWeek=iso=>((dayNumber(iso)+4)%7+7)%7;
export const weekStart=(iso,ws=DEFAULT_WEEK_START)=>addDays(iso,-((dayOfWeek(iso)-ws+7)%7));
export const weekRange=(iso,ws=DEFAULT_WEEK_START)=>{const s=weekStart(iso,ws);return{start:s,end:addDays(s,6)}};
export const monthKey=iso=>assertISODate(iso).slice(0,7);
export function monthRange(k){if(!/^\d{4}-\d{2}$/.test(k))throw new DateError("BAD_MONTH_KEY","مفتاح شهر غير صالح: "+k);
 const[y,m]=k.split("-").map(Number);return{start:toISO(y,m,1),end:toISO(y,m,daysInMonth(y,m))}}
export function addMonths(k,n){const[y0,m0]=k.split("-").map(Number),t=y0*12+(m0-1)+n;
 return String(Math.floor(t/12)).padStart(4,"0")+"-"+String((t%12+12)%12+1).padStart(2,"0")}
export const yearRange=y=>({start:toISO(y,1,1),end:toISO(y,12,31)});
export const clampDay=(y,m,anchor)=>Math.min(anchor,daysInMonth(y,m));
/* §8.6: كل فترة تُحسب من anchorDay الأصلي مستقلاً — لا من الاستحقاق السابق (يمنع الانزلاق) */
export function monthlyDueDate(k,anchor){const[y,m]=k.split("-").map(Number);return toISO(y,m,clampDay(y,m,anchor))}
export function resolvePeriod(name,today,ws=DEFAULT_WEEK_START){
 assertISODate(today,"today");const{y}=parseISO(today);
 switch(name){
  case"today":return{start:today,end:today,label:"اليوم"};
  case"yesterday":{const d=addDays(today,-1);return{start:d,end:d,label:"أمس"}}
  case"thisWeek":return{...weekRange(today,ws),label:"هذا الأسبوع"};
  case"lastWeek":return{...weekRange(addDays(today,-7),ws),label:"الأسبوع السابق"};
  case"thisMonth":return{...monthRange(monthKey(today)),label:"هذا الشهر"};
  case"lastMonth":return{...monthRange(addMonths(monthKey(today),-1)),label:"الشهر السابق"};
  case"thisYear":return{...yearRange(y),label:"هذه السنة"};
  case"lastYear":return{...yearRange(y-1),label:"السنة السابقة"};
  default:throw new DateError("UNKNOWN_PERIOD","فترة غير معروفة: "+name)}}
/* دورة الراتب: النهاية = بداية الدورة التالية − يوم. يمنع تداخل 28 فبراير بين دورتين */
export function salaryCycleStart(today,payday){const{y,m,d}=parseISO(today);let k=toISO(y,m,1).slice(0,7);
 if(d<clampDay(y,m,payday))k=addMonths(k,-1);const[cy,cm]=k.split("-").map(Number);return toISO(cy,cm,clampDay(cy,cm,payday))}
export function salaryCycleRange(today,payday){const s=salaryCycleStart(today,payday),{y,m}=parseISO(s);
 const nk=addMonths(toISO(y,m,1).slice(0,7),1),[ny,nm]=nk.split("-").map(Number);
 return{start:s,end:addDays(toISO(ny,nm,clampDay(ny,nm,payday)),-1)}}
export const cycleWeekIndex=(today,start,max=6)=>Math.max(0,Math.min(Math.floor(diffDays(start,today)/7),max-1));
export const todayLocal=(d=new Date())=>toISO(d.getFullYear(),d.getMonth()+1,d.getDate());
export const nowInstant=()=>new Date().toISOString();
const ARM=["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const ARD=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
export const monthLabelAR=k=>{const[y,m]=k.split("-").map(Number);return ARM[m-1]+" "+y};
export const fullDateLabelAR=iso=>{const{y,m,d}=parseISO(iso);return ARD[dayOfWeek(iso)]+" "+d+" "+ARM[m-1]+" "+y};
