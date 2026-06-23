import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

function requiredEnv(name: string) {
  const value = process.env[name];
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

export async function getUserFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { user: null, error: "Missing auth token" };

  const { data, error } = await getSupabaseAuth().auth.getUser(token);
  if (error || !data.user) return { user: null, error: error?.message || "Invalid auth token" };

  const allowedEmail = process.env.JOBTRACK_LOGIN_EMAIL || "steven5115115@gmail.com";
  if ((data.user.email || "").toLowerCase() !== allowedEmail.toLowerCase()) {
    return { user: null, error: "This account is not allowed for JobTrack." };
  }

  return { user: data.user, error: null };
}
