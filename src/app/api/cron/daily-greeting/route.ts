import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendTelegramPhoto, bold } from "@/lib/telegram";

const TIMEZONE = "Asia/Hebron";

// يُستضاف تحت public/ فيُخدَّم من نفس نطاق النشر على Vercel — تيليجرام يجلبه
// كرابط عام عند كل إرسال، بلا حاجة لرفعه يدوياً كل مرة.
const LOGO_URL = "https://nassem-system.vercel.app/nasseem-logo.jpg";

const SIGNATURE = `\n\n${bold("بتوفيق مجلس الإدارة")} 🌿`;

// جمل صباحية/مسائية متنوعة — تُختار عشوائياً في كل إرسال حتى لا تتكرر
// الرسالة نفسها كل يوم بنفس الصياغة.
const MORNING_MESSAGES = [
  `☀️ ${bold("صباح الخير")}!\n\nيوم جديد مليء بالفرص، فلنبدأه بهمّة ونشاط 💪`,
  `🌅 ${bold("صباح النشاط")}!\n\nكل يوم فرصة جديدة للتميّز والإنجاز، بالتوفيق للجميع 🌟`,
  `☕ ${bold("صباح الخير")}!\n\nنتمنى لكم يوم عمل مثمر مليء بالإنجازات 🚀`,
  `🌞 ${bold("صباح الإبداع")}!\n\nابدأ يومك بابتسامة وعزيمة، فريق النسيم يقدر جهودكم 🌿`,
  `✨ ${bold("صباح الخير")}!\n\nطاقة إيجابية ليوم موفّق بإذن الله لكل فريق العمل 🙌`,
];

const EVENING_MESSAGES = [
  `🌆 ${bold("مساء الخير")}!\n\nشكراً لجهودكم اليوم، نتمنى لكم راحة تستحقونها ونشوفكم بكرة بإذن الله 🌙`,
  `🌇 ${bold("مساء الطيب")}!\n\nيوم آخر من العطاء ينتهي بخير، دمتم بصحة ونشاط 🌟`,
  `🌃 ${bold("مساء الخير")}!\n\nنقدّر كل جهد بذلتموه اليوم، إلى لقاء قريب بإذن الله 🌿`,
  `🌙 ${bold("مساء الهدوء")}!\n\nراحة طيبة لكم جميعاً، ونستقبلكم غداً بنشاط جديد 🙏`,
];

const FRIDAY_MESSAGE =
  `🌙 ${bold("اللهم صلِّ وسلِّم وبارك على نبينا محمد وعلى آله وصحبه أجمعين")}\n\n${bold("جمعة مباركة")} على الجميع 🌸`;

function isFriday(): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "long" }).format(new Date());
  return weekday === "Friday";
}

function todayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

function pickRandom(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)];
}

// مهمة مجدولة (Vercel Cron) — تُستدعى مرتين يومياً (صباحاً ومساءً، انظر
// vercel.json). يوم الجمعة: رسالة واحدة فقط بدل الصباحية، وتُلغى المسائية.
// تصل لكل موظف نشط له telegram_chat_id مسجّل، بغض النظر عن حساب دخوله للويب.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const type = new URL(req.url).searchParams.get("type");
  if (type !== "morning" && type !== "evening") {
    return NextResponse.json({ ok: false, error: "missing or invalid ?type=morning|evening" }, { status: 400 });
  }

  const friday = isFriday();
  if (type === "evening" && friday) {
    return NextResponse.json({ ok: true, skipped: "friday-evening" });
  }

  const dateStr = todayDateString();
  const { error: dedupeError } = await supabase
    .from("erp_scheduled_message_log")
    .insert([{ log_date: dateStr, message_type: type }]);

  if (dedupeError) {
    return NextResponse.json({ ok: true, skipped: "already-sent-today" });
  }

  const body = friday ? FRIDAY_MESSAGE : type === "morning" ? pickRandom(MORNING_MESSAGES) : pickRandom(EVENING_MESSAGES);
  const caption = body + SIGNATURE;

  const { data: staffList } = await supabase
    .from("erp_staff")
    .select("telegram_chat_id")
    .not("telegram_chat_id", "is", null)
    .eq("is_active", true);

  let sent = 0;
  for (const s of staffList || []) {
    if (s.telegram_chat_id) {
      await sendTelegramPhoto(s.telegram_chat_id, LOGO_URL, caption);
      sent++;
    }
  }

  return NextResponse.json({ ok: true, type, friday, sent });
}
