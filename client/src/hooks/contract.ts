"use client";

import {
  rpc,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import {
  RPC_URL,
  NETWORK_PASSPHRASE,
  Scholarship,
  Application,
  parseScholarship,
  parseApplication,
} from "@/lib/utils";

// ⚠️ User must set this after deployment
let CONTRACT_ADDRESS = "";

export function setContractAddress(addr: string) {
  CONTRACT_ADDRESS = addr;
}

export function getContractAddress() {
  return CONTRACT_ADDRESS;
}

const server = new rpc.Server(RPC_URL);

// Public testnet account for read-only simulation source
const PUBLIC_KEY = "GAOQJ3G5Z3LQF7W7XDH5K5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5";

async function getSourceAccount(address?: string) {
  const key = address || PUBLIC_KEY;
  try {
    return await server.getAccount(key);
  } catch {
    // Account doesn't exist, use a fallback approach
    return {
      accountId: () => key,
      sequenceNumber: () => "0",
      sequence: () => 0,
      incrementSequenceNumber: () => 0,
    } as any;
  }
}

function isSuccessSim(
  sim: rpc.Api.SimulateTransactionResponse
): sim is rpc.Api.SimulateTransactionSuccessResponse {
  return !("error" in sim);
}

async function signAndSend(txXdr: string, address: string) {
  const { signedTxXdr } = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  const tx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const sendResp = await server.sendTransaction(tx);
  if (sendResp.status === "PENDING") {
    let result = await server.getTransaction(sendResp.hash);
    let attempts = 0;
    while (result.status === "NOT_FOUND" && attempts < 20) {
      await new Promise((r) => setTimeout(r, 1000));
      result = await server.getTransaction(sendResp.hash);
      attempts++;
    }
    if (result.status === "SUCCESS") {
      return (result as any).returnValue;
    }
    throw new Error(`Transaction failed with status ${result.status}`);
  }
  throw new Error(`Send failed with status: ${sendResp.status}`);
}

async function simulateAndAssemble(
  method: string,
  args: any[],
  source?: string
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const sourceAccount = await getSourceAccount(source);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (!isSuccessSim(sim)) {
    throw new Error(
      "Simulation error: " + JSON.stringify((sim as any).error)
    );
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  return { tx: prepared, sim };
}

// ─── STATE-CHANGING CALLS ────────────────────────────────────────

export async function createScholarship(
  caller: string,
  name: string,
  description: string,
  token: string,
  totalFund: string,
  perStudent: string
) {
  const args = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(name, { type: "string" }),
    nativeToScVal(description, { type: "string" }),
    nativeToScVal(token, { type: "address" }),
    nativeToScVal(totalFund, { type: "i128" }),
    nativeToScVal(perStudent, { type: "i128" }),
  ];
  const { tx } = await simulateAndAssemble(
    "create_scholarship",
    args,
    caller
  );
  const result = await signAndSend(tx.toXDR(), caller);
  return Number(scValToNative(result));
}

export async function applyForScholarship(
  caller: string,
  scholarshipId: number
) {
  const args = [
    nativeToScVal(scholarshipId, { type: "u64" }),
    nativeToScVal(caller, { type: "address" }),
  ];
  const { tx } = await simulateAndAssemble("apply", args, caller);
  const result = await signAndSend(tx.toXDR(), caller);
  return Number(scValToNative(result));
}

export async function reviewApplication(
  caller: string,
  applicationId: number,
  approve: boolean
) {
  const args = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(applicationId, { type: "u64" }),
    nativeToScVal(approve, { type: "bool" }),
  ];
  const { tx } = await simulateAndAssemble(
    "review_application",
    args,
    caller
  );
  await signAndSend(tx.toXDR(), caller);
}

export async function fundScholarship(
  caller: string,
  scholarshipId: number,
  amount: string
) {
  const args = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(scholarshipId, { type: "u64" }),
    nativeToScVal(amount, { type: "i128" }),
  ];
  const { tx } = await simulateAndAssemble(
    "fund_scholarship",
    args,
    caller
  );
  await signAndSend(tx.toXDR(), caller);
}

export async function disburseFunds(
  caller: string,
  applicationId: number
) {
  const args = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(applicationId, { type: "u64" }),
  ];
  const { tx } = await simulateAndAssemble("disburse", args, caller);
  await signAndSend(tx.toXDR(), caller);
}

// ─── READ-ONLY CALLS ─────────────────────────────────────────────

export async function getAdmin(): Promise<string> {
  const { sim } = await simulateAndAssemble("get_admin", []);
  if (sim.result?.retval) {
    return scValToNative(sim.result.retval) as string;
  }
  throw new Error("Failed to get admin");
}

export async function getScholarship(id: number): Promise<Scholarship> {
  const args = [nativeToScVal(id, { type: "u64" })];
  const { sim } = await simulateAndAssemble("get_scholarship", args);
  if (sim.result?.retval) {
    return parseScholarship(sim.result.retval);
  }
  throw new Error("Failed to get scholarship");
}

export async function getApplication(id: number): Promise<Application> {
  const args = [nativeToScVal(id, { type: "u64" })];
  const { sim } = await simulateAndAssemble("get_application", args);
  if (sim.result?.retval) {
    return parseApplication(sim.result.retval);
  }
  throw new Error("Failed to get application");
}

export async function getScholarshipCount(): Promise<number> {
  const { sim } = await simulateAndAssemble("get_scholarship_count", []);
  if (sim.result?.retval) {
    return Number(scValToNative(sim.result.retval));
  }
  return 0;
}

export async function getApplicationCount(): Promise<number> {
  const { sim } = await simulateAndAssemble("get_application_count", []);
  if (sim.result?.retval) {
    return Number(scValToNative(sim.result.retval));
  }
  return 0;
}
