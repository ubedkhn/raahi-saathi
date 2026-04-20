import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Map raw Supabase / network errors to short, user-friendly messages.
 * Avoids leaking internal details (column names, codes, schemas).
 */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = (error as any)?.message || (typeof error === "string" ? error : "");
  const msg = String(raw).toLowerCase();

  if (!msg) return fallback;
  if (msg.includes("invalid login")) return "Incorrect email or password.";
  if (msg.includes("email not confirmed")) return "Please confirm your email first.";
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already"))
    return "This email is already in use.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("network") || msg.includes("fetch")) return "Network issue. Check your connection.";
  if (msg.includes("permission") || msg.includes("rls") || msg.includes("policy"))
    return "You don't have permission to do that.";
  if (msg.includes("not found")) return "We couldn't find that. Please try again.";
  if (msg.includes("invalid") && msg.includes("token")) return "Your session expired. Please sign in again.";
  return fallback;
}
