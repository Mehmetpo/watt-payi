import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Yetkisiz istek." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Identify the caller from their own token first — never trust a
  // user-supplied id, always delete the account the JWT actually belongs to.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return new Response(JSON.stringify({ error: "Kullanıcı doğrulanamadı." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Clean up owned storage objects first: once the auth.users row is gone,
  // auth.uid() for this user's path prefix is gone too, so no RLS policy
  // could ever reach these objects again to remove them later.
  const userId = callerData.user.id;
  const { data: ownedFiles } = await adminClient.storage.from("bill-photos").list(userId);
  if (ownedFiles && ownedFiles.length > 0) {
    await adminClient.storage.from("bill-photos").remove(ownedFiles.map((f) => `${userId}/${f.name}`));
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(callerData.user.id);
  if (deleteError) {
    console.error('delete-account: admin.deleteUser failed', deleteError);
    return new Response(JSON.stringify({ error: 'delete_failed' }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
