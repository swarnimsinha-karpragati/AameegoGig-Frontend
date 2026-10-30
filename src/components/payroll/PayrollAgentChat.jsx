import React, { useState, useRef, useEffect, useMemo } from "react";
import { Bot, Send, Loader2, RotateCcw } from "lucide-react";
import { sendPayrollAgentMessage } from "../../services/payrollAgentService";
import { renderAgentMessage } from "../../utils/agentMarkdown";
import "./PayrollAgentChat.css";

// Initial greeting. Exported so the parent page can own the message list
// (history survives tab switches — it only resets on page refresh).
export const AGENT_GREETING = {
  from: "agent",
  text: "Hi! I'm the payroll assistant. Tell me employee codes (e.g. GRV-0001, GRV-0002) plus a month and year, and I'll preview payroll and — after your confirmation — save it for approval. You can also assign a salary structure: type the employee code, structure name, and annual CTC — e.g. \"GRV-0001 India Standard 600000\".",
};

// Controlled component: `messages` lives in the parent (Payroll.jsx) so
// switching tabs unmounts this panel WITHOUT wiping the conversation.
// Parent passes [messages, onMessagesChange]; "New chat" resets to greeting.
export default function PayrollAgentChat({ messages, onMessagesChange }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  // Guard: parent always passes messages, but fall back to greeting so the
  // panel never renders empty if wired without props. Memoized so the
  // auto-scroll effect below sees a stable dependency.
  const list = useMemo(
    () => (Array.isArray(messages) && messages.length > 0 ? messages : [AGENT_GREETING]),
    [messages]
  );
  
  const setMessages = onMessagesChange || (() => {});

  // Auto-scroll to the newest message after every update.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list, sending]);

  // Return keyboard focus to the input after each reply so the next question
  // can be typed immediately. Done in an effect (not right after send):
  // the input is disabled while sending, and browsers refuse to focus a
  // disabled element — this runs after it re-enables.
  useEffect(() => {
    if (!sending) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [sending]);

  const send = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || sending) return;

    const outgoing = [...list, { from: "user", text }];
    setMessages(outgoing);
    setDraft("");
    setSending(true);

    try {
      // Send the last 10 turns as history so follow-ups
      // ("August 2026", "yes, GRV-0001") keep their context.
      const history = outgoing.slice(-20).map((m) => ({
        role: m.from === "agent" ? "assistant" : "user",
        text: m.text,
      }));
      const res = await sendPayrollAgentMessage({ message: text, history });
      const reply = res.data?.data?.reply || "I could not process that. Please try again.";
      setMessages((prev) => [...prev, { from: "agent", text: reply }]);
    } catch (error) {
      // 403 here means the backend role gate rejected you (not Admin/HR).
      const serverMsg = error.response?.data?.message;
      const status = error.response?.status;
      const friendly =
        status === 403
          ? "This assistant is restricted to Admin/HR users of your organization."
          : serverMsg || "Something went wrong reaching the assistant. Please try again.";
      setMessages((prev) => [...prev, { from: "agent", text: friendly, error: true }]);
    } finally {
      setSending(false);
    }
  };

  // "New chat" wipes frontend history (backend session expires on its own TTL).
  const handleNewChat = () => {
    if (sending) return;
    setMessages([AGENT_GREETING]);
    setDraft("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <div className="agent-chat glass-morphism">
      <div className="agent-chat-header">
        <Bot size={20} />
        <div className="agent-chat-headings">
          <h3 className="agent-chat-title">Payroll Assistant</h3>
          <p className="agent-chat-subtitle">
            Preview payroll, assign salary structures, confirm, and save — Admin/HR only
          </p>
        </div>
        {list.length > 1 && (
          <button type="button" className="agent-newchat" onClick={handleNewChat} disabled={sending} title="Start a new conversation">
            <RotateCcw size={15} />
            <span>New chat</span>
          </button>
        )}
      </div>

      <div className="agent-chat-messages">
        {list.map((m, i) => (
          <div key={i} className={`agent-msg agent-msg--${m.from}${m.error ? " agent-msg--error" : ""}`}>
            {/* Agent replies are markdown (tables/bold/lists); user messages are plain text. */}
            <div className="agent-bubble">
              {m.from === "agent" ? renderAgentMessage(m.text) : m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="agent-msg agent-msg--agent">
            <div className="agent-bubble agent-bubble--typing">
              <Loader2 size={16} className="agent-spin" />
              <span>Working on it…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="agent-inputbar" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Create payroll for GRV-0001 for August 2026"
          disabled={sending}
          maxLength={2000}
        />
        <button type="submit" disabled={sending || !draft.trim()} aria-label="Send">
          {sending ? <Loader2 size={18} className="agent-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
