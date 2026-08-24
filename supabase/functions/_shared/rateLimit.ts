import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * Atomically increments today's call counter for (userId, functionName) via
 * the `increment_function_usage` Postgres function (see
 * supabase/migrations/0003_function_rate_limit.sql) and reports whether the
 * call should be allowed.
 *
 * `adminClient` must be a service-role client — the counter table has RLS
 * enabled with no policies, so it's only reachable with that key.
 *
 * Returns true if the call is allowed, false if the daily limit is exceeded.
 */
export async function checkRateLimit(
  adminClient: SupabaseClient,
  userId: string,
  functionName: string,
  dailyLimit: number,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc('increment_function_usage', {
    p_user_id: userId,
    p_function_name: functionName,
  });

  if (error) {
    // Fail open on infra errors so a rate-limit outage doesn't take down the
    // feature entirely — the counter table itself has no user-facing risk.
    console.error('rate limit check failed', functionName, error);
    return true;
  }

  const callCount = data as number;
  return callCount <= dailyLimit;
}

/**
 * Extracts the caller's IP from the standard proxy header Supabase's gateway
 * sets. Falls back to a fixed key if absent so those requests share one
 * bucket instead of bypassing the limit entirely.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

/**
 * Same as checkRateLimit but keyed by IP instead of user id, via
 * `increment_ip_usage` (see supabase/migrations/0004_ip_rate_limit.sql).
 * A second, coarser layer so one IP can't bypass the per-user cap by
 * creating many accounts. Limit is intentionally higher than the per-user
 * one to avoid punishing legitimate shared IPs (NAT/household wifi).
 */
export async function checkIpRateLimit(
  adminClient: SupabaseClient,
  ipAddress: string,
  functionName: string,
  dailyLimit: number,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc('increment_ip_usage', {
    p_ip_address: ipAddress,
    p_function_name: functionName,
  });

  if (error) {
    console.error('ip rate limit check failed', functionName, error);
    return true;
  }

  const callCount = data as number;
  return callCount <= dailyLimit;
}
