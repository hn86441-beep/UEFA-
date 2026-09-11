"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useLeagueData({ poll = 0 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "تعذر تحميل البيانات");
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // تحديث صامت في الخلفية (بدون وميض شاشة التحميل) — يُستخدم لتحديث المباريات المباشرة
  const silentRefresh = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(json);
        setError(null);
      }
    } catch {
      /* تجاهل أخطاء التحديث الصامت في الخلفية */
    } finally {
      pollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!poll) return;
    const t = setInterval(silentRefresh, poll);
    return () => clearInterval(t);
  }, [poll, silentRefresh]);

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
