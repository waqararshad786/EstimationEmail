export default function EmailComposer({ title, setTitle, description, setDescription }) {
  return (
    <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-white">Email Content</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block font-medium">Subject / Title</label>
          <input
            type="text"
            placeholder="e.g., Estimation for Website Redesign Project"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-500 font-medium">Description / Body</label>
            <span className="text-[10px] text-slate-600">{description.length} characters</span>
          </div>
          <textarea
            rows={8}
            placeholder={`Dear Client,

Please find the estimation details below...

Scope of Work:
• Feature 1: $X
• Feature 2: $X

Total Estimated Cost: $X
Timeline: X weeks

Best regards,
Your Team`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}