import { NextResponse } from "next/server";
import { isTokenValid } from "./lib/token";

export function proxy(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("authToken")?.value;
  const isAuthPage = pathname === "/login";

  if (!token) {
    if (!isAuthPage) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  if (!isTokenValid(token)) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    try {
      res.cookies.set("authToken", "", { maxAge: 0, path: "/" });
    } catch (e) {
    }
    return res;
  }

  if (isAuthPage) {
    const previous = req.headers.get("referer") || "/";
    const redirectUrl = new URL(previous, req.url);
    if (redirectUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
