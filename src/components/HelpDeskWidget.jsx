import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Headset,
  X,
  Plus,
  Send,
  ArrowLeft,
  Lock,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import {
  getHrContacts,
  getHelpDeskTickets,
  createHelpDeskTicket,
  getTicketThread,
  sendTicketMessage,
  closeTicket,
} from "../services/helpDeskService";
import { getStoredUser } from "../utils/roles";
import "./HelpDeskWidget.css";

const CATEGORIES = [
  "General",
  "Payroll",
  "Leave",
  "Attendance",
  "Documents",
  "Policy",
  "Grievance",
  "Other",
];
const PRIORITIES = ["Low", "Medium", "High"];

const formatTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "2-digit", month: "short" }) +
        ", " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

function HelpDeskWidget() {
  const user = useMemo(() => getStoredUser(), []);
  const isAdmin = user?.role === "Admin"
  const isHrSide = user?.role === "HR";

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("list"); // list | new | chat
  const [tickets, setTickets] = useState([]);
  const [hrContacts, setHrContacts] = useState([]);
  const [thread, setThread] = useState(null); // { ticket, messages }
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showCloseNote, setShowCloseNote] = useState(false);
  const [closeNote, setCloseNote] = useState("");

  const [form, setForm] = useState({
    hrUserId: "",
    subject: "",
    category: "General",
    priority: "Medium",
    message: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [creatingTicket, setCreatingTicket] = useState(false);

  const chatBottomRef = useRef(null);
  const activeTicketIdRef = useRef(null);
  const hasScrolledToBottom = useRef(false);

  const loadTickets = useCallback(async () => {
    try {
      const res = await getHelpDeskTickets();
      setTickets(res.data?.data || []);
    } catch {
      /* silent — widget should never break the app */
    }
  }, []);

  const loadHrContacts = useCallback(async () => {
    try {
      const res = await getHrContacts();
      setHrContacts(res.data?.data || []);
    } catch {
      setHrContacts([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    setLoadingList(true);
    Promise.all([loadTickets(), loadHrContacts()]).finally(() => setLoadingList(false));
    return undefined;
  }, [isOpen, loadTickets, loadHrContacts]);

  // Polling while the widget is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const id = setInterval(() => {
      loadTickets();
      if (activeTicketIdRef.current) {
        refreshActiveThread(activeTicketIdRef.current, true);
      }
    }, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loadTickets]);

  const refreshActiveThread = useCallback(async (ticketId, silent = false) => {
    if (!silent) setLoadingThread(true);
    try {
      const res = await getTicketThread(ticketId);
      setThread(res.data?.data || null);
    } catch {
      if (!silent) setActionError("Unable to load this conversation.");
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    hasScrolledToBottom.current = false;
  }, [view, thread?.ticket?._id]);

  useEffect(() => {
    if (view === "chat" && thread?.messages && !hasScrolledToBottom.current) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      hasScrolledToBottom.current = true;
    }
  }, [view, thread]);

  const openChat = (ticketId) => {
    activeTicketIdRef.current = ticketId;
    setView("chat");
    setShowCloseNote(false);
    setCloseNote("");
    setDraft("");
    refreshActiveThread(ticketId);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !thread?.ticket) return;
    setSending(true);
    setActionError("");
    try {
      await sendTicketMessage(thread.ticket._id, text);
      setDraft("");
      await refreshActiveThread(thread.ticket._id, true);
      loadTickets();
    } catch (err) {
      setActionError(err.response?.data?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!thread?.ticket) return;
    setClosing(true);
    setActionError("");
    try {
      await closeTicket(thread.ticket._id, closeNote.trim());
      setShowCloseNote(false);
      setCloseNote("");
      await refreshActiveThread(thread.ticket._id, true);
      loadTickets();
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to close ticket.");
    } finally {
      setClosing(false);
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!form.hrUserId) errs.hrUserId = "Please select an HR.";
    if (!form.subject.trim()) errs.subject = "Subject is required.";
    if (!form.message.trim()) errs.message = "Please describe your query.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setActionError("");
    if (!validateForm()) return;
    setCreatingTicket(true);
    try {
      await createHelpDeskTicket(form);
      setForm({ hrUserId: "", subject: "", category: "General", priority: "Medium", message: "" });
      await loadTickets();
      setView("list");
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to create ticket.");
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleClosePanel = () => {
    setIsOpen(false);
    setView("list");
    setThread(null);
    setActionError("");
    setDraft("");
    setShowCloseNote(false);
    setCloseNote("");
  };

  const renderList = () => (
    <>
      <div className="hdw-list-header">
        <h4>{isHrSide || isAdmin ? "Assigned Tickets" : "My Tickets"}</h4>
        {(!isHrSide && !isAdmin) && 
        <button type="button" className="hdw-new-btn" onClick={() => { setActionError(""); setView("new"); }}>
          <Plus size={15} /> New Ticket
        </button>
        }
      </div>

      <div className="hdw-ticket-list">
        {loadingList && <p className="hdw-empty">Loading…</p>}
        {!loadingList && tickets.length === 0 && (
          <div className="hdw-empty">
            <MessageSquare size={28} />
            <p>No tickets yet.</p>
            {(!isHrSide && !isAdmin) && <span>Raise a ticket and the selected HR will respond here.</span>}
          </div>
        )}
        {tickets.map((t) => (
          <button key={t._id} type="button" className="hdw-ticket-row" onClick={() => openChat(t._id)}>
            <div className="hdw-ticket-row-top">
              <span className="hdw-code">{t.ticketCode}</span>
              <span className={`hdw-status ${t.status === "Open" ? "open" : "closed"}`}>
                {t.status}
              </span>
            </div>
            <p className="hdw-subject">{t.subject}</p>
            <div className="hdw-ticket-row-bottom">
              <span>{t.category}</span>
              <span className="hdw-meta-right">
                {isHrSide ? t.createdByUserId?.name || "Employee" : t.assignedHrUserId?.name || "HR"}
                {" · "}
                {formatTime(t.lastMessageAt)}
                {t.hasUnread && <i className="hdw-unread-dot" />}
              </span>
            </div>
            <ChevronRight size={14} className="hdw-chevron" />
          </button>
        ))}
      </div>
    </>
  );

  const renderNewForm = () => (
    <form className="hdw-form" onSubmit={handleCreateTicket}>
      <div className="hdw-form-header">
        <button type="button" className="hdw-back" onClick={() => setView("list")}>
          <ArrowLeft size={16} />
        </button>
        <h4>New Ticket</h4>
      </div>

      <label className="hdw-label">
        Select HR *
        <select
          value={form.hrUserId}
          onChange={(e) => setForm({ ...form, hrUserId: e.target.value })}
        >
          <option value="">— Choose HR —</option>
          {hrContacts.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} ({c.role})
            </option>
          ))}
        </select>
        {formErrors.hrUserId && <span className="hdw-err">{formErrors.hrUserId}</span>}
      </label>

      <label className="hdw-label">
        Subject *
        <input
          type="text"
          maxLength={200}
          placeholder="Brief summary of your query"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        {formErrors.subject && <span className="hdw-err">{formErrors.subject}</span>}
      </label>

      <div className="hdw-row">
        <label className="hdw-label">
          Category
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="hdw-label">
          Priority
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="hdw-label">
        Message *
        <textarea
          rows={4}
          maxLength={2000}
          placeholder="Describe your query in detail…"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        {formErrors.message && <span className="hdw-err">{formErrors.message}</span>}
      </label>

      <button type="submit" className="hdw-submit" disabled={creatingTicket}>
        {creatingTicket ? "Creating…" : "Create Ticket"}
      </button>
      <p className="hdw-note">An email will be sent to you and the selected HR.</p>
    </form>
  );

  const renderChat = () => {
    const t = thread?.ticket;
    const isClosed = t?.status === "Closed";

    return (
      <div className="hdw-chat">
        <div className="hdw-chat-header">
          <button type="button" className="hdw-back" onClick={() => { setView("list"); setThread(null); }}>
            <ArrowLeft size={16} />
          </button>
          <div className="hdw-chat-title">
            <strong>{t?.subject || "Ticket"}</strong>
            <span>
              {t?.ticketCode} · {isClosed ? "Closed" : "Open"}
              {t?.assignedHrUserId?.name ? ` · HR: ${t.assignedHrUserId.name}` : ""}
            </span>
          </div>
          {isHrSide && !isClosed && t?.canClose && !showCloseNote && (
            <button type="button" className="hdw-close-btn" onClick={() => setShowCloseNote(true)}>
              Mark Closed
            </button>
          )}
        </div>

        {showCloseNote && (
          <div className="hdw-closenote-box">
            <textarea
              rows={2}
              placeholder="Optional closing note…"
              maxLength={500}
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
            />
            <div className="hdw-closenote-actions">
              <button type="button" onClick={() => setShowCloseNote(false)} disabled={closing}>
                Cancel
              </button>
              <button type="button" className="confirm" onClick={handleCloseTicket} disabled={closing}>
                {closing ? "Closing…" : "Confirm Close"}
              </button>
            </div>
          </div>
        )}

        <div className="hdw-messages">
          {loadingThread && <p className="hdw-empty">Loading…</p>}
          {(thread?.messages || []).map((m) => {
            const mine = String(m.senderUserId) === String(user?._id || user?.id);
            return (
              <div key={m._id} className={`hdw-msg ${mine ? "mine" : "theirs"}`}>
                {!mine && <span className="hdw-msg-sender">{m.senderName || m.senderRole}</span>}
                <div className="hdw-bubble">{m.message}</div>
                <span className="hdw-msg-time">{formatTime(m.createdAt)}</span>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {actionError && <p className="hdw-error">{actionError}</p>}

        {isClosed ? (
          <div className="hdw-closed-bar">
            <Lock size={14} />
            <span>This ticket is closed. Please create a new ticket.</span>
            <CheckCircle2 size={14} />
          </div>
        ) : t?.canReply ? (
          <div className="hdw-inputbar">
            <textarea
              rows={1}
              placeholder="Type your message…"
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button type="button" onClick={handleSend} disabled={sending || !draft.trim()}>
              <Send size={16} />
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div className="hdw-panel">
          <div className="hdw-panel-head">
            <Headset size={18} />
            <h3>HR Help Desk</h3>
            <button type="button" className="hdw-x" onClick={handleClosePanel}>
              <X size={17} />
            </button>
          </div>
          <div className="hdw-panel-body">
            {actionError && view !== "chat" && <p className="hdw-error">{actionError}</p>}
            {view === "list" && renderList()}
            {view === "new" && renderNewForm()}
            {view === "chat" && renderChat()}
          </div>
        </div>
      )}

      <button
        type="button"
        className={`hdw-fab ${isOpen ? "active" : ""}`}
        title="HR Help Desk"
        onClick={() => {
          if (isOpen) {
            handleClosePanel();
          } else {
            setIsOpen(true);
          }
        }}
      >
        {isOpen ? <X size={22} /> : <Headset size={22} />}
      </button>
    </>
  );
}

export default HelpDeskWidget;