"use client";

import { useState } from "react";
import { Application, STATUS_MAP } from "@/lib/utils";

interface Props {
  application: Application;
  isAdmin: boolean;
  onReview?: (id: number, approve: boolean) => Promise<void>;
  onDisburse?: (id: number) => Promise<void>;
}

export default function ApplicationCard({
  application,
  isAdmin,
  onReview,
  onDisburse,
}: Props) {
  const status = STATUS_MAP[application.status] || STATUS_MAP[0];
  const [loading, setLoading] = useState<string | null>(null);
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">App #{application.id}</span>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.color}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 font-mono">
            {application.student.slice(0, 8)}...{application.student.slice(-6)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && application.status === 0 && onReview && (
            <>
              <button
                onClick={() => {
                  setLoading("approve");
                  onReview(application.id, true).finally(() => setLoading(null));
                }}
                disabled={loading !== null}
                className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                {loading === "approve" ? "..." : "Approve"}
              </button>
              <button
                onClick={() => {
                  setLoading("reject");
                  onReview(application.id, false).finally(() => setLoading(null));
                }}
                disabled={loading !== null}
                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {loading === "reject" ? "..." : "Reject"}
              </button>
            </>
          )}
          {isAdmin && application.status === 1 && onDisburse && (
            <button
              onClick={() => {
                setLoading("disburse");
                onDisburse(application.id).finally(() => setLoading(null));
              }}
              disabled={loading !== null}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {loading === "disburse" ? "..." : "Disburse"}
            </button>
          )}
        </div>
      </div>

      {application.status === 3 && (
        <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          ✓ Funds disbursed to student
        </div>
      )}
    </div>
  );
}
