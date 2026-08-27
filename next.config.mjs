/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdfkit@0.20 يحل الخطوط القياسية عبر subpath imports في package.json
    // الخاص به (مثل "#standard-fonts/Helvetica" -> "./js/standard-fonts/*.mjs").
    // webpack (وتتبّع @vercel/nft) لا يحللان هذا النمط الديناميكي بشكل صحيح
    // فتفشل الدالة بصمت في الإنتاج بـ "Cannot find module '#standard-fonts/Helvetica'"
    // رغم عملها محلياً. الحل: استبعادها من حزمة webpack ليتولى Node نفسه
    // حل الـ imports/exports وقت التشغيل، مع تضمين كامل مجلد الحزمة صراحة
    // في تتبّع الملفات كي تصل فعلياً للنشر على Vercel.
    serverComponentsExternalPackages: ['xlsx', 'pdfkit', 'fontkit'],
    outputFileTracingIncludes: {
      '/api/telegram-webhook': ['./node_modules/pdfkit/**', './node_modules/fontkit/**'],
    },
  },
};

export default nextConfig;
