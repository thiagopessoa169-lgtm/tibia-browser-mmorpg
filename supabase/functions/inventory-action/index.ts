import { createClient } from "npm:@supabase/supabase-js@2.119.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const PUBLISHABLE_KEY = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SECRET_KEY = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = new Set([
  "https://tibia-browser-mmorpg.vercel.app",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin"
    }
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin && !allowedOrigins.has(origin)) {
    return json({ ok: false, message: "Origem não autorizada." }, 403, origin);
  }
  if (req.method === "OPTIONS") return json({ ok: true }, 200, origin);
  if (req.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405, origin);
  if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SECRET_KEY) {
    return json({ ok: false, message: "Serviço de inventário indisponível." }, 500, origin);
  }

  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) {
    return json({ ok: false, message: "Entre no jogo para acessar a bolsa." }, 401, origin);
  }

  const authClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ ok: false, message: "Sessão inválida. Entre novamente." }, 401, origin);
  }

  let body: { action?: string; character_id?: string; item_key?: string; slot?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Solicitação inválida." }, 400, origin);
  }

  const characterId = String(body.character_id ?? "");
  if (!UUID_RE.test(characterId)) {
    return json({ ok: false, message: "Personagem inválido." }, 400, origin);
  }

  const admin = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: character, error: characterError } = await admin.from("characters")
    .select("id,user_id,hp,max_hp,map_id")
    .eq("id", characterId)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (characterError) return json({ ok: false, message: "Não foi possível validar o personagem." }, 500, origin);
  if (!character || character.map_id !== "aetheria-village" || Number(character.hp) <= 0) {
    return json({ ok: false, message: "Personagem indisponível para esta ação." }, 403, origin);
  }

  const action = String(body.action ?? "");
  const itemKey = body.item_key ? String(body.item_key) : null;
  const slot = body.slot ? String(body.slot) : null;
  if (!["list", "use", "equip", "unequip"].includes(action)) {
    return json({ ok: false, message: "Ação de inventário desconhecida." }, 400, origin);
  }
  if (itemKey && !["medicinal_herb", "slime_essence", "traveler_tunic", "trail_boots", "copper_charm"].includes(itemKey)) {
    return json({ ok: false, message: "Item inválido." }, 400, origin);
  }
  if (slot && !["body", "feet", "amulet"].includes(slot)) {
    return json({ ok: false, message: "Espaço de equipamento inválido." }, 400, origin);
  }

  if (action === "list") {
    const initialized = await admin.rpc("apply_inventory_action", {
      p_character_id: characterId,
      p_action: "initialize",
      p_item_key: null,
      p_slot: null
    });
    if (initialized.error) {
      return json({ ok: false, message: "Não foi possível preparar a bolsa." }, 500, origin);
    }
  } else {
    const result = await admin.rpc("apply_inventory_action", {
      p_character_id: characterId,
      p_action: action,
      p_item_key: itemKey,
      p_slot: slot
    });
    if (result.error) {
      console.error("[inventory-action] RPC failed:", result.error.message);
      return json({ ok: false, message: "Não foi possível atualizar o inventário." }, 500, origin);
    }
    if (!result.data?.ok) {
      return json(result.data ?? { ok: false, message: "Ação não confirmada." }, 409, origin);
    }
  }

  const [inventory, equipment, updatedCharacter] = await Promise.all([
    admin.from("character_inventory").select("item_key,quantity,updated_at")
      .eq("character_id", characterId).order("item_key"),
    admin.from("character_equipment").select("slot,item_key,updated_at")
      .eq("character_id", characterId),
    admin.from("characters").select("hp,max_hp,level,xp")
      .eq("id", characterId).single()
  ]);
  if (inventory.error || equipment.error || updatedCharacter.error) {
    return json({ ok: false, message: "Não foi possível carregar os dados atualizados da bolsa." }, 500, origin);
  }

  return json({
    ok: true,
    action,
    inventory: inventory.data ?? [],
    equipment: equipment.data ?? [],
    character: updatedCharacter.data
  }, 200, origin);
});
