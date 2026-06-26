"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isConnected,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

export type WalletState = {
  address: string | null;
  isConnected: boolean;
  isAllowed: boolean;
};

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isAllowed: false,
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const resp = await isConnected();
      setWallet((prev) => ({ ...prev, isConnected: resp.isConnected }));
      if (resp.isConnected) {
        const addrResp = await getAddress();
        if (addrResp.address) {
          setWallet((prev) => ({
            ...prev,
            address: addrResp.address,
            isAllowed: true,
          }));
        }
      }
    } catch (e) {
      console.warn("Wallet check failed:", e);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const addrResp = await getAddress();
      if (addrResp.address) {
        setWallet({
          address: addrResp.address,
          isConnected: true,
          isAllowed: true,
        });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to connect wallet");
      console.error("Wallet connect failed:", e);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({ address: null, isConnected: false, isAllowed: false });
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    wallet,
    connecting,
    error,
    connect,
    disconnect,
    signTransaction,
  };
}
