"use client";
import { useEffect, useState } from "react";

const COLORS = ["#d4af37", "#f3d675", "#b17ef0", "#ffffff", "#8a2be2"];

/**
 * تأثير كونفيتي بسيط وخفيف بدون أي مكتبة خارجية.
 * استخدمه بتمرير "trigger" برقم يتغيّر (counter) في كل مرة تريد إطلاق الكونفيتي.
 */
export default function Confetti({ trigger }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const count = 26;
    const newPieces = Array.from({ length: count }, (_, i) => ({
      id: `${trigger}_${i}`,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 6,
      duration: 1.4 + Math.random() * 1.2,
      delay: Math.random() * 0.2,
    }));
    setPieces(newPieces);
    const t = setTimeout(() => setPieces([]), 2800);
    return () => clearTimeout(t);
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            borderRadius: 2,
          }}
        />
      ))}
    </>
  );
}
