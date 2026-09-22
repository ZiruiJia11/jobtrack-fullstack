import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (name === "NEXT_PUBLIC_SUPABASE_URL") return value || "https://pexthgxqandoeesqbelb.supabase.co";
  if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
    return (
      value ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleHRoZ3hxYW5kb2Vlc3FiZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjA4MjgsImV4cCI6MjA5NzY5NjgyOH0.lm6SBJ6Ks-R7v2Ad5s5nbSZ6OFQcowCpm73u18izfXg"
    );
  }
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}

export function getSupabaseAuth() {
  if (!authClient) {
    authClient = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
      auth: { persistSession: false },
    });
  }
  return authClient;
}

export function adminEmails() {
  const configured = process.env.JOBTRACK_ADMIN_EMAILS || process.env.JOBTRACK_LOGIN_EMAIL || "steven5115115@gmail.com";
  return configured
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  return Boolean(email && adminEmails().includes(email.toLowerCase()));
}

export async function getUserFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { user: null, error: "Missing auth token" };

  const { data, error } = await getSupabaseAuth().auth.getUser(token);
  if (error || !data.user) return { user: null, error: error?.message || "Invalid auth token" };

  return { user: data.user, isAdmin: isAdminEmail(data.user.email), error: null };
}
