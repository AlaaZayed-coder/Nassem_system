import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "نسيم - تطبيق الموظفين",
  description: "Telegram Mini App for Nassem ERP Staff",
};

export default function TelegramAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body className="bg-slate-50 min-h-screen text-slate-800 antialiased font-sans">
        <main className="max-w-md mx-auto min-h-screen bg-white shadow-xl shadow-slate-200/50 relative">
          {children}
        </main>
      </body>
    </html>
  );
}
