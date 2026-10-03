"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { matchEventsTimeline } from "./logic";

// يشغّل فقط المقاطع التي رفعها المشرف (لا صوت اصطناعي).
// التغيير المهم: كل مقطع يُحمَّل كملف صوت مستقل من /api/sounds/<النوع> (يدعم Range لآيفون)،
// بدل جلب كل المقاطع دفعة واحدة داخل JSON (كان يتجاوز حد Vercel ويفشل بصمت فتومض الشاشة بلا صوت).
export function useEventSounds(data, enabled = true) {
  const [hasClips, setHasClips] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [flash, setFlash] = useState(null);
  const [status, setStatus] = useState("");
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
  const typesKey = (data?.soundTypes || []).join(",");

  const prime = useCallback(() => {
    Object.values(audios.current).forEach((a) => {
      if (primed.current.has(a)) return;
      primed.current.add(a);
      a.muted = true;
      a.play()
        .then(() => {
          if (!a._real) {
            a.pause();
            a.currentTime = 0;
          }
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

  useEffect(() => {
    const types = typesKey ? typesKey.split(",") : [];
    if (!version || types.length === 0) {
      audios.current = {};
      setHasClips(false);
      return;
    }
    const next = {};
    types.forEach((t) => {
      const a = new Audio();
      a.preload = "auto";
      a.addEventListener("error", () => setStatus("error"));
      a.src = `/api/sounds/${encodeURIComponent(t)}?v=${version}`;
      a.load();
      next[t] = a;
    });
    audios.current = next;
    setHasClips(true);
    if (navigator.userActivation?.hasBeenActive) prime();
  }, [version, typesKey, prime]);

  const pump = useCallback(() => {
    if (busy.current) return;
    const type = queue.current.shift();
    if (!type) return;
    const a = audios.current[type];
    if (!a) return pump();
    busy.current = true;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      a._real = false;
      a.removeEventListener("ended", done);
      a.removeEventListener("error", done);
      busy.current = false;
      pump();
    };
    const guard = setTimeout(done, 20000);
    a.addEventListener("ended", done);
    a.addEventListener("error", done);
    a._real = true;
    a.muted = false;
    try {
      a.currentTime = 0;
    } catch {}
    a.play()
      .then(() => setStatus("ok"))
      .catch((err) => {
        if (err?.name === "NotAllowedError") {
          setUnlocked(false);
          setStatus("blocked");
        } else setStatus("error");
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

  // زر "تجربة": يشغّل أول مقطع فورًا (ويفتح الصوت أيضًا)
  const test = useCallback(() => {
    const t = audios.current.goal ? "goal" : Object.keys(audios.current)[0];
    const a = t && audios.current[t];
    if (!a) return;
    primed.current.add(a);
    a._real = true;
    a.muted = false;
    unlock();
    try {
      a.currentTime = 0;
    } catch {}
    a.play()
      .then(() => setStatus("ok"))
      .catch(() => setStatus("blocked"));
    setTimeout(() => (a._real = false), 12000);
  }, [unlock]);

  useEffect(() => {
    if (!data?.matches) return;
    const teamById = Object.fromEntries((data.teams || []).map((t) => [t.id, t]));
    const first = seen.current === null;
    if (first) seen.current = new Set();
    let last = null;

    data.matches.forEach((m) => {
      matchEventsTimeline(m, teamById[m.teamA], teamById[m.teamB]).forEach((e) => {
        const key = `${m.id}:${e.id}`;
        if (seen.current.has(key)) return;
        seen.current.add(key);
        if (first) return;
        last = { type: e.type, player: e.playerName, team: e.teamName, minute: e.minute };
        enqueue(e.type);
      });
    });

    const nowLive = new Set(data.matches.filter((m) => m.clock?.running).map((m) => m.id));
    if (!first) {
      liveIds.current.forEach((id) => {
        if (nowLive.has(id)) return;
        const m = data.matches.find((x) => x.id === id);
        if (m && (m.clock?.remainingSeconds ?? 0) <= 0) {
          last = { type: "fulltime" };
          enqueue("fulltime");
        }
      });
    }
    liveIds.current = nowLive;

    if (last) {
      tick.current += 1;
      setFlash({ tick: tick.current, ...last });
    }
  }, [data?.matches, data?.teams, enqueue]);

  return { flash, hasClips, needsUnlock: hasClips && !unlocked, unlock, test, status };
}
