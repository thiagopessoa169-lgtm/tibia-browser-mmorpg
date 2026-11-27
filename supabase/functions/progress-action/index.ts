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
const SPAWNS: Record<string, Array<{x:number;y:number;damage:number}>> = {
  "aetheria-village": [
    {x:24*32+16,y:13*32+16,damage:7},
    {x:48*32+16,y:14*32+16,damage:7},
    {x:13*32+16,y:29*32+16,damage:7},
    {x:60*32+16,y:30*32+16,damage:7}
  ],
  "bosque-antigo": [
    {x:22*32+16,y:13*32+16,damage:10},
    {x:49*32+16,y:14*32+16,damage:10},
    {x:17*32+16,y:33*32+16,damage:10},
    {x:58*32+16,y:32*32+16,damage:10}
  ],
  "ruinas-elyndor": [
    {x:25*32+16,y:16*32+16,damage:12},
    {x:47*32+16,y:17*32+16,damage:8},
    {x:25*32+16,y:32*32+16,damage:12},
    {x:47*32+16,y:31*32+16,damage:8}
  ]
};

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
function near(x:number,y:number,target:{x:number;y:number},range:number) {
  return Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x-target.x,y-target.y) <= range;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin && !allowedOrigins.has(origin)) return json({ok:false,message:"Origem não autorizada."},403,origin);
  if (req.method === "OPTIONS") return json({ok:true},200,origin);
  if (req.method !== "POST") return json({ok:false,message:"Método não permitido."},405,origin);
  if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SECRET_KEY) return json({ok:false,message:"Serviço de progressão indisponível."},500,origin);

  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i,"");
  if (!token || token === authorization) return json({ok:false,message:"Entre no jogo para salvar seu progresso."},401,origin);

  const authClient = createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:authData,error:authError} = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ok:false,message:"Sessão inválida. Entre novamente."},401,origin);

  let body:{action?:string;character_id?:string;spawn_index?:number;defeat_x?:number;defeat_y?:number};
  try { body = await req.json(); } catch { return json({ok:false,message:"Solicitação inválida."},400,origin); }

  const characterId = String(body.character_id ?? "");
  if (!UUID_RE.test(characterId)) return json({ok:false,message:"Personagem inválido."},400,origin);

  const admin = createClient(SUPABASE_URL,SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:character,error:characterError} = await admin.from("characters")
    .select("id,user_id,map_id,x,y,hp,max_hp,level,xp")
    .eq("id",characterId).eq("user_id",authData.user.id).maybeSingle();
  if (characterError) return json({ok:false,message:"Não foi possível validar o personagem."},500,origin);
  if (!character) return json({ok:false,message:"Personagem não encontrado."},404,origin);

  const action = String(body.action ?? "");
  if (action === "respawn") {
    const result = await admin.rpc("respawn_character",{p_character_id:characterId});
    if (result.error) return json({ok:false,message:"Não foi possível restaurar o personagem."},500,origin);
    return json(result.data ?? {ok:false,message:"Renascimento não confirmado."},200,origin);
  }

  const mapId = String(character.map_id ?? "");
  if (action === "boss_state") {
    if (mapId !== "ruinas-elyndor") return json({ok:false,message:"O chefe só pode ser localizado nas Ruínas de Elyndor."},403,origin);
    const state = await admin.rpc("elyndor_boss_get_state");
    if (state.error) return json({ok:false,message:"Não foi possível consultar o chefe."},500,origin);
    return json({ok:true,boss:state.data,character:{level:character.level,xp:character.xp,hp:character.hp,max_hp:character.max_hp}},200,origin);
  }
  if (action === "boss_hit") {
    const result = await admin.rpc("elyndor_boss_hit",{p_character_id:characterId});
    if (result.error) return json({ok:false,message:"Não foi possível registrar sua participação no chefe."},500,origin);
    const data = result.data ?? {ok:false,message:"Ação não confirmada."};
    if (data.ok && Number(data.reward_xp) > 0) {
      const refreshed = await admin.from("characters").select("level,xp,hp,max_hp")
        .eq("id",characterId).eq("user_id",authData.user.id).maybeSingle();
      if (refreshed.data) data.character = refreshed.data;
    }
    return json(data,200,origin);
  }
  if (action === "boss_strike") {
    const result = await admin.rpc("elyndor_boss_strike",{p_character_id:characterId});
    if (result.error) return json({ok:false,message:"Não foi possível validar o ataque do chefe."},500,origin);
    return json(result.data ?? {ok:false,message:"Ação não confirmada."},200,origin);
  }
  const spawns = SPAWNS[mapId];
  const spawnIndex = Number(body.spawn_index);
  if (!spawns || !Number.isInteger(spawnIndex) || spawnIndex < 0 || spawnIndex >= spawns.length) {
    return json({ok:false,message:"Região ou monstro inválido."},400,origin);
  }
  if (Number(character.hp) <= 0) return json({ok:false,message:"Personagem derrotado. Retorne ao ponto seguro."},403,origin);
  const spawn = spawns[spawnIndex];

  if (action === "award_monster") {
    const defeatX = Number(body.defeat_x), defeatY = Number(body.defeat_y);
    if (!Number.isFinite(defeatX) || !Number.isFinite(defeatY)) return json({ok:false,message:"Local da vitória inválido."},400,origin);
    if (!near(Number(character.x),Number(character.y),{x:defeatX,y:defeatY},112)) {
      return json({ok:false,message:"Atualize sua posição antes de receber experiência."},409,origin);
    }
    if (!near(defeatX,defeatY,spawn,360)) return json({ok:false,message:"Esse monstro está fora da área de surgimento."},409,origin);
    const result = await admin.rpc("apply_monster_reward",{
      p_character_id:characterId,p_map_id:mapId,p_spawn_index:spawnIndex
    });
    if (result.error) return json({ok:false,message:"Não foi possível confirmar a recompensa."},500,origin);
    return json(result.data ?? {ok:false,message:"Recompensa não confirmada."},200,origin);
  }

  if (action === "monster_damage") {
    if (!near(Number(character.x),Number(character.y),spawn,260)) {
      return json({ok:false,message:"O personagem está fora do alcance desse monstro."},409,origin);
    }
    const result = await admin.rpc("apply_monster_damage",{
      p_character_id:characterId,p_map_id:mapId,p_spawn_index:spawnIndex,p_damage:spawn.damage
    });
    if (result.error) return json({ok:false,message:"Não foi possível registrar o dano."},500,origin);
    return json(result.data ?? {ok:false,message:"Dano não confirmado."},200,origin);
  }

  return json({ok:false,message:"Ação de progressão desconhecida."},400,origin);
});
