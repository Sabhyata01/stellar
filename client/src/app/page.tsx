"use client";

import { useState, useEffect } from "react";
import { useWalletContext } from "@/app/context/WalletProvider";
import ScholarshipCard from "@/components/ScholarshipCard";
import CreateScholarship from "@/components/CreateScholarship";
import {
  getScholarshipCount,
  getScholarship,
  createScholarship,
  getAdmin,
  setContractAddress,
} from "@/hooks/contract";
import { Scholarship } from "@/lib/utils";

const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export default function Dashboard() {
  const { wallet } = useWalletContext();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [adminAddr, setAdminAddr] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [contractInput, setContractInput] = useState(DEFAULT_CONTRACT);
  const [configured, setConfigured] = useState(!!DEFAULT_CONTRACT);

  useEffect(() => {
    if (DEFAULT_CONTRACT) {
      setContractAddress(DEFAULT_CONTRACT);
      setConfigured(true);
    }
  }, []);

  const loadScholarships = async () => {
    try {
      const count = await getScholarshipCount();
      const items: Scholarship[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const s = await getScholarship(i);
          items.push(s);
        } catch {
          // skip errors
        }
      }
      setScholarships(items);
      try {
        const admin = await getAdmin();
        setAdminAddr(admin);
      } catch {}
    } catch (err) {
      console.warn("Failed to load scholarships:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (configured) {
      loadScholarships();
    } else {
      setLoading(false);
    }
  }, [configured]);

  const handleConfigure = () => {
    if (contractInput.trim()) {
      setContractAddress(contractInput.trim());
      setConfigured(true);
      setLoading(true);
    }
  };

  const handleCreateScholarship = async (data: {
    name: string;
    description: string;
    token: string;
    totalFund: string;
    perStudent: string;
  }) => {
    if (!wallet.address) return;
    await createScholarship(
      wallet.address,
      data.name,
      data.description,
      data.token,
      data.totalFund,
      data.perStudent
    );
    await loadScholarships();
  };

  const isAdmin = !!wallet.address && wallet.address === adminAddr;

  if (!configured) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to EduFund</h1>
          <p className="text-gray-500 mb-8">
            Connect your wallet and enter a contract address to get started.
          </p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={contractInput}
              onChange={(e) => setContractInput(e.target.value)}
              placeholder="Enter contract address (C...)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
            />
            <button
              onClick={handleConfigure}
              disabled={!contractInput.trim()}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50"
            >
              Connect to Contract
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scholarships</h1>
          <p className="text-gray-500 mt-1">
            {scholarships.length} scholarship{scholarships.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <CreateScholarship
              onCreate={handleCreateScholarship}
              isAdmin={isAdmin}
            />
          )}
          <button
            onClick={loadScholarships}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Admin badge */}
      {isAdmin && (
        <div className="mb-6 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          You are the contract admin
        </div>
      )}

      {/* Scholarship grid */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : scholarships.length === 0 ? (
        <div className="text-center py-32">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No scholarships yet</h3>
          <p className="text-gray-500 text-sm">
            {isAdmin ? "Create the first scholarship to get started." : "Check back later for new opportunities."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {scholarships.map((s) => (
            <ScholarshipCard
              key={s.id}
              scholarship={s}
              walletAddress={wallet.address}
            />
          ))}
        </div>
      )}
    </div>
  );
}
