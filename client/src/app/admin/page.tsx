"use client";

import { useState, useEffect } from "react";
import { useWalletContext } from "@/app/context/WalletProvider";
import {
  getAdmin,
  getScholarshipCount,
  getScholarship,
  getApplicationCount,
  getApplication,
  reviewApplication,
  disburseFunds,
  setContractAddress,
} from "@/hooks/contract";
import { Scholarship, Application, STATUS_MAP } from "@/lib/utils";

export default function AdminPage() {
  const { wallet } = useWalletContext();
  const [adminAddr, setAdminAddr] = useState<string>("");
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const admin = await getAdmin();
      setAdminAddr(admin);

      const sc = await getScholarshipCount();
      const sList: Scholarship[] = [];
      for (let i = 1; i <= sc; i++) {
        try {
          sList.push(await getScholarship(i));
        } catch {}
      }
      setScholarships(sList);

      const ac = await getApplicationCount();
      const aList: Application[] = [];
      for (let i = 1; i <= ac; i++) {
        try {
          aList.push(await getApplication(i));
        } catch {}
      }
      setApplications(aList);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReview = async (appId: number, approve: boolean) => {
    if (!wallet.address) return;
    setActionLoading(appId);
    try {
      await reviewApplication(wallet.address, appId, approve);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisburse = async (appId: number) => {
    if (!wallet.address) return;
    setActionLoading(appId);
    try {
      await disburseFunds(wallet.address, appId);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingApps = applications.filter((a) => a.status === 0);
  const approvedApps = applications.filter((a) => a.status === 1);
  const disbursedApps = applications.filter((a) => a.status === 3);

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

  const isAdmin = !!wallet.address && wallet.address === adminAddr;

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364a9 9 0 10-12.728 0" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">Only the contract admin can access this panel.</p>
        {wallet.address && (
          <p className="text-sm text-gray-400 mt-2 font-mono">
            Your address: {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 mt-1">
          Manage scholarships, review applications, and disburse funds.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Scholarships</p>
          <p className="text-2xl font-bold text-gray-900">{scholarships.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Pending Reviews</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingApps.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approvedApps.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Disbursed</p>
          <p className="text-2xl font-bold text-blue-600">{disbursedApps.length}</p>
        </div>
      </div>

      {/* Applications requiring review */}
      {pendingApps.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Reviews ({pendingApps.length})
          </h2>
          <div className="space-y-3">
            {pendingApps.map((app) => {
              const scholarship = scholarships.find(
                (s) => s.id === app.scholarship_id
              );
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      App #{app.id} — {scholarship?.name || `Scholarship #${app.scholarship_id}`}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      Student: {app.student.slice(0, 8)}...{app.student.slice(-6)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReview(app.id, true)}
                      disabled={actionLoading === app.id}
                      className="px-4 py-2 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === app.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReview(app.id, false)}
                      disabled={actionLoading === app.id}
                      className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === app.id ? "..." : "Reject"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved - ready to disburse */}
      {approvedApps.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ready to Disburse ({approvedApps.length})
          </h2>
          <div className="space-y-3">
            {approvedApps.map((app) => {
              const scholarship = scholarships.find(
                (s) => s.id === app.scholarship_id
              );
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      App #{app.id} — {scholarship?.name || `Scholarship #${app.scholarship_id}`}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      Student: {app.student.slice(0, 8)}...{app.student.slice(-6)}
                      {scholarship && (
                        <span className="ml-2">
                          Amount: {formatAmount(BigInt(scholarship.per_student))}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDisburse(app.id)}
                    disabled={actionLoading === app.id}
                    className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === app.id ? "Sending..." : "Disburse"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All applications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          All Applications ({applications.length})
        </h2>
        {applications.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">
            No applications received yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">ID</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Scholarship</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Student</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Status</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const scholarship = scholarships.find(
                    (s) => s.id === app.scholarship_id
                  );
                  const status = STATUS_MAP[app.status] || STATUS_MAP[0];
                  return (
                    <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 font-mono">#{app.id}</td>
                      <td className="py-3 px-2">
                        {scholarship?.name || `#${app.scholarship_id}`}
                      </td>
                      <td className="py-3 px-2 font-mono text-gray-500">
                        {app.student.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {app.status === 0 && (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleReview(app.id, true)}
                              disabled={actionLoading === app.id}
                              className="px-3 py-1 text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-md disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(app.id, false)}
                              disabled={actionLoading === app.id}
                              className="px-3 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {app.status === 1 && (
                          <button
                            onClick={() => handleDisburse(app.id)}
                            disabled={actionLoading === app.id}
                            className="px-3 py-1 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-50"
                          >
                            Disburse
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
