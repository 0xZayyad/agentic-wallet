"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, AlertTriangle, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Loader2, Zap, ArrowRight, ExternalLink, RefreshCw,
  Wallet,
} from "lucide-react";
import type { PipelineStage } from "./ActionFeed";
import type { ActionEntry } from "./ActionFeed";

// ── Types ──────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant" | "error";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  /** Wallet ID used for this prompt (stored at send time) */
  walletId?: string;
  /** If this message is followed by an action, attach it here */
  action?: ActionEntry;
}

interface AgentChatProps {
  selectedWalletId: string | null;
}

// ── Stage track visualiser (compact, inline) ──────────────────────────────

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "thinking", label: "Think" },
  { key: "validation", label: "Validate" },
  { key: "policy", label: "Policy" },
  { key: "build", label: "Build" },
  { key: "sign", label: "Sign" },
  { key: "send", label: "Send" },
  { key: "confirm", label: "Confirm" },
  { key: "done", label: "Done" },
];

const stageIndex = (s: PipelineStage): number =>
  STAGES.findIndex((x) => x.key === s);

function StageTrack({ stage }: { stage: PipelineStage }) {
  const current = stageIndex(stage === "error" ? "build" : stage);
  const isError = stage === "error";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
      {STAGES.filter((s) => s.key !== "thinking").map((s, i) => {
        const idx = i; // 0-based after filtering thinking
        const done = current > idx + 1;
        const active = current === idx + 1;
        const failed = isError && active;

        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 99,
                background: failed
                  ? "var(--error-dim)"
                  : done || (active && !failed)
                    ? "var(--accent-dim)"
                    : "rgba(255,255,255,0.04)",
                color: failed
                  ? "var(--error)"
                  : done || active
                    ? "var(--accent)"
                    : "var(--text-muted)",
                border: `1px solid ${failed
                  ? "rgba(247,95,95,0.3)"
                  : done || active
                    ? "var(--border-bright)"
                    : "transparent"
                  }`,
                transition: "all 0.3s",
              }}
            >
              {s.label}
            </div>
            {i < STAGES.length - 2 && (
              <ArrowRight size={8} color={done ? "var(--accent)" : "var(--border)"} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Inline Action Card ─────────────────────────────────────────────────────

function InlineActionCard({ action, onRetry }: { action: ActionEntry; onRetry?: () => void }) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const isPending = action.stage === "thinking";
  const isDone = action.stage === "done";
  const isError = action.stage === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isError ? "rgba(247,95,95,0.25)" : isDone ? "rgba(0,240,160,0.18)" : "var(--border)"}`,
        borderRadius: 12,
        overflow: "hidden",
        fontSize: 12,
        maxWidth: "90%",
        alignSelf: "center",
        width: "100%",
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--border)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {isPending && <Loader2 size={12} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />}
        {isDone && <CheckCircle2 size={12} color="var(--success)" />}
        {isError && <XCircle size={12} color="var(--error)" />}
        {!isPending && !isDone && !isError && <Loader2 size={12} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />}

        <span style={{ fontWeight: 700, color: "var(--text-secondary)", flex: 1, letterSpacing: "0.02em" }}>
          {isPending ? "Agent thinking…" : `${action.intentType ?? "intent"}`}
        </span>

        {action.intentType && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
              background: "var(--accent-dim)",
              color: "var(--accent)",
              border: "1px solid var(--border-bright)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {action.intentType}
          </span>
        )}
      </div>

      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Stage track */}
        {!isPending && <StageTrack stage={action.stage} />}

        {/* Reasoning */}
        {action.reasoning && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              lineHeight: 1.55,
              borderLeft: "2px solid var(--border-bright)",
              paddingLeft: 8,
              fontStyle: "italic",
            }}
          >
            {action.reasoning}
          </div>
        )}

        {/* Success: tx hash */}
        {isDone && action.result?.txHash && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={10} color="var(--success)" />
            <span className="mono" style={{ fontSize: 11, color: "var(--success)" }}>
              {action.result.txHash.slice(0, 20)}…
            </span>
            {action.result.explorerUrl && (
              <a
                href={action.result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", display: "flex", alignItems: "center" }}
              >
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        )}

        {/* Error */}
        {isError && action.result?.errorMessage && (
          <div style={{ fontSize: 11, color: "var(--error)", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
              <XCircle size={10} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                {action.result.failedAt && (
                  <span style={{ fontWeight: 700 }}>[{action.result.failedAt}]&nbsp;</span>
                )}
                {action.result.errorMessage}
              </div>
            </div>

            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(247,95,95,0.1)", border: "1px solid rgba(247,95,95,0.2)",
                  color: "var(--error)", fontSize: 10, fontWeight: 600,
                  padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                  marginTop: 4, transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(247,95,95,0.15)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(247,95,95,0.1)"}
              >
                <RefreshCw size={10} />
                RETRY
              </button>
            )}
          </div>
        )}

        {/* Collapsible JSON */}
        {action.intent && (
          <button
            onClick={() => setJsonOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 10,
              fontWeight: 600,
              padding: 0,
              letterSpacing: "0.04em",
            }}
          >
            {jsonOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            INTENT JSON
          </button>
        )}
        <AnimatePresence>
          {jsonOpen && action.intent && (
            <motion.pre
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                margin: 0,
                fontSize: 10,
                color: "var(--text-secondary)",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 6,
                padding: "8px 10px",
                overflowX: "auto",
                border: "1px solid var(--border)",
              }}
            >
              {JSON.stringify(action.intent, null, 2)}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Example prompts ────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  "Transfer 0.001 SOL to a peer wallet",
  "Swap 0.00051 SOL for USDC",
  "Create a new SPL token with 9 decimals",
  // "Mint 100 tokens to a peer wallet",
];

// ── AgentChat ──────────────────────────────────────────────────────────────

export default function AgentChat({ selectedWalletId }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const addMsg = (msg: Omit<ChatMessage, "id" | "timestamp">) => {
    const m: ChatMessage = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...msg };
    setMessages((prev) => [...prev, m]);
    return m.id;
  };

  const updateMsg = (id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const scrollBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const fetchPrompt = async (prompt: string, assistantMsgId: string, pendingEntry: ActionEntry) => {
    try {
      const res = await fetch("http://localhost:3001/api/agent/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, walletId: selectedWalletId }),
      });

      const data = await res.json() as {
        intent?: Record<string, unknown>;
        result?: {
          status: "success" | "failure";
          txHash?: string;
          errorCode?: string;
          errorMessage?: string;
          failedAt?: string;
          meta?: { explorerUrl?: string };
        };
        reasoning?: string;
        model?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        const errMsg = data.error ?? `Server error ${res.status}`;
        const errorEntry: ActionEntry = {
          ...pendingEntry,
          stage: "error",
          result: { status: "failure", errorCode: "SERVER_ERROR", errorMessage: errMsg },
        };
        updateMsg(assistantMsgId, {
          content: `❌ ${errMsg}`,
          action: errorEntry,
        });
        return;
      }

      const intentType = (data.intent?.type as string) ?? null;
      const resultStatus = data.result?.status ?? "failure";
      const finalStage: PipelineStage = resultStatus === "success" ? "done" : "error";
      const finalEntry: ActionEntry = {
        ...pendingEntry,
        reasoning: data.reasoning ?? "",
        intentType,
        intent: data.intent ?? null,
        stage: finalStage,
        result: {
          status: resultStatus,
          txHash: data.result?.txHash,
          explorerUrl: data.result?.meta?.explorerUrl,
          errorCode: data.result?.errorCode,
          errorMessage: data.result?.errorMessage,
          failedAt: data.result?.failedAt,
        },
      };

      const replyText = resultStatus === "success"
        ? `✅ Executed **${intentType}**. Tx: \`${data.result?.txHash?.slice(0, 16)}…\``
        : `❌ Failed at **${data.result?.failedAt}**: ${data.result?.errorMessage}`;

      updateMsg(assistantMsgId, { content: replyText, action: finalEntry });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      const errorEntry: ActionEntry = {
        ...pendingEntry,
        stage: "error",
        result: { status: "failure", errorMessage: msg },
      };
      updateMsg(assistantMsgId, { content: `❌ ${msg}`, action: errorEntry });
    } finally {
      setLoading(false);
      scrollBottom();
      textareaRef.current?.focus();
    }
  };

  const submit = async () => {
    if (!input.trim() || loading) return;
    if (!selectedWalletId) {
      addMsg({ role: "error", content: "Please select a wallet first." });
      return;
    }

    const prompt = input.trim();
    setInput("");
    setLoading(true);

    // 1. User message
    addMsg({ role: "user", content: prompt, walletId: selectedWalletId ?? undefined });

    // 2. Pending action entry
    const actionId = crypto.randomUUID();
    const pendingEntry: ActionEntry = {
      id: actionId,
      timestamp: new Date().toISOString(),
      prompt,
      reasoning: "",
      intentType: null,
      intent: null,
      stage: "thinking",
      result: null,
    };

    // 3. Assistant placeholder message carrying the pending action card
    const assistantMsgId = addMsg({ role: "assistant", content: "", action: pendingEntry });
    scrollBottom();

    await fetchPrompt(prompt, assistantMsgId, pendingEntry);
  };

  const handleRetry = async (msgId: string, actionPrompt: string) => {
    if (loading || !selectedWalletId) return;
    setLoading(true);

    const newPendingEntry: ActionEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      prompt: actionPrompt,
      reasoning: "",
      intentType: null,
      intent: null,
      stage: "thinking",
      result: null,
    };

    // Reset the assistant message to thinking state
    updateMsg(msgId, { content: "", action: newPendingEntry });
    scrollBottom();

    await fetchPrompt(actionPrompt, msgId, newPendingEntry);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--accent-dim)", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={15} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>LLM Agent</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {selectedWalletId ? `Wallet: ${selectedWalletId.slice(0, 10)}…` : "Select a wallet to start"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--success)", background: "var(--success-dim)", padding: "3px 10px", borderRadius: 999 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
            Gemini
          </div>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20, color: "var(--text-muted)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>⚡</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Agentic Wallet</div>
              <div style={{ fontSize: 11 }}>Describe what the agent should do in plain English</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 380 }}>
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); textareaRef.current?.focus(); }}
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 14px", cursor: "pointer", textAlign: "left", fontSize: 12, color: "var(--text-secondary)", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-bright)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isError = msg.role === "error";

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 460, damping: 34 }}
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                {/* Bubble row */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: isUser ? "row" : "row-reverse" }}>
                  {/* Avatar */}
                  <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isUser ? "var(--accent-dim)" : isError ? "var(--error-dim)" : "var(--bg-card)", border: `1px solid ${isUser ? "var(--border-bright)" : isError ? "rgba(247,95,95,0.3)" : "var(--border)"}` }}>
                    {isUser && <User size={12} color="var(--accent)" />}
                    {!isUser && !isError && <Bot size={12} color="var(--text-secondary)" />}
                    {isError && <AlertTriangle size={12} color="var(--error)" />}
                  </div>

                  {/* Text bubble — only show if there's content */}
                  {msg.content && (
                    <div style={{
                      fontSize: 13, lineHeight: 1.6,
                      color: isUser ? "var(--text-primary)" : isError ? "var(--error)" : "var(--text-secondary)",
                      background: isUser ? "var(--accent-dim)" : isError ? "var(--error-dim)" : "var(--bg-card)",
                      border: `1px solid ${isUser ? "var(--border-bright)" : isError ? "rgba(247,95,95,0.25)" : "var(--border)"}`,
                      borderRadius: isUser ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                      padding: "7px 13px",
                      maxWidth: "80%",
                      whiteSpace: "pre-wrap",
                    }}>
                      {isUser && msg.walletId && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4, fontWeight: 600, letterSpacing: "0.02em" }}>
                          <Wallet size={9} />
                          <span className="mono">{msg.walletId.slice(0, 6)}…{msg.walletId.slice(-4)}</span>
                        </div>
                      )}
                      {msg.content}
                    </div>
                  )}

                  {/* Typing dots for empty assistant message (loading) */}
                  {!isUser && !msg.content && loading && (
                    <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px 4px 12px 12px" }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: "pulse-dot 1.2s ease infinite", animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline action card — shown below the assistant bubble */}
                {msg.action && (
                  <div style={{ paddingLeft: 34 }}>
                    <InlineActionCard
                      action={msg.action}
                      onRetry={isError && msg.action.prompt ? () => handleRetry(msg.id, msg.action!.prompt) : undefined}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "10px 20px 18px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        {!selectedWalletId && (
          <div style={{ fontSize: 11, color: "var(--warning)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={11} /> Select a wallet to enable the agent
          </div>
        )}
        <div
          style={{ display: "flex", gap: 8, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 13, padding: "7px 7px 7px 14px", transition: "border-color 0.15s" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-bright)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={selectedWalletId ? "Describe what the agent should do…" : "Select a wallet first…"}
            disabled={!selectedWalletId || loading}
            style={{ flex: 1, background: "none", border: "none", color: "var(--text-primary)", fontSize: 13, lineHeight: 1.55, padding: "4px 0", maxHeight: 100, overflowY: "auto", resize: "none" }}
          />
          <button
            className="btn-primary"
            onClick={() => void submit()}
            disabled={!input.trim() || loading || !selectedWalletId}
            style={{ padding: "7px 13px", borderRadius: 9, alignSelf: "flex-end", flexShrink: 0 }}
          >
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
          </button>
        </div>
        <div style={{ marginTop: 5, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
          Enter · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
