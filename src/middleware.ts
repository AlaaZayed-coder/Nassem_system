import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, signSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { canAccessPath } from "@/lib/access-control";
import { supabase } from "@/lib/supabase";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // نتحقق من الدور وحالة التفعيل الحالية بقاعدة البيانات في كل طلب، حتى تنعكس
  // تغييرات الدور أو تعطيل الحساب فوراً بدل انتظار انتهاء صلاحية الجلسة (7 أيام).
  const { data: staff } = await supabase
    .from("erp_staff")
    .select("role, name, is_active")
    .eq("id", session.staffId)
    .maybeSingle();

  if (!staff || !staff.is_active) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const currentRole = staff.role;

  if (pathname !== "/dashboard" && pathname !== "/" && !canAccessPath(currentRole, pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();

  if (currentRole !== session.role || staff.name !== session.name) {
    const freshToken = await signSessionToken({ ...session, role: currentRole, name: staff.name });
    res.cookies.set(SESSION_COOKIE, freshToken, SESSION_COOKIE_OPTIONS);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/"],
};
