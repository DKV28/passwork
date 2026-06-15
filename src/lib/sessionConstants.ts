/** Shared constant with no Node-only dependencies, so it is safe to import from
 * the Edge middleware (importing session.ts there would pull in node:crypto). */
export const SESSION_COOKIE_NAME = "passwork_session";
