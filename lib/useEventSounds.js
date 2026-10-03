"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { matchEventsTimeline } from "./logic";

// يشغّل فقط المقاطع التي رفعها المشرف (بدون أي صوت اصطناعي/تعليق آلي).
// - تُحمَّل المقاطع مرة واحدة وتُجهَّز مسبقًا (preload) فتعمل فورًا.
// - طابور تشغيل: إن وقعت عدة أحداث معًا تُشغَّل بالتتابع بدل أن تتقاطع أو تضيع.
// - يتم "فتح" الصوت عند أول لمسة/نقرة من الزائر (شرط المتصفحات)، مع زر ظاهر إن لزم.
export function useEventSounds(data, enabled = true) {
  const [hasClips, setHasClips] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [flash, setFlash] = useState(null);
  const audios = useRef({});
  const primed = useRef(new WeakSet());
  const seen = useRef(null);
  const liveIds = useRef(new Set());
  const queue = useRef([]);
  const busy = useRef(false);
  const tick = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const version = data?.soundsVersion || "";

  const prime = useCallback(() => {
    Object.values(audios.current).forEach((a) => {
      if (primed.current.has(a)) return;
      primed.current.add(a);
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        })
        .catch(() => {
          a.muted = false;
        });
    });
  }, []);

  const unlock = useCallback(() => {
    setUnlocked(true);
    prime();
  }, [prime]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (navigator.userActivation?.hasBeenActive) setUnlocked(true);
    const on = () => unlock();
    const evs = ["pointerdown", "keydown", "touchstart"];
    evs.forEach((ev) => window.addEventListener(ev, on, { once: true, passive: true }));
    return () => evs.forEach((ev) => window.removeEventListener(ev, on));
  }, [unlock]);

  // تحميل المقاطع عند تغيّر نسخة الصوت فقط
  useEffect(() => {
    if (!version) {
      audios.current = {};
      setHasClips(false);
      return;
    }
    let dead = false;
    fetch(`/api/sounds-public?v=${version}`)
      .then((r) => r.json())
      .then((j) => {
        if (dead) return;
        const next = {};
        Object.entries(j.clips || {}).forEach(([type, v]) => {
          const url = typeof v === "string" ? v : v?.url || v?.data;
          if (!url) return;
          const a = new Audio();
          a.preload = "auto";
          a.src = url;
          next[type] = a;
        });
        audios.current = next;
        setHasClips(Object.keys(next).length > 0);
        if (navigator.userActivation?.hasBeenActive) prime();
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [version, prime]);

  const pump = useCallback(() => {
    if (busy.current) return;
    const item = queue.current.shift();
    if (!item) return;
    const a = audios.current[item];
    if (!a) return pump();
    busy.current = true;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      a.removeEventListener("ended", done);
      a.removeEventListener("error", done);
      busy.current = false;
      pump();
    };
    const guard = setTimeout(done, 15000);
    a.addEventListener("ended", done);
    a.addEventListener("error", done);
    try {
      a.currentTime = 0;
    } catch {}
    a.play().catch(() => {
      setUnlocked(false); // المتصفح منع التشغيل: أظهر زر التفعيل
      done();
    });
  }, []);

  const enqueue = useCallback(
    (type) => {
      if (!enabledRef.current || !audios.current[type]) return;
      if (queue.current.length < 6) queue.current.push(type);
      pump();
    },
    [pump]
  );

  useEffect(() => {
    if (!data?.matches) return;
    const teamById = Object.fromEntries((data.teams || []).map((t) => [t.id, t]));
    const first = seen.current === null;
    if (first) seen.current = new Set();
    let lastType = null;

    data.matches.forEach((m) => {
      matchEventsTimeline(m, teamById[m.teamA], teamById[m.teamB]).forEach((e) => {
        const key = `${m.id}:${e.id}`;
        if (seen.current.has(key)) return;
        seen.current.add(key);
        if (first) return; // أحداث موجودة قبل فتح الصفحة: لا تُشغَّل
        // كل حدث جديد يُشغَّل (سواء كانت الساعة تعمل أم متوقفة مؤقتًا)
        lastType = e.type;
        enqueue(e.type);
      });
    });

    const nowLive = new Set(data.matches.filter((m) => m.clock?.running).map((m) => m.id));
    if (!first) {
      liveIds.current.forEach((id) => {
        if (nowLive.has(id)) return;
        const m = data.matches.find((x) => x.id === id);
        if (m && (m.clock?.remainingSeconds ?? 0) <= 0) {
          lastType = "fulltime";
          enqueue("fulltime"); // يعمل فقط إن رفع المشرف مقطعًا بهذا الاسم
        }
      });
    }
    liveIds.current = nowLive;

    if (lastType) {
      tick.current += 1;
      setFlash({ tick: tick.current, type: lastType });
    }
  }, [data?.matches, data?.teams, enqueue]);

  return { flash, hasClips, needsUnlock: hasClips && !unlocked, unlock };
}
