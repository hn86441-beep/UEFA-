"use client";
// شبكة أمان: بدل الرسالة العامة "Application error" تُظهر هذه الصفحة سبب الخطأ الحقيقي وزر إعادة المحاولة
export default function ErrorPage({ error, reset }) {
  return (
    <main dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "#fff", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>⚠️ حدث خطأ في الصفحة</h1>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 16 }}>أرسل لي النص الأحمر أدناه لأصلح السبب مباشرة.</p>
      <pre style={{ textAlign: "left", direction: "ltr", background: "rgba(255,0,0,.12)", border: "1px solid rgba(255,80,80,.4)", color: "#fca5a5", padding: 12, borderRadius: 10, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {String(error?.message || error)}
        {error?.stack ? `\n\n${String(error.stack).split("\n").slice(0, 6).join("\n")}` : ""}
      </pre>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
        <button onClick={() => reset()} style={{ padding: "10px 18px", borderRadius: 10, background: "#d4af37", color: "#000", fontWeight: 700, border: 0 }}>إعادة المحاولة</button>
        <button onClick={() => location.reload()} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,.25)", color: "#fff", background: "transparent" }}>تحديث الصفحة</button>
      </div>
    </main>
  );
}
