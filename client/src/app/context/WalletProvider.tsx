"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWallet, WalletState } from "@/hooks/useWallet";

interface WalletContextType {
  wallet: WalletState;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts: any) => Promise<any>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const walletApi = useWallet();
  return (
    <WalletContext.Provider value={walletApi}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used within WalletProvider");
  return ctx;
}
