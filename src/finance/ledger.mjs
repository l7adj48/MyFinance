/**
 * MyFinance accounting kernel.
 * Integer DZD only. Every posted transaction must balance (debits === credits).
 * This module is pure and has no browser or storage dependencies.
 */
export const ACCOUNT = Object.freeze({
  CASH: "ASSET:CASH",
  RECEIVABLE: "ASSET:RECEIVABLE",
  LIABILITY: "LIABILITY:LOANS",
  INCOME: "INCOME:GENERAL",
  EXPENSE: "EXPENSE:GENERAL",
  INTEREST: "EXPENSE:INTEREST",
  REFUNDS: "CONTRA_EXPENSE:REFUNDS"
});

const TYPES = new Set(["income","expense","loan_received","loan_repayment","lend","collect","refund","reversal","opening_balance"]);
const positiveInt = (n, label="amount") => {
  if (!Number.isSafeInteger(n) || n <= 0) throw new TypeError(label+" must be a positive safe integer in DZD");
  return n;
};
const date = value => {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) throw new TypeError("occurredAt must be YYYY-MM-DD");
  const [y,m,d]=value.split("-").map(Number);
  const check=new Date(Date.UTC(y,m-1,d));
  if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d) throw new TypeError("occurredAt must be a real calendar date");
  return value;
};
const entry = (account,debit=0,credit=0) => ({account,debit,credit});
export function createTransaction({id,type,amount,occurredAt,createdAt=new Date().toISOString(),description="",entries,metadata={}}) {
  if (!id || typeof id!=="string") throw new TypeError("A stable transaction id is required");
  if (!TYPES.has(type)) throw new TypeError("Unsupported transaction type");
  positiveInt(amount);
  date(occurredAt);
  if (!Array.isArray(entries) || entries.length<2) throw new TypeError("At least two ledger entries are required");
  let debits=0,credits=0;
  const normalized=entries.map(e=>{
    if (!e || typeof e.account!=="string" || !e.account) throw new TypeError("Invalid ledger account");
    const d=e.debit??0,c=e.credit??0;
    if (!Number.isSafeInteger(d)||d<0||!Number.isSafeInteger(c)||c<0||(d===0)===(c===0)) throw new TypeError("Each entry must have either a positive debit or a positive credit");
    debits+=d;credits+=c;
    if (!Number.isSafeInteger(debits)||!Number.isSafeInteger(credits)) throw new RangeError("Ledger total exceeds safe integer range");
    return entry(e.account,d,c);
  });
  if (debits!==credits) throw new Error("Unbalanced transaction: debits must equal credits");
  if (debits!==amount) throw new Error("Transaction amount must equal its total debit and credit");
  return Object.freeze({id,type,amount,occurredAt,createdAt,description:String(description),entries:Object.freeze(normalized),metadata:Object.freeze({...metadata}),status:"POSTED"});
}
export function buildTransaction(input) {
  const a=positiveInt(input.amount);
  let entries;
  switch(input.type) {
    case "income": entries=[entry(ACCOUNT.CASH,a),entry(ACCOUNT.INCOME,0,a)]; break;
    case "expense": entries=[entry(ACCOUNT.EXPENSE,a),entry(ACCOUNT.CASH,0,a)]; break;
    case "loan_received": entries=[entry(ACCOUNT.CASH,a),entry(ACCOUNT.LIABILITY,0,a)]; break;
    case "loan_repayment": {
      const principal=positiveInt(input.principal,"principal");
      const interest=input.interest??0;
      if(!Number.isSafeInteger(interest)||interest<0||principal+interest!==a) throw new Error("Principal plus interest must equal total repayment");
      entries=[entry(ACCOUNT.LIABILITY,principal),entry(ACCOUNT.CASH,0,principal)];
      if(interest) entries.push(entry(ACCOUNT.INTEREST,interest),entry(ACCOUNT.CASH,0,interest));
      break;
    }
    case "lend": entries=[entry(ACCOUNT.RECEIVABLE,a),entry(ACCOUNT.CASH,0,a)]; break;
    case "collect": entries=[entry(ACCOUNT.CASH,a),entry(ACCOUNT.RECEIVABLE,0,a)]; break;
    case "refund": entries=[entry(ACCOUNT.CASH,a),entry(ACCOUNT.REFUNDS,0,a)]; break;
    case "opening_balance": entries=[entry(ACCOUNT.CASH,a),entry("EQUITY:OPENING",0,a)]; break;
    default: throw new TypeError("Use reverseTransaction to reverse a posted transaction");
  }
  return createTransaction({...input,entries});
}
export function reverseTransaction(original,{id,occurredAt,createdAt=new Date().toISOString(),reason}) {
  if(!original||original.status!=="POSTED") throw new Error("Only a posted transaction can be reversed");
  if(!id||id===original.id) throw new Error("A new reversal id is required");
  if(!reason||!String(reason).trim()) throw new Error("A reversal reason is required");
  const entries=original.entries.map(e=>entry(e.account,e.credit,e.debit));
  return createTransaction({id,type:"reversal",amount:original.amount,occurredAt,createdAt,description:"Reversal: "+original.description,metadata:{reverses:original.id,reason:String(reason).trim()},entries});
}
export function calculateBalances(transactions) {
  const seen=new Set(), balances={};
  for(const tx of transactions) {
    if(tx.status!=="POSTED") continue;
    if(seen.has(tx.id)) throw new Error("Duplicate transaction id: "+tx.id);
    seen.add(tx.id);
    let d=0,c=0;
    for(const e of tx.entries){d+=e.debit;c+=e.credit;balances[e.account]=(balances[e.account]||0)+e.debit-e.credit;}
    if(d!==c) throw new Error("Unbalanced stored transaction: "+tx.id);
  }
  const cash=balances[ACCOUNT.CASH]||0;
  const receivable=balances[ACCOUNT.RECEIVABLE]||0;
  const liabilities=-(balances[ACCOUNT.LIABILITY]||0);
  return Object.freeze({cash,receivable,liabilities,netWorth:cash+receivable-liabilities,available:cash});
}
export function sumAccount(transactions,account,{from,to}={}) {
  return transactions.filter(t=>t.status==="POSTED"&&(!from||t.occurredAt>=from)&&(!to||t.occurredAt<=to))
    .reduce((sum,t)=>sum+t.entries.reduce((n,e)=>n+(e.account===account?e.debit-e.credit:0),0),0);
}
