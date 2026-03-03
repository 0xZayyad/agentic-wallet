"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, RefreshCw, Zap, AlertCircle, Copy, Check } from "lucide-react";

interface WalletEntry {
  id: string;
  publicKey: string;
  balance: string;
  balanceSol: number;
  balanceError?: string;
}

interface WalletPanelProps {
  selectedWalletId: string | null;
  onSelect: (id: string) => void;
  onClose?: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(); }}
      title="Copy address"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: copied ? "var(--success)" : "var(--text-muted)",
        padding: "2px 4px",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        transition: "color 0.15s",
        flexShrink: 0,
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

export default function WalletPanel({ selectedWalletId, onSelect, onClose }: WalletPanelProps) {
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);   // only true on first load
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep the last known wallet map so balances are never lost between polls
  const lastKnownRef = useRef<Map<string, WalletEntry>>(new Map());
  // Track whether we've done the one-time auto-select — avoids stale closure bug
  const hasAutoSelectedRef = useRef(false);

  const fetchWallets = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("http://localhost:3001/api/wallets");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { wallets: WalletEntry[] };
      console.log("[WalletPanel] fetched:", data);

      data.wallets.forEach((w) => lastKnownRef.current.set(w.id, w));
      const merged = Array.from(lastKnownRef.current.values());
      setWallets(merged);
      setInitError(null);

      // Auto-select the first wallet ONCE on first successful load only.
      // Use a ref to avoid a stale closure where the interval always sees
      // selectedWalletId === null and keeps overriding the user's selection.
      if (!hasAutoSelectedRef.current && merged.length > 0) {
        hasAutoSelectedRef.current = true;
        onSelect(merged[0].id);
      }
    } catch (e) {
      if (lastKnownRef.current.size === 0) {
        setInitError(e instanceof Error ? e.message : "Cannot reach server on :3001");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchWallets();
    intervalRef.current = setInterval(() => void fetchWallets(false), 20_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-surface)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Wallet size={15} color="var(--accent)" />
        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", color: "var(--text-secondary)", textTransform: "uppercase", flex: 1 }}>
          Wallets
        </span>
        <button
          onClick={() => void fetchWallets(true)}
          title="Refresh"
          style={{ background: "none", border: "none", cursor: "pointer", color: refreshing ? "var(--accent)" : "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = refreshing ? "var(--accent)" : "var(--text-muted)")}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            title="Close panel"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, fontSize: 16, lineHeight: 1, display: "flex" }}
          >
            ×
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {loading && (
          <div style={{ padding: "24px 8px", color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>Loading…</div>
        )}
        {initError && !loading && (
          <div style={{ padding: "12px 8px", color: "var(--error)", fontSize: 11, display: "flex", gap: 6, alignItems: "flex-start" }}>
            <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            {initError}
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {wallets.map((w, i) => {
            const isSelected = w.id === selectedWalletId;
            const shortId = `${w.id.slice(0, 6)}…${w.id.slice(-4)}`;
            const hasError = !!w.balanceError;

            return (
              <motion.button
                key={w.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => { onSelect(w.id); onClose?.(); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: isSelected ? "var(--accent-dim)" : "transparent",
                  border: isSelected ? "1px solid var(--border-bright)" : "1px solid transparent",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 4,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Top row: icon + truncated id + copy btn */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <Zap size={9} color={isSelected ? "var(--accent)" : "var(--text-muted)"} fill={isSelected ? "var(--accent)" : "none"} />
                  <span className="mono" style={{ fontSize: 11, color: isSelected ? "var(--accent)" : "var(--text-primary)", fontWeight: 600, flex: 1 }}>
                    {shortId}
                  </span>
                  <CopyButton text={w.id} />
                </div>

                {/* Balance row */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {hasError ? (
                    <span style={{ fontSize: 10, color: "var(--warning)", display: "flex", alignItems: "center", gap: 3 }}>
                      <AlertCircle size={9} /> RPC error
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>
                      {w.balanceSol.toFixed(4)}
                      <span style={{ color: "var(--text-muted)", marginLeft: 3 }}>SOL</span>
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {!loading && !error && wallets.length === 0 && (
          <div style={{ padding: "24px 8px", color: "var(--text-muted)", fontSize: 11, textAlign: "center", lineHeight: 1.7 }}>
            No wallets found.<br />Run a simulation first to generate test wallets.
          </div>
        )}
      </div>

      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
        <span>Solana Devnet</span>
        <span>{wallets.length} wallet{wallets.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
