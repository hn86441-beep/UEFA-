import "./globals.css";

export const metadata = {
  title: "دوري الأبطال",
  description: "منصة إدارة دوري كرة القدم — الترتيب، المجموعات، القرعة والنتائج",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Teko:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="stadium-bg">
          <div className="floodlight fl1" />
          <div className="floodlight fl2" />
          <div className="pitch-lines" />
        </div>
        {children}
      </body>
    </html>
  );
}
