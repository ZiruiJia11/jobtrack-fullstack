import { getSupabaseAdmin } from "./supabase-server";

export async function readAiUsage(userId: string) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const { data, error } = await getSupabaseAdmin().from("ai_daily_usage")
    .select("attempts").eq("user_id", userId).eq("usage_date", date).maybeSingle();
  if (error) throw new Error("AI usage tracking is unavailable. No AI request was sent.");
  return { used: data?.attempts || 0, limit: 2, timezone: "Pacific/Auckland" };
}

export async function consumeAiAttempt(userId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("consume_ai_match_attempt", { p_user_id: userId });
  if (error || !data?.[0]) throw new Error("AI usage tracking is unavailable. No AI request was sent.");
  return data[0] as { allowed: boolean; used: number; daily_limit: number; resets_at: string; reason: string };
}
