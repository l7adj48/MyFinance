import {buildTransaction,calculateBalances} from "./ledger.mjs";

/**
 * Converts the v0.2 localStorage transaction shape without changing the source.
 * Unsupported or ambiguous records fail the whole conversion; no balance plug is
 * invented. The caller must back up the legacy state before persisting results.
 */
export function migrateLegacyState(legacy) {
  if(!legacy || typeof legacy!=="object" || !Array.isArray(legacy.transactions))
    throw new TypeError("Legacy state is missing its transactions array");
  const ids=new Set();
  const transactions=legacy.transactions.map((old,index)=>{
    if(!old || !["income","expense"].includes(old.type))
      throw new Error("Unsupported legacy transaction at index "+index);
    if(typeof old.id!=="string" || !old.id || ids.has(old.id))
      throw new Error("Missing or duplicate legacy transaction id at index "+index);
    ids.add(old.id);
    if(!Number.isSafeInteger(old.amount) || old.amount<=0)
      throw new Error("Legacy amount is not a positive whole DZD value at index "+index);
    const occurredAt=old.date;
    const tx=buildTransaction({
      id:"legacy-"+old.id,
      type:old.type,
      amount:old.amount,
      occurredAt,
      createdAt:old.createdAt || new Date(0).toISOString(),
      description:old.title || (old.type==="income"?"دخل قديم":"مصروف قديم"),
      metadata:{legacyId:old.id,legacyKind:old.kind || null,legacyItems:Array.isArray(old.items)?old.items:[]}
    });
    return tx;
  });
  const calculated=calculateBalances(transactions);
  const legacyCash=legacy.cash;
  const cashComparable=Number.isSafeInteger(legacyCash) && legacyCash===calculated.cash;
  return Object.freeze({
    transactions:Object.freeze(transactions),
    calculatedCash:calculated.cash,
    legacyCash:Number.isSafeInteger(legacyCash)?legacyCash:null,
    cashComparable,
    discrepancy:legacyCash===undefined?null:calculated.cash-legacyCash,
    requiresReview:!cashComparable
  });
}
