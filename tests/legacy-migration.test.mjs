import test from "node:test";
import assert from "node:assert/strict";
import {migrateLegacyState} from "../src/finance/legacy-migration.mjs";

test("migrates supported legacy income and expense without mutating source",()=>{
  const legacy={cash:850,transactions:[
    {id:"a",type:"income",amount:1000,date:"2026-11-18",title:"راتب"},
    {id:"b",type:"expense",amount:150,date:"2026-11-19",title:"خبز",kind:"purchase",items:[{name:"خبز"}]}
  ]};
  const result=migrateLegacyState(legacy);
  assert.equal(result.calculatedCash,850);
  assert.equal(result.cashComparable,true);
  assert.equal(result.transactions.length,2);
  assert.equal(result.transactions[0].metadata.legacyId,"a");
  assert.equal(legacy.transactions[0].id,"a");
});

test("flags cash mismatch instead of inventing an opening balance",()=>{
  const result=migrateLegacyState({cash:900,transactions:[{id:"a",type:"income",amount:1000,date:"2026-11-18"}]});
  assert.equal(result.calculatedCash,1000);
  assert.equal(result.discrepancy,100);
  assert.equal(result.requiresReview,true);
  assert.equal(result.transactions.length,1);
});

test("rejects unsupported, fractional, duplicate, and invalid-date records",()=>{
  assert.throws(()=>migrateLegacyState({transactions:[{id:"x",type:"loan",amount:100,date:"2026-11-18"}]}),/Unsupported/);
  assert.throws(()=>migrateLegacyState({transactions:[{id:"x",type:"expense",amount:1.5,date:"2026-11-18"}]}),/whole DZD/);
  assert.throws(()=>migrateLegacyState({transactions:[{id:"x",type:"income",amount:1,date:"2026-11-18"},{id:"x",type:"income",amount:1,date:"2026-11-18"}]}),/duplicate/);
  assert.throws(()=>migrateLegacyState({transactions:[{id:"x",type:"income",amount:1,date:"2026-02-31"}]}),/occurredAt/);
});
