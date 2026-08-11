import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";

const TIMEZONE = "Asia/Hebron";

const MORNING_MESSAGE = "☀️ صباح الخير!\n\nنتمنى لك يوم جميل ومثمر 🌿";
const EVENING_MESSAGE = "🌆 مساء الخير!\n\nنتمنى لك بقية يوم هادئة، ونشوفك بكرة بإذن الله.";
const FRIDAY_MESSAGE = "🌙 اللهم صلِّ وسلّم وبارك على سيدنا محمد ﷺ\n\nجمعة مباركة على الجميع 🌸";

function isFriday(): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "long" }).format(new Date());
  return weekday === "Friday";
}

function todayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
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

  const text = type === "morning" ? (friday ? FRIDAY_MESSAGE : MORNING_MESSAGE) : EVENING_MESSAGE;

  const { data: staffList } = await supabase
    .from("erp_staff")
    .select("telegram_chat_id")
    .not("telegram_chat_id", "is", null)
    .eq("is_active", true);

  let sent = 0;
  for (const s of staffList || []) {
    if (s.telegram_chat_id) {
      await sendTelegramMessage(s.telegram_chat_id, text);
      sent++;
    }
  }

  return NextResponse.json({ ok: true, type, friday, sent });
}
