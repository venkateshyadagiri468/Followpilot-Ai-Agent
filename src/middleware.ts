import { clerkMiddleware } from "@clerk/nextjs/server";

// NOTE: createRouteMatcher is deprecated in Clerk v7 and will be removed.
// We've migrated to resource-based auth checks. Keep clerkMiddleware bare
// to allow Clerk to attach sessions to all matched requests. Auth checks
// should be done at the resource level using auth().protect() in each
// protected page, layout, route handler, or server action.
//
// See: https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};