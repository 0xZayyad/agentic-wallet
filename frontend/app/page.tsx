"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, MessageSquare, ChevronLeft, ChevronRight, X } from "lucide-react";
import WalletPanel from "../components/WalletPanel";
import AgentChat from "../components/AgentChat";

// ── Responsive breakpoint ────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Mobile drawer backdrop ───────────────────────────────────────────────
function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)", zIndex: 40 }}
    />
  );
}

// ── Panel toggle button ──────────────────────────────────────────────────
function PanelToggle({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8,
        border: active ? "1px solid var(--border-bright)" : "1px solid transparent",
        background: active ? "var(--accent-dim)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text-primary)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = active ? "var(--accent)" : "var(--text-secondary)"; }}
    >
      {icon}
      <span className="hide-xs">{label}</span>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function Home() {
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Desktop: wallet sidebar collapsed state
  const [walletOpen, setWalletOpen] = useState(true);

  // Mobile: drawer open
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const SIDEBAR_W = 220;

  return (
    <>
      <style>{`@media (max-width: 768px) { .hide-xs { display: none !important; } }`}</style>

      <div className="grid-bg" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header style={{ display: "flex", alignItems: "center", padding: "0 16px", gap: 8, height: 54, background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", flexShrink: 0, zIndex: 30 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
              ⚡
            </div>
            <span style={{ fontWeight: 800, fontSize: 14, background: "linear-gradient(135deg, var(--accent), var(--purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              Agentic Wallet
            </span>
            <span className="hide-xs" style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              AI Demo
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Desktop: collapse toggle */}
          {!isMobile && (
            <PanelToggle
              icon={<Wallet size={13} />}
              label="Wallets"
              active={walletOpen}
              onClick={() => setWalletOpen((v) => !v)}
            />
          )}

          {/* Mobile: wallet drawer toggle */}
          {isMobile && (
            <PanelToggle
              icon={<Wallet size={13} />}
              label="Wallets"
              active={mobileDrawerOpen}
              onClick={() => setMobileDrawerOpen((v) => !v)}
            />
          )}

          {/* Status pills */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "Devnet", color: "var(--success)" },
              { label: "Gemini", color: "var(--accent)" },
            ].map(({ label, color }) => (
              <div key={label} className="hide-xs" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-secondary)", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
                {label}
              </div>
            ))}
          </div>
        </header>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>

          {/* Desktop: collapsible wallet sidebar + chat */}
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: `${walletOpen ? SIDEBAR_W : 0}px 1fr`, height: "100%", transition: "grid-template-columns 0.25s ease" }}>
              {/* Wallet sidebar */}
              <div style={{ overflow: "hidden", borderRight: "1px solid var(--border)" }}>
                <AnimatePresence>
                  {walletOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ height: "100%", width: SIDEBAR_W, overflow: "hidden" }}>
                      <WalletPanel selectedWalletId={selectedWalletId} onSelect={setSelectedWalletId} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Chat — always fills remaining space */}
              <div style={{ overflow: "hidden", position: "relative" }}>
                {/* Edge toggle tab */}
                <button
                  onClick={() => setWalletOpen((v) => !v)}
                  title={walletOpen ? "Hide wallets" : "Show wallets"}
                  style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "none", borderRadius: "0 6px 6px 0", padding: "8px 4px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", transition: "color 0.15s, background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "var(--bg-card)"; }}
                >
                  {walletOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                </button>
                <AgentChat selectedWalletId={selectedWalletId} />
              </div>
            </div>
          )}

          {/* Mobile: chat full-screen + slide-over wallet drawer */}
          {isMobile && (
            <>
              <div style={{ height: "100%", overflow: "hidden" }}>
                <AgentChat selectedWalletId={selectedWalletId} />
              </div>

              <AnimatePresence>
                {mobileDrawerOpen && (
                  <>
                    <Backdrop onClick={() => setMobileDrawerOpen(false)} />
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "-100%" }}
                      transition={{ type: "spring", stiffness: 380, damping: 38 }}
                      style={{ position: "fixed", top: 54, bottom: 0, left: 0, width: "80vw", maxWidth: 300, background: "var(--bg-surface)", zIndex: 50, boxShadow: "4px 0 24px rgba(0,0,0,0.5)", overflow: "hidden" }}
                    >
                      <WalletPanel
                        selectedWalletId={selectedWalletId}
                        onSelect={setSelectedWalletId}
                        onClose={() => setMobileDrawerOpen(false)}
                      />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </>
  );
}
