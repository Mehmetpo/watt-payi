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
