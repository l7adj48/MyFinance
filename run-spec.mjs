
import {register} from "./tests/spec.test.js";
let results=[], group="";
const T={
 group(n){group=n},
 test(n,fn){try{fn();results.push({n,ok:true,group})}catch(e){results.push({n,ok:false,error:e.stack,group})}},
 eq(a,b,l){if(a!==b)throw new Error((l||"")+" expected "+JSON.stringify(b)+" got "+JSON.stringify(a))},
 ok(c,l){if(!c)throw new Error("failed "+l)},
 throws(fn,code,l){let e;try{fn()}catch(x){e=x}if(!e||e.code!==code)throw new Error((l||"")+" expected throw "+code+" got "+(e?.code||"none"))}
};
register(T);
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok)},null,2));
if(results.some(x=>!x.ok))process.exit(1);
