import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/create-podcast(.*)",
  "/podcasts/(.*)/edit",
  "/shows/new",
  "/shows/(.*)/edit",
  "/settings(.*)",
]);
const isAuthPage = createRouteMatcher(["/sign-in", "/sign-up"]);

// Also proxies Convex Auth's /api/auth requests, so it must stay mounted
// even if route protection falls back to the client (get-convex/convex-auth#271).
export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isAuthPage(request) && (await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/");
    }
    if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
      const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
      return nextjsMiddlewareRedirect(
        request,
        `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`,
      );
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
  matcher: [
    // Everything except static files and Next internals; /api covers /api/auth.
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
