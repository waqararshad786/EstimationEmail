import { useState, useRef, useEffect } from "react";
import EmailComposer from "./components/EmailComposer";
import AttachmentZone from "./components/AttachmentZone";
import ToastNotification from "./components/ToastNotification";

export default function App() {
  const [emails, setEmails] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [sentCount, setSentCount] = useState(0);
  const [activeTab, setActiveTab] = useState("compose");
  const [estimations, setEstimations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_EMAILS = 20;

  // Fetch estimation history
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("http://localhost:5000/api/estimations");
      const data = await res.json();
      setEstimations(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddEmail = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = emailInput.trim();
      if (!val) return;
      if (emails.length >= MAX_EMAILS) {
        showToast("Maximum 20 emails allowed", "error");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        showToast("Invalid email address", "error");
        return;
      }
      if (emails.includes(val)) {
        showToast("Email already added", "error");
        return;
      }
      setEmails([...emails, val]);
      setEmailInput("");
    }
  };

  const removeEmail = (idx) => setEmails(emails.filter((_, i) => i !== idx));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (idx) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSend = async () => {
    if (emails.length === 0) return showToast("Add at least one email", "error");
    if (!title.trim()) return showToast("Title is required", "error");
    if (!description.trim()) return showToast("Description is required", "error");

    setSending(true);
    const formData = new FormData();
    formData.append("emails", JSON.stringify(emails));
    formData.append("title", title);
    formData.append("description", description);
    attachments.forEach((file) => formData.append("attachments", file));

    try {
      const res = await fetch("http://localhost:5000/api/send-estimation", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSentCount(data.sent || emails.length);
        showToast(`✨ Success! Sent to ${data.sent} recipient(s)`, "success");
        setEmails([]);
        setTitle("");
        setDescription("");
        setAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Refresh history if open
        if (activeTab === "history") fetchHistory();
      } else {
        showToast(data.message || "Failed to send", "error");
      }
    } catch (err) {
      showToast("Server error. Is the backend running?", "error");
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "sent": return "text-emerald-400 bg-emerald-400/10";
      case "failed": return "text-rose-400 bg-rose-400/10";
      case "partial": return "text-amber-400 bg-amber-400/10";
      default: return "text-slate-400 bg-slate-400/10";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {toast && <ToastNotification message={toast.msg} type={toast.type} />}

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/30 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-lg blur-md opacity-50"></div>
              <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              EstiMail
            </span>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("compose")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "compose" 
                  ? "bg-indigo-500 text-white shadow-lg" 
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              ✏️ Compose
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "history" 
                  ? "bg-indigo-500 text-white shadow-lg" 
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              📜 History
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 text-xs">Ready</span>
          </div>
        </div>
      </header>

      <div className="relative max-w-5xl mx-auto px-6 py-10">
        
        {activeTab === "compose" ? (
          /* Compose Tab */
          <div className="space-y-6 animate-fadeIn">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-indigo-500/20 mb-2">
              <h1 className="text-2xl font-bold text-white mb-2">New Estimation</h1>
              <p className="text-slate-400 text-sm">Create and send professional project estimations to your clients</p>
            </div>

            {/* Recipients Card */}
            <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <label className="text-sm font-semibold text-white">Recipients</label>
                </div>
                <span className={`text-xs font-mono px-2 py-1 rounded-full ${
                  emails.length >= MAX_EMAILS 
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {emails.length} / {MAX_EMAILS}
                </span>
              </div>

              {/* Email tags */}
              <div className="min-h-[56px] flex flex-wrap gap-2 mb-3">
                {emails.length === 0 ? (
                  <div className="text-sm text-slate-500 italic">No emails added yet</div>
                ) : (
                  emails.map((email, i) => (
                    <span key={i} className="group/email flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs rounded-full px-3 py-1.5 font-mono hover:border-indigo-500/60 transition-all">
                      {email}
                      <button onClick={() => removeEmail(i)} className="text-indigo-400 hover:text-rose-400 transition-colors ml-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder={emails.length >= MAX_EMAILS ? "Max 20 emails reached" : "Type email and press Enter..."}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleAddEmail}
                  disabled={emails.length >= MAX_EMAILS}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                <span className="text-indigo-400">⌨️</span> Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px] border border-slate-700">Enter</kbd> to add each email
              </p>
            </div>

            {/* Email Composer */}
            <EmailComposer
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
            />

            {/* Attachments */}
            <AttachmentZone
              attachments={attachments}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              onRemove={removeAttachment}
            />

            {/* Preview Card */}
            {(title || description) && (
              <div className="animate-slideUp bg-gradient-to-r from-slate-900/50 to-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Live Preview</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-xl">
                  <div className="border-b border-slate-200 pb-3 mb-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Subject</p>
                    <p className="font-semibold text-slate-900 text-lg">{title || "—"}</p>
                  </div>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                    {description || "—"}
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-400 mb-2">📎 Attachments ({attachments.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {attachments.slice(0, 3).map((f, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{f.name}</span>
                        ))}
                        {attachments.length > 3 && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">+{attachments.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending || emails.length === 0}
              className="relative w-full group overflow-hidden rounded-2xl font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl opacity-100 group-hover:opacity-90 transition-opacity"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative py-4 px-6 flex items-center justify-center gap-2">
                {sending ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    <span className="text-white">Sending to {emails.length} recipient(s)...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    <span className="text-white">Send Estimation</span>
                    {emails.length > 0 && (
                      <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                        {emails.length}
                      </span>
                    )}
                  </>
                )}
              </div>
            </button>

            {sentCount > 0 && (
              <div className="text-center animate-bounceIn">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm border border-emerald-500/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Last send: {sentCount} email(s) delivered successfully!
                </div>
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-indigo-500/20">
              <h1 className="text-2xl font-bold text-white mb-2">Estimation History</h1>
              <p className="text-slate-400 text-sm">View all your sent estimations and their status</p>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-20">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              </div>
            ) : estimations.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <p className="text-slate-400">No estimations sent yet</p>
                <p className="text-slate-600 text-sm mt-1">Your first estimation will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {estimations.map((est, idx) => (
                  <div key={idx} className="group bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold text-white">{est.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(est.status)}`}>
                            {est.status}
                          </span>
                          {est.attachmentNames?.length > 0 && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                <polyline points="13 2 13 9 20 9"/>
                              </svg>
                              {est.attachmentNames.length}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{est.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {new Date(est.sentAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                            {est.recipients?.length || 0} recipients
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            {est.sentCount} delivered
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}