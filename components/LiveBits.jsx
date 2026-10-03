"use client";
import { useEffect, useState } from "react";

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

const BANNER = {
  goal: { icon: "⚽", title: "هــدف!", cls: "border-gold bg-gold/15 text-gold2" },
  red: { icon: "🟥", title: "بطاقة حمراء", cls: "border-red-500 bg-red-500/15 text-red-300" },
  yellow: { icon: "🟨", title: "إنذار", cls: "border-yellow-400 bg-yellow-400/15 text-yellow-200" },
  save: { icon: "🧤", title: "تصدٍّ رائع", cls: "border-sky-400 bg-sky-400/15 text-sky-200" },
  fulltime: { icon: "⏰", title: "نهاية المباراة", cls: "border-white/50 bg-white/10 text-white" },
};

// ومضة لحظية + لافتة احتفال قصيرة (اسم اللاعب والفريق والدقيقة)
export function LiveFlash({ event }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!event) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 4500);
    return () => clearTimeout(t);
  }, [event?.tick]);
  if (!event) return null;
  const c =
    event.type === "goal" ? "bg-gold/20"
    : event.type === "red" ? "bg-red-500/20"
    : event.type === "save" ? "bg-sky-400/15"
    : event.type === "fulltime" ? "bg-white/25"
    : "bg-yellow-300/15";
  const b = BANNER[event.type];
  return (
    <>
      <div key={event.tick} className={`fixed inset-0 pointer-events-none z-40 flash-pulse ${c}`} />
      {show && b && (
        <div
          key={`b${event.tick}`}
          className={`fixed inset-x-3 top-16 z-50 mx-auto max-w-sm rounded-2xl border-2 px-4 py-3 text-center backdrop-blur-0 pointer-events-none pop-in bg-[#0b0d20] ${b.cls}`}
        >
          <p className="font-brand text-3xl leading-none">{b.icon} {b.title}</p>
          {(event.player || event.team) && (
            <p className="text-sm text-white mt-1">
              {event.player} {event.team ? <span className="text-white/60">— {event.team}</span> : null}
              {event.minute ? <span className="text-white/60"> · {event.minute}'</span> : null}
            </p>
          )}
        </div>
      )}
    </>
  );
}

// يظهر فقط إذا رفع المشرف مقاطع صوتية؛ وبدونها لا يوجد أي صوت
export function SoundToggle({ on, setOn, needsUnlock, unlock, hasClips, test, status }) {
  if (!hasClips) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {needsUnlock && on ? (
        <button onClick={unlock} className="text-xs px-4 py-2 rounded-full border border-gold bg-gold/15 text-gold2 animate-pulse">
          🔔 اضغط لتفعيل الأصوات
        </button>
      ) : (
        <button
          onClick={() => setOn((v) => !v)}
          className={`text-xs px-4 py-2 rounded-full border transition ${on ? "border-gold/50 text-gold2 bg-gold/10" : "border-white/15 text-white/40"}`}
        >
          🔊 الأصوات {on ? "مفعّلة" : "معطّلة"}
        </button>
      )}
      {test && on && (
        <button onClick={test} className="text-xs px-3 py-2 rounded-full border border-white/15 text-white/60 hover:text-white">
          ▶ تجربة
        </button>
      )}
      {status === "error" && <span className="text-[11px] text-red-300">تعذّر تحميل ملف الصوت</span>}
    </div>
  );
}
