import { useState, useRef, useEffect } from "react";
import ToastNotification from "./components/ToastNotification";

export default function App() {
  const [emails, setEmails] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [estimations, setEstimations] = useState([{ title: "", description: "" }]);
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("compose");
  const [batches, setBatches] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [spamChecks, setSpamChecks] = useState({}); // Store spam check results per estimation
  const [checkingSpam, setCheckingSpam] = useState(false);
  const [checkingIndex, setCheckingIndex] = useState(null);
  const fileInputRef = useRef(null);

  const MAX_EMAILS = 300;
  const MAX_ESTIMATIONS = 20;

  useEffect(() => {
    if (activeTab === "history") {
      fetchBatches();
    }
  }, [activeTab]);

  const fetchBatches = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("http://localhost:5000/api/batch-estimations");
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
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
        showToast(`Maximum ${MAX_EMAILS} emails allowed`, "error");
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

  const handleBulkAdd = () => {
    const text = prompt("Paste multiple emails (separated by commas, spaces, or new lines):");
    if (!text) return;
    
    const emailList = text.split(/[,\s\n;]+/).filter(email => email.trim());
    const validEmails = [];
    const invalidEmails = [];
    
    for (const email of emailList) {
      const cleanEmail = email.trim();
      if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        if (!emails.includes(cleanEmail) && emails.length + validEmails.length < MAX_EMAILS) {
          validEmails.push(cleanEmail);
        }
      } else if (cleanEmail) {
        invalidEmails.push(cleanEmail);
      }
    }
    
    if (validEmails.length > 0) {
      setEmails([...emails, ...validEmails]);
      showToast(`Added ${validEmails.length} email(s)`, "success");
    }
    
    if (invalidEmails.length > 0) {
      showToast(`${invalidEmails.length} invalid email(s) skipped`, "warning");
    }
  };

  const removeEmail = (idx) => setEmails(emails.filter((_, i) => i !== idx));
  const clearAllEmails = () => setEmails([]);

  const addEstimation = () => {
    if (estimations.length >= MAX_ESTIMATIONS) {
      showToast(`Maximum ${MAX_ESTIMATIONS} estimations allowed`, "error");
      return;
    }
    setEstimations([...estimations, { title: "", description: "" }]);
  };

  const removeEstimation = (idx) => {
    if (estimations.length === 1) {
      showToast("At least one estimation is required", "error");
      return;
    }
    setEstimations(estimations.filter((_, i) => i !== idx));
    // Remove spam check for this estimation
    const newSpamChecks = { ...spamChecks };
    delete newSpamChecks[idx];
    setSpamChecks(newSpamChecks);
  };

  const updateEstimation = (idx, field, value) => {
    const updated = [...estimations];
    updated[idx][field] = value;
    setEstimations(updated);
    
    // Clear spam check when content changes
    if (spamChecks[idx]) {
      const newSpamChecks = { ...spamChecks };
      delete newSpamChecks[idx];
      setSpamChecks(newSpamChecks);
    }
  };

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

  // SPAM CHECK FUNCTION - Real spam detection
  const checkSpam = async (idx) => {
    const estimation = estimations[idx];
    if (!estimation.title.trim() || !estimation.description.trim()) {
      showToast("Please fill title and description first", "warning");
      return;
    }
    
    setCheckingSpam(true);
    setCheckingIndex(idx);
    
    // Simulate API call - In production, call your backend
    setTimeout(() => {
      const result = analyzeSpamContent(estimation.title, estimation.description);
      setSpamChecks(prev => ({
        ...prev,
        [idx]: result
      }));
      setCheckingSpam(false);
      setCheckingIndex(null);
      
      if (result.isSpam) {
        showToast(`⚠️ Spam detected! Score: ${result.score}%`, "warning");
      } else {
        showToast(`✅ Content looks good! Score: ${result.score}%`, "success");
      }
    }, 1000);
  };
  
  // Spam analysis function (same logic as backend)
  const analyzeSpamContent = (title, description) => {
    const spamWords = [
      { word: 'free', severity: 0.15 },
      { word: 'urgent', severity: 0.2 },
      { word: 'winner', severity: 0.2 },
      { word: 'congratulations', severity: 0.15 },
      { word: 'click here', severity: 0.1 },
      { word: 'limited time', severity: 0.15 },
      { word: 'offer', severity: 0.1 },
      { word: 'discount', severity: 0.1 },
      { word: 'cash', severity: 0.15 },
      { word: 'prize', severity: 0.2 },
      { word: '!!!', severity: 0.1 },
      { word: '$$$', severity: 0.15 },
      { word: 'guaranteed', severity: 0.1 },
      { word: 'act now', severity: 0.15 },
      { word: 'don\'t miss', severity: 0.1 },
      { word: 'exclusive', severity: 0.1 },
      { word: 'deal', severity: 0.1 },
      { word: 'cheap', severity: 0.15 },
      { word: 'amazing', severity: 0.05 },
      { word: 'unbelievable', severity: 0.1 }
    ];
    
    const foundSpamWords = [];
    let spamScore = 0;
    const lowerTitle = title.toLowerCase();
    const lowerDesc = description.toLowerCase();
    
    spamWords.forEach(({ word, severity }) => {
      if (lowerTitle.includes(word) || lowerDesc.includes(word)) {
        foundSpamWords.push(word);
        spamScore += severity;
      }
    });
    
    // Check for ALL CAPS in title
    if (title === title.toUpperCase() && title.length > 5) {
      foundSpamWords.push('ALL CAPS in title');
      spamScore += 0.2;
    }
    
    // Check for excessive exclamation marks
    const exclamationCount = (title.match(/!/g) || []).length;
    if (exclamationCount > 2) {
      foundSpamWords.push(`${exclamationCount} exclamation marks`);
      spamScore += 0.1 * exclamationCount;
    }
    
    // Check for excessive question marks
    const questionCount = (description.match(/\?/g) || []).length;
    if (questionCount > 5) {
      foundSpamWords.push(`${questionCount} question marks`);
      spamScore += 0.05;
    }
    
    // Check for suspicious links
    const linkCount = (description.match(/https?:\/\//g) || []).length;
    if (linkCount > 3) {
      foundSpamWords.push(`${linkCount} external links`);
      spamScore += 0.1 * linkCount;
    }
    
    // Cap spam score at 100
    spamScore = Math.min(Math.round(spamScore * 100), 100);
    
    // Generate suggestions
    const suggestions = [];
    if (foundSpamWords.includes('free')) suggestions.push('Replace "free" with "complimentary" or "no cost"');
    if (foundSpamWords.includes('urgent')) suggestions.push('Remove "urgent" or use "time-sensitive" instead');
    if (foundSpamWords.includes('winner')) suggestions.push('Remove "winner" - avoid lottery-style language');
    if (foundSpamWords.includes('congratulations')) suggestions.push('Replace "congratulations" with "great news"');
    if (foundSpamWords.includes('click here')) suggestions.push('Use descriptive link text instead of "click here"');
    if (foundSpamWords.includes('!!!')) suggestions.push('Reduce exclamation marks - use maximum 1-2');
    if (foundSpamWords.includes('ALL CAPS in title')) suggestions.push('Use normal case instead of ALL CAPS');
    if (foundSpamWords.includes('exclamation marks')) suggestions.push('Avoid multiple exclamation marks');
    if (foundSpamWords.includes('external links')) suggestions.push('Reduce number of links in email');
    
    return {
      isSpam: spamScore > 40,
      score: spamScore,
      foundWords: [...new Set(foundSpamWords)],
      suggestions: suggestions.slice(0, 4)
    };
  };

  // Apply fixes to spam content
  const applySpamFixes = (idx) => {
    const estimation = estimations[idx];
    const spamCheck = spamChecks[idx];
    
    if (!spamCheck) return;
    
    let fixedTitle = estimation.title;
    let fixedDescription = estimation.description;
    
    // Remove spam words
    const spamWordsToRemove = ['free', 'urgent', 'winner', 'congratulations', 'click here', 'limited time', 'offer', 'discount', 'cash', 'prize', '!!!', '$$$'];
    spamWordsToRemove.forEach(word => {
      const regex = new RegExp(word, 'gi');
      fixedTitle = fixedTitle.replace(regex, '');
      fixedDescription = fixedDescription.replace(regex, '');
    });
    
    // Fix ALL CAPS title
    if (fixedTitle === fixedTitle.toUpperCase() && fixedTitle.length > 5) {
      fixedTitle = fixedTitle.charAt(0).toUpperCase() + fixedTitle.slice(1).toLowerCase();
    }
    
    // Remove excessive exclamation marks
    fixedTitle = fixedTitle.replace(/!{2,}/g, '!');
    fixedDescription = fixedDescription.replace(/!{2,}/g, '!');
    
    // Clean up extra spaces
    fixedTitle = fixedTitle.trim().replace(/\s+/g, ' ');
    fixedDescription = fixedDescription.trim().replace(/\s+/g, ' ');
    
    // Update estimation
    updateEstimation(idx, 'title', fixedTitle);
    updateEstimation(idx, 'description', fixedDescription);
    
    // Clear spam check
    const newSpamChecks = { ...spamChecks };
    delete newSpamChecks[idx];
    setSpamChecks(newSpamChecks);
    
    showToast("✅ Spam fixes applied! Content has been cleaned.", "success");
  };

  // Get color for spam score
  const getSpamScoreColor = (score) => {
    if (score < 30) return "text-emerald-400";
    if (score < 60) return "text-amber-400";
    return "text-rose-400";
  };

  const getSpamScoreBg = (score) => {
    if (score < 30) return "bg-emerald-500/20";
    if (score < 60) return "bg-amber-500/20";
    return "bg-rose-500/20";
  };

  // Calculate distribution (DIVIDE mode)
  const getDistribution = () => {
    if (emails.length === 0 || estimations.length === 0) return [];
    
    const perEstimation = Math.ceil(emails.length / estimations.length);
    const distribution = [];
    
    for (let i = 0; i < estimations.length; i++) {
      const start = i * perEstimation;
      const end = Math.min(start + perEstimation, emails.length);
      const recipientCount = end - start;
      
      distribution.push({
        title: estimations[i].title || `Estimation ${i + 1}`,
        count: recipientCount,
        range: start > 0 ? `${start + 1}-${end}` : `1-${end}`,
        totalEmailsForThisEstimation: recipientCount
      });
    }
    return distribution;
  };

  const handleSendBatch = async () => {
    if (emails.length === 0) {
      showToast("Add at least one recipient email", "error");
      return;
    }
    
    for (let i = 0; i < estimations.length; i++) {
      if (!estimations[i].title.trim()) {
        showToast(`Estimation ${i+1}: Title is required`, "error");
        return;
      }
      if (!estimations[i].description.trim()) {
        showToast(`Estimation ${i+1}: Description is required`, "error");
        return;
      }
    }

    setSending(true);
    const formData = new FormData();
    
    const batchData = {
      batchName: `Batch ${new Date().toLocaleString()}`,
      estimationsData: estimations,
      recipients: emails
    };
    
    formData.append("batchData", JSON.stringify(batchData));
    attachments.forEach((file) => formData.append("attachments", file));

    try {
      const res = await fetch("http://localhost:5000/api/send-batch-estimations", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast(`✅ ${data.message}`, "success");
        setEmails([]);
        setEstimations([{ title: "", description: "" }]);
        setAttachments([]);
        setSpamChecks({});
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (activeTab === "history") fetchBatches();
      } else {
        showToast(data.message || "Failed to send batch", "error");
      }
    } catch (err) {
      showToast("Server error. Is the backend running?", "error");
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "completed": return "text-emerald-400 bg-emerald-400/10";
      case "partial": return "text-amber-400 bg-amber-400/10";
      case "failed": return "text-rose-400 bg-rose-400/10";
      case "processing": return "text-blue-400 bg-blue-400/10";
      default: return "text-slate-400 bg-slate-400/10";
    }
  };

  const distribution = getDistribution();
  const totalEmailsToSend = emails.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {toast && <ToastNotification message={toast.msg} type={toast.type} />}

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      <header className="relative border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/30 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
              EstiMail Pro
            </span>
          </div>
          
          <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
            <button onClick={() => setActiveTab("compose")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "compose" ? "bg-indigo-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}>
              ✏️ Compose
            </button>
            <button onClick={() => setActiveTab("history")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "history" ? "bg-indigo-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}>
              📊 History
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 text-xs">Spam Protection Active</span>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-6 py-10">
        
        {activeTab === "compose" ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-indigo-500/20">
              <h1 className="text-2xl font-bold text-white mb-2">Batch Estimations</h1>
              <p className="text-slate-400 text-sm">Each recipient will receive ONE email (distributed evenly across all estimations)</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">✅ Inbox Tracking</span>
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">⚠️ Spam Detection</span>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">🔄 Divide Mode</span>
              </div>
            </div>

            {/* Recipients Section */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <label className="text-sm font-semibold text-white">Recipients ({emails.length})</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleBulkAdd} className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded-lg">📋 Bulk Add</button>
                  {emails.length > 0 && <button onClick={clearAllEmails} className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-3 py-1 rounded-lg">Clear All</button>}
                </div>
              </div>

              <div className="min-h-[56px] max-h-[150px] overflow-y-auto flex flex-wrap gap-2 mb-3 p-2 bg-slate-800/30 rounded-xl">
                {emails.length === 0 ? (
                  <div className="text-sm text-slate-500 italic w-full text-center py-4">No recipients added yet</div>
                ) : (
                  emails.map((email, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs rounded-full px-3 py-1.5">
                      {email}
                      <button onClick={() => removeEmail(i)} className="text-indigo-400 hover:text-rose-400">✕</button>
                    </span>
                  ))
                )}
              </div>

              <input type="email" placeholder="Type email and press Enter..." value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={handleAddEmail} disabled={emails.length >= MAX_EMAILS} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/70" />
            </div>

            {/* Estimations Section with Spam Checker */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Estimations ({estimations.length}/{MAX_ESTIMATIONS})</h2>
                <button onClick={addEstimation} disabled={estimations.length >= MAX_ESTIMATIONS} className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-40">+ Add Estimation</button>
              </div>
              
              {estimations.map((est, idx) => {
                const spamCheck = spamChecks[idx];
                return (
                  <div key={idx} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">#{idx + 1}</span>
                      {estimations.length > 1 && <button onClick={() => removeEstimation(idx)} className="text-rose-400 hover:text-rose-300 text-xs bg-rose-500/20 px-2 py-1 rounded-full">Remove</button>}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1.5 block font-medium">Title #{idx + 1}</label>
                        <input type="text" placeholder="Estimation title" value={est.title} onChange={(e) => updateEstimation(idx, "title", e.target.value)} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/70" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1.5 block font-medium">Description #{idx + 1}</label>
                        <textarea rows={4} placeholder="Estimation details..." value={est.description} onChange={(e) => updateEstimation(idx, "description", e.target.value)} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/70 resize-none" />
                      </div>
                      
                      {/* Spam Check Button */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => checkSpam(idx)}
                          disabled={checkingSpam || !est.title || !est.description}
                          className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 flex items-center gap-1"
                        >
                          {checkingSpam && checkingIndex === idx ? (
                            <>
                              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Checking Spam...
                            </>
                          ) : (
                            <>🔍 Check Spam Score</>
                          )}
                        </button>
                        
                        {spamCheck && spamCheck.isSpam && (
                          <button
                            onClick={() => applySpamFixes(idx)}
                            className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                          >
                            ✨ Apply Fixes
                          </button>
                        )}
                      </div>
                      
                      {/* Spam Results Display */}
                      {spamCheck && (
                        <div className={`mt-2 p-4 rounded-xl ${spamCheck.isSpam ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                          {/* Score Header */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-400">SPAM SCORE</span>
                            <span className={`text-2xl font-bold ${getSpamScoreColor(spamCheck.score)}`}>{spamCheck.score}%</span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${spamCheck.score < 30 ? 'bg-emerald-500' : spamCheck.score < 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${spamCheck.score}%` }}
                            ></div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="mb-3">
                            {spamCheck.isSpam ? (
                              <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded-full">⚠️ High Spam Risk</span>
                            ) : spamCheck.score > 20 ? (
                              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">⚠️ Moderate Spam Risk</span>
                            ) : (
                              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">✅ Safe to Send</span>
                            )}
                          </div>
                          
                          {/* Found Spam Words */}
                          {spamCheck.foundWords.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-rose-400 mb-1 flex items-center gap-1">⚠️ Spam Triggers Found:</p>
                              <div className="flex flex-wrap gap-1">
                                {spamCheck.foundWords.slice(0, 6).map((word, i) => (
                                  <span key={i} className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">{word}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Suggestions */}
                          {spamCheck.suggestions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-700">
                              <p className="text-xs text-amber-400 mb-1 flex items-center gap-1">💡 Suggestions to Improve:</p>
                              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                                {spamCheck.suggestions.slice(0, 3).map((sug, i) => (
                                  <li key={i}>{sug}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Distribution Preview */}
            {emails.length > 0 && estimations.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20">
                <h3 className="text-white font-semibold mb-3">📊 Email Distribution (Divide Mode)</h3>
                <div className="space-y-2">
                  {distribution.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                      <span className="text-sm text-white flex-1">{item.title}</span>
                      <div className="text-right">
                        <span className="text-sm text-emerald-400">{item.count} recipients</span>
                        <span className="text-xs text-slate-500 ml-2">(Emails {item.range})</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-slate-700 pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">📧 Total Emails to Send</span>
                      <span className="text-emerald-400 font-bold text-lg">{totalEmailsToSend} emails</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span>ℹ️ Each recipient gets ONE email (divided among {estimations.length} estimations)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attachments */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <polyline points="13 2 13 9 20 9"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">Attachments (will be sent with all emails)</p>
              </div>
              
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-all">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                </div>
                <p className="text-sm text-slate-400">Click to browse files</p>
                <p className="text-xs text-slate-600 mt-2">PDF, Word, Excel, Images (Max 10MB each)</p>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
              </div>
              
              {attachments.length > 0 && (
                <div className="space-y-2 mt-4">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2">
                      <span className="text-lg">📎</span>
                      <span className="flex-1 text-sm text-white">{file.name}</span>
                      <button onClick={() => removeAttachment(i)} className="text-rose-400 hover:text-rose-300">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send Button */}
            <button onClick={handleSendBatch} disabled={sending || emails.length === 0 || estimations.some(e => !e.title || !e.description)} className="relative w-full group overflow-hidden rounded-2xl font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl"></div>
              <div className="relative py-4 px-6 flex items-center justify-center gap-2">
                {sending ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    <span className="text-white">Sending {totalEmailsToSend} emails...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    <span className="text-white">Send {totalEmailsToSend} Emails</span>
                  </>
                )}
              </div>
            </button>
          </div>
        ) : (
          /* History Tab */
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-indigo-500/20">
              <h1 className="text-2xl font-bold text-white mb-2">Batch History</h1>
              <p className="text-slate-400 text-sm">View all sent batches and their delivery status</p>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div></div>
            ) : batches.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <p className="text-slate-400">No batches sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {batches.map((batch, idx) => (
                  <div key={idx} className="bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{batch.batchName}</h3>
                        <p className="text-xs text-slate-500 mt-1">{new Date(batch.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(batch.status)}`}>{batch.status}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div><p className="text-xs text-slate-500">Estimations</p><p className="text-sm font-semibold text-white">{batch.totalEstimations}</p></div>
                      <div><p className="text-xs text-slate-500">Total Sent</p><p className="text-sm font-semibold text-emerald-400">{batch.totalSent}</p></div>
                      <div><p className="text-xs text-slate-500">📥 Inbox</p><p className="text-sm font-semibold text-green-400">{batch.totalInbox || 0}</p></div>
                      <div><p className="text-xs text-slate-500">⚠️ Spam</p><p className="text-sm font-semibold text-orange-400">{batch.totalSpam || 0}</p></div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>📥 Inbox Rate</span>
                        <span>{batch.totalSent > 0 ? Math.round(((batch.totalInbox || 0) / batch.totalSent) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full" style={{ width: `${batch.totalSent > 0 ? ((batch.totalInbox || 0) / batch.totalSent) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                    
                    <details className="mt-3">
                      <summary className="text-xs text-indigo-400 cursor-pointer hover:text-indigo-300">View Details</summary>
                      <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
                        {batch.estimations.map((est, i) => (
                          <div key={i} className="bg-slate-800/50 rounded-lg p-4">
                            <p className="text-sm font-medium text-white">{est.title}</p>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 mb-2">{est.description}</p>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div><p className="text-slate-500">Sent</p><p className="text-emerald-400 font-semibold">{est.sentCount || 0}</p></div>
                              <div><p className="text-slate-500">📥 Inbox</p><p className="text-green-400 font-semibold">{est.inboxCount || 0}</p></div>
                              <div><p className="text-slate-500">⚠️ Spam</p><p className="text-orange-400 font-semibold">{est.spamCount || 0}</p></div>
                              <div><p className="text-slate-500">Failed</p><p className="text-rose-400 font-semibold">{est.failedCount || 0}</p></div>
                            </div>
                            {est.spamEmails && est.spamEmails.length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-orange-400 cursor-pointer">⚠️ Spam emails ({est.spamEmails.length})</summary>
                                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                                  {est.spamEmails.map((email, i) => <p key={i} className="text-xs text-orange-300 bg-orange-500/10 p-1 rounded">{email}</p>)}
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
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