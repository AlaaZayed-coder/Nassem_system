/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx'],
    // pdfkit يقرأ ملفات بيانات الخطوط (.afm) من node_modules/pdfkit/js/data
    // عبر fs مباشرة وقت التشغيل، ولا يكتشفها تتبّع الملفات الافتراضي في
    // Vercel لأنها ليست imports — بدونها يفشل بناء PDF بصمت في الإنتاج
    // فقط (يعمل محلياً لوجود node_modules كاملة).
    outputFileTracingIncludes: {
      '/api/telegram-webhook': ['./node_modules/pdfkit/js/data/**'],
    },
  },
};

export default nextConfig;
