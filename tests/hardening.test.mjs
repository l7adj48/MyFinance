import test from "node:test";
import assert from "node:assert/strict";
import {createLedger,post,reverse,correct,TX,positions,integrityCheck} from "../core/ledger.js";

const day="2026-11-22";
let seq=0;
const op=()=>"hardening-test-"+(++seq);
const cents=n=>Math.round(n*100);
const add=(lg,type,amount,extra={})=>post(lg,{
 type,amount:cents(amount),occurredOn:day,opId:op(),...extra
});
const hasCode=code=>err=>err?.code===code;

test("التصحيح الفاشل لا يغير أي جزء من الدفتر",()=>{
 const lg=createLedger();
 const original=add(lg,TX.EXPENSE,10,{categoryId:"food"});
 const before=JSON.stringify(lg);
 assert.throws(()=>correct(lg,original.txId,{
  type:TX.EXPENSE,amount:cents(8),occurredOn:day
 },{reason:"تصحيح اختبار",opIdReverse:op(),opIdNew:op()}),hasCode("MISSING_FIELD"));
 assert.equal(JSON.stringify(lg),before);
});

test("التصحيح الناجح يعكس الأصل ويرحل البديل",()=>{
 const lg=createLedger();
 const original=add(lg,TX.EXPENSE,10,{categoryId:"food"});
 const result=correct(lg,original.txId,{
  type:TX.EXPENSE,amount:cents(8),categoryId:"transport",occurredOn:day
 },{reason:"تغيير التصنيف والمبلغ",opIdReverse:op(),opIdNew:op()});
 const old=lg.transactions.find(t=>t.id===original.txId);
 const replacement=lg.transactions.find(t=>t.id===result.txId);
 assert.equal(old.status,"REVERSED");
 assert.equal(replacement.status,"POSTED");
 assert.equal(replacement.amount,cents(8));
 assert.equal(replacement.categoryId,"transport");
 assert.equal(replacement.correctionOf,original.txId);
 assert.equal(integrityCheck(lg).ok,true);
});

test("يُمنع عكس مصروف له استرجاع قائم",()=>{
 const lg=createLedger();
 const expense=add(lg,TX.EXPENSE,10,{categoryId:"food"});
 add(lg,TX.REFUND,3,{refundCategory:"food",originalTxId:expense.txId});
 const before=JSON.stringify(lg);
 assert.throws(()=>reverse(lg,expense.txId,{reason:"اختبار",opId:op()}),hasCode("DEPENDENT_TRANSACTIONS"));
 assert.equal(JSON.stringify(lg),before);
});

test("يُمنع عكس قرض له تسديد قائم",()=>{
 const lg=createLedger();
 const loan=add(lg,TX.DEBT_BORROWED,100,{debtId:"debt-1"});
 add(lg,TX.DEBT_PAYMENT,20,{debtId:"debt-1",principal:cents(20),interest:0,fees:0});
 assert.throws(()=>reverse(lg,loan.txId,{reason:"اختبار",opId:op()}),hasCode("DEPENDENT_TRANSACTIONS"));
});

test("يُمنع عكس حق مالي له تحصيل قائم",()=>{
 const lg=createLedger();
 const receivable=add(lg,TX.RECEIVABLE_GIVEN,100,{partyId:"person-1"});
 add(lg,TX.RECEIVABLE_COLLECTED,20,{partyId:"person-1"});
 assert.throws(()=>reverse(lg,receivable.txId,{reason:"اختبار",opId:op()}),hasCode("DEPENDENT_TRANSACTIONS"));
});

test("العكس العادي يبقى ممكناً عند عدم وجود عمليات تابعة",()=>{
 const lg=createLedger();
 const expense=add(lg,TX.EXPENSE,10,{categoryId:"food"});
 const result=reverse(lg,expense.txId,{reason:"إدخال خاطئ",opId:op()});
 assert.ok(result.txId);
 assert.equal(lg.transactions.find(t=>t.id===expense.txId).status,"REVERSED");
 assert.equal(integrityCheck(lg).ok,true);
});
