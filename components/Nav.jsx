"use client";
import Link from "next/link";

export default function Nav({ leagueName = "دوري الأبطال" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gold/10 bg-[#04060d]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <svg width="30" height="30" viewBox="0 0 24 24" className="crest-star">
            <path
              fill="url(#g1)"
              d="M12 1.5l2.9 6.26 6.9.86-5.1 4.78 1.45 6.8L12 16.9l-6.15 3.3 1.45-6.8-5.1-4.78 6.9-.86L12 1.5z"
            />
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f6e2a0" />
                <stop offset="100%" stopColor="#a9812a" />
              </linearGradient>
            </defs>
          </svg>
          <span className="font-display text-2xl tracking-wide gold-text">{leagueName}</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link href="/?tab=standings" className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/5 transition">الترتيب</Link>
          <Link href="/?tab=groups" className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/5 transition">المجموعات</Link>
          <Link href="/?tab=bracket" className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/5 transition">خروج المغلوب</Link>
          <Link
            href="/admin"
            className="px-3 py-2 rounded-lg border border-gold/40 text-gold2 hover:bg-gold/10 transition font-semibold"
          >
            لوحة التحكم
          </Link>
        </nav>
      </div>
    </header>
  );
}
