"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Clock, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────

export type PipelineStage =
  | "thinking"
  | "validation"
  | "policy"
  | "build"
  | "sign"
  | "send"
  | "confirm"
  | "done"
  | "error";

export interface ActionEntry {
  id: string;
  timestamp: string;
  prompt: string;
  reasoning: string;
  intentType: string | null;
  intent: Record<string, unknown> | null;
  stage: PipelineStage;
  result: {
    status: "success" | "failure";
    txHash?: string;
    explorerUrl?: string;
    errorCode?: string;
    errorMessage?: string;
    failedAt?: string;
  } | null;
}

// ── Stage metadata ────────────────────────────────────────────────────────

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "thinking", label: "LLM Thinking" },
  { key: "validation", label: "Validate" },
  { key: "policy", label: "Policy" },
  { key: "build", label: "Build Tx" },
  { key: "sign", label: "Sign" },
  { key: "send", label: "Send" },
  { key: "confirm", label: "Confirm" },
];

const STAGE_ORDER: PipelineStage[] = STAGES.map((s) => s.key);

function stageIndex(stage: PipelineStage) {
  return STAGE_ORDER.indexOf(stage);
}

function intentBadgeClass(type: string | null) {
  if (!type) return "badge badge-transfer";
  if (type === "transfer") return "badge badge-transfer";
  if (type === "swap") return "badge badge-swap";
  if (type === "mint_token") return "badge badge-mint";
  if (type === "create_mint") return "badge badge-create";
  return "badge badge-transfer";
}

// ── Sub-components ────────────────────────────────────────────────────────

function PipelineTrack({ stage, failed }: { stage: PipelineStage; failed?: boolean }) {
  const current = stageIndex(stage === "done" || stage === "error" ? "confirm" : stage);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
      {STAGES.filter((s) => s.key !== "thinking").map((s, i) => {
        const idx = i + 1; // offset: thinking is index 0
        const done = current >= idx && !(failed && stage === "error" && current === idx);
        const active = current === idx;
        const isError = failed && stage === "error" && current === idx;

        let color = "var(--text-muted)";
        let bg = "transparent";
        if (done && !isError) { color = "var(--success)"; bg = "var(--success-dim)"; }
        if (isError) { color = "var(--error)"; bg = "var(--error-dim)"; }
        if (active && !done && !isError) { color = "var(--accent)"; bg = "var(--accent-dim)"; }

        return (
          <div key={s.key} className="stage-in" style={{ animationDelay: `${i * 80}ms` }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 11,
                fontWeight: 600,
                color,
                background: bg,
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              {done && !isError && <CheckCircle size={10} />}
              {isError && <XCircle size={10} />}
              {!done && !isError && <Clock size={10} />}
              {s.label}
            </div>
            {i < STAGES.length - 2 && (
              <span style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 2px" }}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IntentPreview({ intent }: { intent: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: 11,
          fontWeight: 600,
          padding: 0,
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Intent JSON
      </button>
      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              background: "rgba(0,0,0,0.3)",
              borderRadius: 8,
              padding: "10px 12px",
              marginTop: 6,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              border: "1px solid var(--border)",
            }}
          >
            {JSON.stringify(intent, null, 2)}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface ActionFeedProps {
  entries: ActionEntry[];
}

export default function ActionFeed({ entries }: ActionFeedProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "20px 20px 14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: entries.some(e => e.stage !== "done" && e.stage !== "error")
                ? "var(--accent)"
                : "var(--success)",
              boxShadow: `0 0 8px currentColor`,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.05em", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Action Feed
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--text-muted)",
              background: "var(--bg-card)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {entries.length}
          </span>
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
        {entries.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60%",
              color: "var(--text-muted)",
              fontSize: 13,
              textAlign: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 28 }}>🤖</div>
            <div>Agent actions will appear here</div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {[...entries].reverse().map((entry) => {
            const isSuccess = entry.result?.status === "success";
            const isFailed = entry.result?.status === "failure";

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 10,
                  borderLeft: isSuccess
                    ? "3px solid var(--success)"
                    : isFailed
                      ? "3px solid var(--error)"
                      : "3px solid var(--accent)",
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  {entry.intentType && (
                    <span className={intentBadgeClass(entry.intentType)}>
                      {entry.intentType}
                    </span>
                  )}
                  {isSuccess && <span className="badge badge-success" style={{ marginLeft: "auto" }}>Success</span>}
                  {isFailed && <span className="badge badge-failure" style={{ marginLeft: "auto" }}>Failed</span>}
                  {!entry.result && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent)" }}>Running…</span>}
                </div>

                {/* Prompt */}
                <div style={{ fontSize: 12, color: "var(--text-primary)", marginBottom: 6, fontStyle: "italic" }}>
                  &ldquo;{entry.prompt}&rdquo;
                </div>

                {/* LLM Reasoning */}
                {entry.reasoning && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      background: "rgba(79,142,247,0.05)",
                      borderRadius: 6,
                      padding: "6px 10px",
                      marginBottom: 6,
                      borderLeft: "2px solid var(--accent-dim)",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--accent)" }}>Agent: </span>
                    {entry.reasoning}
                  </div>
                )}

                {/* Pipeline track */}
                <PipelineTrack stage={entry.stage} failed={isFailed} />

                {/* Intent JSON */}
                {entry.intent && <IntentPreview intent={entry.intent} />}

                {/* Result */}
                {isSuccess && entry.result?.txHash && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--success)" }}>
                      {entry.result.txHash.slice(0, 12)}…{entry.result.txHash.slice(-8)}
                    </span>
                    {entry.result.explorerUrl && (
                      <a
                        href={entry.result.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}
                      >
                        <ExternalLink size={11} />
                        Explorer
                      </a>
                    )}
                  </div>
                )}
                {isFailed && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--error)", background: "var(--error-dim)", borderRadius: 6, padding: "6px 10px" }}>
                    <strong>{entry.result?.errorCode ?? "Error"}</strong>: {entry.result?.errorMessage}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
