"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// url: الصفحات العامة تستخدم "/api/live" (خفيف ومخزَّن مؤقتًا)، ولوحة التحكم تبقى على "/api/data"
export function useLeagueData({ poll = 0, url = "/api/data" } = {}) {
  const [data, setDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastRaw = useRef("");
  const inflight = useRef(false);
  const seq = useRef(0);

  const load = useCallback(
    async (silent) => {
      if (silent && inflight.current) return;
      inflight.current = true;
      const mine = ++seq.current;
      try {
        const res = await fetch(url, { cache: "no-store" });
        const raw = await res.text();
        let json = {};
        try {
          json = JSON.parse(raw);
        } catch {}
        if (!res.ok) throw new Error(json.error || "تعذر تحميل البيانات");
        if (mine !== seq.current) return; // وصلت نسخة أحدث بالفعل
        // لا نُحدّث الحالة (ولا نعيد رسم الصفحة كلها) إذا لم يتغير شيء — هذا أكبر سبب للثِقَل
        if (raw !== lastRaw.current) {
          lastRaw.current = raw;
          setDataState(json);
        }
        setError(null);
      } catch (e) {
        if (!silent) setError(e.message);
      } finally {
        inflight.current = false;
        setLoading(false);
      }
    },
    [url]
  );

  const refresh = useCallback(() => load(false), [load]);
  const setData = useCallback((v) => {
    lastRaw.current = ""; // يضمن أن التحديث التالي يعيد المزامنة مع الخادم
    setDataState(v);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    if (!poll) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return; // لا تحديث والتبويب مخفي
      load(true);
    };
    const t = setInterval(tick, poll);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [poll, load]);

  return { data, loading, error, refresh, setData };
}

// دالة عامة لاستدعاء نقاط الـ API الموحّدة تحت /api/*
export async function callApi(url, method = "POST", body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "حدث خطأ");
  return json;
}
