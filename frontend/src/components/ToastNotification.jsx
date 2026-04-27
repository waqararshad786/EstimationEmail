import { useEffect, useState } from "react";

export default function ToastNotification({ message, type = "success", duration = 3500 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  const config = {
    success: { bg: "from-emerald-500 to-teal-600", icon: "✓", border: "emerald-500" },
    error: { bg: "from-rose-500 to-red-600", icon: "✗", border: "rose-500" },
    warning: { bg: "from-amber-500 to-orange-600", icon: "⚠", border: "amber-500" }
  };

  const { bg, icon, border } = config[type] || config.success;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
      <div className={`bg-gradient-to-r ${bg} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-sm border-l-4 border-${border}`}>
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-sm font-bold">{icon}</span>
        </div>
        <p className="text-sm font-medium">{message}</p>
        <button onClick={() => setIsVisible(false)} className="text-white/70 hover:text-white ml-2 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}