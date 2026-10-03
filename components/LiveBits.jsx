"use client";

export const EVENT_META = {
  goal: { icon: "⚽", label: "هدف", color: "text-gold2" },
  save: { icon: "🧤", label: "تصدٍّ", color: "text-sky-300" },
  yellow: { icon: "🟨", label: "بطاقة صفراء", color: "text-yellow-300" },
  red: { icon: "🟥", label: "بطاقة حمراء", color: "text-red-400" },
  foul: { icon: "🚫", label: "خطأ", color: "text-white/70" },
  corner: { icon: "🚩", label: "ركنية", color: "text-white/70" },
  offside: { icon: "🏳️", label: "تسلل", color: "text-white/70" },
  penalty: { icon: "🎯", label: "ركلة جزاء", color: "text-gold2" },
};

export function eventMeta(type) {
  return EVENT_META[type] || { icon: "🔹", label: type || "حدث", color: "text-white/70" };
}

export function eventText(e) {
  const m = eventMeta(e.type);
  return `${m.icon} ${m.label}${e.playerName ? ` — ${e.playerName}` : ""}`;
}

// ومضة لحظية عند وقوع حدث حي
export function LiveFlash({ event }) {
  if (!event) return null;
  const c =
    event.type === "goal" ? "bg-gold/20"
    : event.type === "red" ? "bg-red-500/20"
    : event.type === "save" ? "bg-sky-400/15"
    : event.type === "fulltime" ? "bg-white/25"
    : "bg-yellow-300/15";
  return <div key={event.tick} className={`fixed inset-0 pointer-events-none z-40 flash-pulse ${c}`} />;
}

// يظهر فقط إذا رفع المشرف مقاطع صوتية؛ وبدونها لا يوجد أي صوت
export function SoundToggle({ on, setOn, needsUnlock, unlock, hasClips }) {
  if (!hasClips) return null;
  if (needsUnlock && on) {
    return (
      <button onClick={unlock} className="text-xs px-4 py-2 rounded-full border border-gold bg-gold/15 text-gold2 animate-pulse">
        🔔 اضغط لتفعيل الأصوات
      </button>
    );
  }
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`text-xs px-4 py-2 rounded-full border transition ${on ? "border-gold/50 text-gold2 bg-gold/10" : "border-white/15 text-white/40"}`}
    >
      🔊 الأصوات {on ? "مفعّلة" : "معطّلة"}
    </button>
  );
}
