"use client";

import { Scholarship } from "@/lib/utils";
import Link from "next/link";

export default function ScholarshipCard({
  scholarship,
  onFund,
  walletAddress,
}: {
  scholarship: Scholarship;
  onFund?: (id: number) => void;
  walletAddress?: string | null;
}) {
  const total = BigInt(scholarship.total_fund);
  const remaining = BigInt(scholarship.remaining_fund);
  const perStudent = BigInt(scholarship.per_student);
  const fundedPercent = total > BigInt(0) ? Number((remaining * BigInt(100)) / total) : 0;
  const spots = remaining > BigInt(0) ? Number(remaining / perStudent) : 0;

  return (
    <Link
      href={`/scholarships/${scholarship.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 transition-all p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              #{scholarship.id}
            </span>
            {!scholarship.active && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                Inactive
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
            {scholarship.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {scholarship.description}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Fund progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Funding</span>
            <span>{fundedPercent}% remaining</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${fundedPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Per Student</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {formatAmount(perStudent)} ✱
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Available Spots</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {spots}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Total: {formatAmount(total)} ✱</span>
          <span className="font-mono">{scholarship.token.slice(0, 8)}...</span>
        </div>
      </div>
    </Link>
  );
}

function formatAmount(n: bigint): string {
  const num = Number(n) / 10_000_000;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
