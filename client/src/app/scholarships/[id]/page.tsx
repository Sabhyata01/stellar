"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useWalletContext } from "@/app/context/WalletProvider";
import ApplicationCard from "@/components/ApplicationCard";
import {
  getScholarship,
  getApplication,
  getAdmin,
  getApplicationCount,
  applyForScholarship,
  reviewApplication,
  disburseFunds,
  fundScholarship,
} from "@/hooks/contract";
import { Scholarship, Application, STATUS_MAP } from "@/lib/utils";

export default function ScholarshipDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { wallet } = useWalletContext();

  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [adminAddr, setAdminAddr] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const s = await getScholarship(id);
      setScholarship(s);

      const count = await getApplicationCount();
      const apps: Application[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const a = await getApplication(i);
          if (a.scholarship_id === id) {
            apps.push(a);
          }
        } catch {}
      }
      setApplications(apps);

      try {
        const admin = await getAdmin();
        setAdminAddr(admin);
      } catch {}
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleApply = async () => {
    if (!wallet.address) return;
    setApplying(true);
    try {
      await applyForScholarship(wallet.address, id);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleReview = async (applicationId: number, approve: boolean) => {
    if (!wallet.address) return;
    await reviewApplication(wallet.address, applicationId, approve);
    await loadData();
  };

  const handleDisburse = async (applicationId: number) => {
    if (!wallet.address) return;
    await disburseFunds(wallet.address, applicationId);
    await loadData();
  };

  const handleFund = async () => {
    if (!wallet.address || !fundAmount) return;
    setFunding(true);
    try {
      await fundScholarship(wallet.address, id, fundAmount);
      await loadData();
      setFundAmount("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFunding(false);
    }
  };

  const isAdmin = !!wallet.address && wallet.address === adminAddr;
  const hasApplied = applications.some(
    (a) => a.student === wallet.address
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !scholarship) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500">{error || "Scholarship not found"}</p>
      </div>
    );
  }

  const remaining = BigInt(scholarship.remaining_fund);
  const perStudent = BigInt(scholarship.per_student);
  const spots = remaining > BigInt(0) ? Number(remaining / perStudent) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <a
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </a>

      {/* Scholarship Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                #{scholarship.id}
              </span>
              {!scholarship.active && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {scholarship.name}
            </h1>
            <p className="text-gray-500">{scholarship.description}</p>
          </div>
          {scholarship.active && wallet.address && !hasApplied && (
            <button
              onClick={handleApply}
              disabled={applying || !wallet.address}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 whitespace-nowrap"
            >
              {applying ? "Applying..." : "Apply Now"}
            </button>
          )}
          {hasApplied && (
            <span className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium">
              ✓ Applied
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Available Spots</p>
            <p className="text-xl font-bold text-gray-900">{spots}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Per Student</p>
            <p className="text-xl font-bold text-gray-900">{formatAmount(perStudent)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Remaining</p>
            <p className="text-xl font-bold text-gray-900">{formatAmount(remaining)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Applications</p>
            <p className="text-xl font-bold text-gray-900">{applications.length}</p>
          </div>
        </div>

        {/* Token & Progress */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-1.5 rounded-lg">
            Token: {scholarship.token.slice(0, 8)}...{scholarship.token.slice(-6)}
          </span>
          <div className="flex-1 w-full sm:w-auto">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Fund utilization</span>
              <span>
                {scholarship.total_fund === "0"
                  ? "0%"
                  : `${(
                      (1 -
                        Number(remaining) / Number(scholarship.total_fund)) *
                      100
                    ).toFixed(0)}%`}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                style={{
                  width: `${(1 - Number(remaining) / Number(scholarship.total_fund)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fund Scholarship (anyone can fund) */}
      {scholarship.active && wallet.address && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Fund This Scholarship</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="Amount in stroops"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
            <button
              onClick={handleFund}
              disabled={funding || !fundAmount}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {funding ? "Sending..." : "Send Funds"}
            </button>
          </div>
        </div>
      )}

      {/* Applications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Applications ({applications.length})
        </h2>
        {applications.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">
            No applications yet
          </p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                isAdmin={isAdmin}
                onReview={handleReview}
                onDisburse={handleDisburse}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatAmount(n: bigint): string {
  const num = Number(n) / 10_000_000;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " ✱";
}
