import {
  Address,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

export const RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export type Scholarship = {
  id: number;
  name: string;
  description: string;
  token: string;
  total_fund: string;
  remaining_fund: string;
  per_student: string;
  active: boolean;
};

export type Application = {
  id: number;
  scholarship_id: number;
  student: string;
  status: number; // 0=Pending 1=Approved 2=Rejected 3=Disbursed
};

export const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  1: { label: "Approved", color: "bg-green-100 text-green-800 border-green-200" },
  2: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200" },
  3: { label: "Disbursed", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

// ScVal conversion helpers
export function toScValString(v: string) {
  return nativeToScVal(v, { type: "string" });
}

export function toScValU32(v: number) {
  return nativeToScVal(v, { type: "u32" });
}

export function toScValU64(v: number | bigint) {
  return nativeToScVal(v, { type: "u64" });
}

export function toScValI128(v: string | number | bigint) {
  return nativeToScVal(v, { type: "i128" });
}

export function toScValAddress(v: string) {
  return new Address(v).toScVal();
}

export function toScValBool(v: boolean) {
  return nativeToScVal(v, { type: "bool" });
}

export function fromScValString(sv: xdr.ScVal): string {
  return scValToNative(sv) as string;
}

export function fromScValU32(sv: xdr.ScVal): number {
  return scValToNative(sv) as number;
}

export function fromScValU64(sv: xdr.ScVal): bigint {
  return scValToNative(sv) as bigint;
}

export function fromScValI128(sv: xdr.ScVal): bigint {
  return scValToNative(sv) as bigint;
}

export function fromScValAddress(sv: xdr.ScVal): string {
  return scValToNative(sv) as string;
}

export function fromScValBool(sv: xdr.ScVal): boolean {
  return scValToNative(sv) as boolean;
}

export function fromScValVec(sv: xdr.ScVal): xdr.ScVal[] {
  return scValToNative(sv) as any;
}

// Convert from ScVal to our typed Scholarship struct
export function parseScholarship(sv: xdr.ScVal): Scholarship {
  const map = scValToNative(sv) as Record<string, any>;
  return {
    id: Number(map.id),
    name: String(map.name),
    description: String(map.description),
    token: String(map.token),
    total_fund: String(map.total_fund),
    remaining_fund: String(map.remaining_fund),
    per_student: String(map.per_student),
    active: Boolean(map.active),
  };
}

export function parseApplication(sv: xdr.ScVal): Application {
  const map = scValToNative(sv) as Record<string, any>;
  return {
    id: Number(map.id),
    scholarship_id: Number(map.scholarship_id),
    student: String(map.student),
    status: Number(map.status),
  };
}
