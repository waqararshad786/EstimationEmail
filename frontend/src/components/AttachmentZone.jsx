const ICONS = {
  pdf: "📄", image: "🖼️", doc: "📝", default: "📎"
};

function getIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (ext === "pdf") return ICONS.pdf;
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return ICONS.image;
  if (["doc","docx","txt"].includes(ext)) return ICONS.doc;
  return ICONS.default;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AttachmentZone({ attachments, fileInputRef, onFileChange, onRemove }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const fakeEvent = { target: { files } };
    onFileChange(fakeEvent);
  };

  return (
    <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-white">Attachments</p>
        {attachments.length > 0 && (
          <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
            {attachments.length} file(s)
          </span>
        )}
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group/drop"
      >
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 group-hover/drop:bg-indigo-500/10 flex items-center justify-center transition-all duration-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </div>
        <p className="text-sm text-slate-400 group-hover/drop:text-slate-300 transition-colors">
          Drop files here or <span className="text-indigo-400 font-medium">click to browse</span>
        </p>
        <p className="text-xs text-slate-600 mt-2">PDF, Word, Excel, Images, ZIP (Max 10MB each)</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip"
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2 mt-4 max-h-48 overflow-y-auto custom-scrollbar">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/50 hover:border-slate-600 transition-all group/file">
              <span className="text-xl">{getIcon(file.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={() => onRemove(i)}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1 opacity-0 group-hover/file:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}