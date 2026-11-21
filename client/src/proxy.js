import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  const isProtectedRoute = ["/dashboard", "/admin", "/doctor"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (isProtectedRoute) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
