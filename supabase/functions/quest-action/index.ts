import { createClient } from "npm:@supabase/supabase-js@2.119.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const PUBLISHABLE_KEY = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SECRET_KEY = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = new Set(["https://tibia-browser-mmorpg.vercel.app","http://localhost:8000","http://127.0.0.1:8000"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUESTS = {
  slime_hunt: { target: 3, xp: 40, item: "slime_essence", quantity: 1 },
  herb_gathering: { target: 3, xp: 30, item: "medicinal_herb", quantity: 2 },
  rune_research: { target: 3, xp: 90, item: "medicinal_herb", quantity: 2 },
  ruins_clearance: { target: 3, xp: 120, item: "slime_essence", quantity: 2 }
};
const HERB_NODES: Record<string,{x:number;y:number}> = {
  herb_01:{x:27*32+16,y:19*32+16},
  herb_02:{x:45*32+16,y:20*32+16},
  herb_03:{x:25*32+16,y:32*32+16}
};
const RUNE_NODES: Record<string,{x:number;y:number}> = {
  rune_01:{x:27*32+16,y:17*32+16},
  rune_02:{x:45*32+16,y:31*32+16},
  rune_03:{x:34*32+16,y:12*32+16}
};
const RUINS_SPAWNS = [
  {x:25*32+16,y:16*32+16},
  {x:47*32+16,y:17*32+16},
  {x:25*32+16,y:32*32+16},
  {x:47*32+16,y:31*32+16}
];
const SLIME_SPAWNS = [
  {x:24*32+16,y:13*32+16},
  {x:48*32+16,y:14*32+16},
  {x:13*32+16,y:29*32+16},
  {x:60*32+16,y:30*32+16}
];
function json(data:unknown,status=200,origin=""){
  return new Response(JSON.stringify(data),{status,headers:{
    "Content-Type":"application/json","Access-Control-Allow-Origin":origin,
    "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"
  }});
}
function near(x:number,y:number,target:{x:number;y:number},range:number){
  return Number.isFinite(x)&&Number.isFinite(y)&&Math.hypot(x-target.x,y-target.y)<=range;
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin")??"";
  if(origin&&!allowedOrigins.has(origin))return json({ok:false,message:"Origem não autorizada."},403);
  if(req.method==="OPTIONS")return json({ok:true},200,origin);
  if(req.method!=="POST")return json({ok:false,message:"Método não permitido."},405,origin);
  if(!SUPABASE_URL||!PUBLISHABLE_KEY||!SECRET_KEY)return json({ok:false,message:"Serviço de missões indisponível."},500,origin);
  const authorization=req.headers.get("authorization")??"";
  const token=authorization.replace(/^Bearer\s+/i,"");
  if(!token||token===authorization)return json({ok:false,message:"Entre no jogo para usar as missões."},401,origin);
  const authClient=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:authData,error:authError}=await authClient.auth.getUser(token);
  if(authError||!authData.user)return json({ok:false,message:"Sessão inválida. Entre novamente."},401,origin);
  const admin=createClient(SUPABASE_URL,SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  let body:{action?:string;character_id?:string;quest_key?:string;node_key?:string;spawn_index?:number;defeat_x?:number;defeat_y?:number};
  try{body=await req.json();}catch{return json({ok:false,message:"Solicitação inválida."},400,origin);}
  const characterId=String(body.character_id??"");
  if(!UUID_RE.test(characterId))return json({ok:false,message:"Personagem inválido."},400,origin);
  const {data:character,error:characterError}=await admin.from("characters")
    .select("id,user_id,x,y,hp,map_id,level,xp,max_hp")
    .eq("id",characterId).eq("user_id",authData.user.id).maybeSingle();
  if(characterError)return json({ok:false,message:"Não foi possível validar o personagem."},500,origin);
  if(!character||Number(character.hp)<=0)
    return json({ok:false,message:"Personagem indisponível para esta ação."},403,origin);
  const action=String(body.action??"");
  if(action==="list"){
    if(!["aetheria-village","bosque-antigo","ruinas-elyndor"].includes(character.map_id))
      return json({ok:false,message:"Região indisponível."},403,origin);
  }else if(["accept","collect_rune","record_ruins_defeat"].includes(action)){
    const key=String(body.quest_key??"");
    if(action==="accept"){
      const requiredMap=key==="rune_research"||key==="ruins_clearance"?"ruinas-elyndor":"aetheria-village";
      if(character.map_id!==requiredMap)
        return json({ok:false,message:"Esta missão só pode ser iniciada na região correspondente."},403,origin);
    }else if(character.map_id!=="ruinas-elyndor"){
      return json({ok:false,message:"Esta ação só está disponível nas Ruínas de Elyndor."},403,origin);
    }
  }else if(character.map_id!=="aetheria-village"){
    return json({ok:false,message:"Esta ação só está disponível na Vila de Aetheria."},403,origin);
  }
  if(action==="list"){
    const [quests,items,events,runes]=await Promise.all([
      admin.from("character_quests").select("quest_key,status,progress,target,accepted_at,completed_at").eq("character_id",characterId),
      admin.from("character_inventory").select("item_key,quantity").eq("character_id",characterId).in("item_key",["medicinal_herb","slime_essence"]),
      admin.from("quest_event_log").select("event_key").eq("character_id",characterId).like("event_key","herb:%"),
      admin.from("quest_event_log").select("event_key").eq("character_id",characterId).like("event_key","rune:%")
    ]);
    if(quests.error||items.error||events.error||runes.error)return json({ok:false,message:"Não foi possível carregar o diário."},500,origin);
    return json({ok:true,quests:quests.data??[],items:items.data??[],collected_nodes:(events.data??[]).map((e:any)=>e.event_key.slice(5)),collected_runes:(runes.data??[]).map((e:any)=>e.event_key.slice(5))},200,origin);
  }
  if(action==="accept"){
    const key=String(body.quest_key??"");
    const def=QUESTS[key as keyof typeof QUESTS];
    if(!def)return json({ok:false,message:"Missão desconhecida."},400,origin);
    const {error}=await admin.from("character_quests").insert({
      character_id:characterId,quest_key:key,target:def.target,progress:0,status:"active"
    });
    if(error&&error.code!=="23505")return json({ok:false,message:"Não foi possível aceitar a missão."},500,origin);
    const {data:quest, error:readError}=await admin.from("character_quests")
      .select("quest_key,status,progress,target").eq("character_id",characterId).eq("quest_key",key).single();
    if(readError)return json({ok:false,message:"Não foi possível consultar a missão."},500,origin);
    return json({ok:true,quest,already_accepted:!!error},200,origin);
  }
  if(action==="collect_herb"){
    const nodeKey=String(body.node_key??"");
    const node=HERB_NODES[nodeKey];
    if(!node)return json({ok:false,message:"Ponto de coleta inválido."},400,origin);
    if(!near(Number(character.x),Number(character.y),node,76))
      return json({ok:false,message:"Chegue mais perto da erva para coletá-la."},409,origin);
    const result=await admin.rpc("apply_quest_event",{
      p_character_id:characterId,p_quest_key:"herb_gathering",p_event_key:"herb:"+nodeKey,
      p_target:3,p_reward_xp:30,p_reward_item_key:"medicinal_herb",p_reward_item_qty:2
    });
    if(result.error)return json({ok:false,message:"Não foi possível registrar a coleta."},500,origin);
    return json({...result.data,action:"collect_herb"},200,origin);
  }
  if(action==="collect_rune"){
    const nodeKey=String(body.node_key??"");
    const node=RUNE_NODES[nodeKey];
    if(!node)return json({ok:false,message:"Fragmento rúnico inválido."},400,origin);
    if(!near(Number(character.x),Number(character.y),node,76))
      return json({ok:false,message:"Aproxime-se do fragmento para investigá-lo."},409,origin);
    const result=await admin.rpc("apply_quest_event",{
      p_character_id:characterId,p_quest_key:"rune_research",p_event_key:"rune:"+nodeKey,
      p_target:3,p_reward_xp:90,p_reward_item_key:"medicinal_herb",p_reward_item_qty:2
    });
    if(result.error)return json({ok:false,message:"Não foi possível registrar o fragmento."},500,origin);
    return json({...result.data,action:"collect_rune"},200,origin);
  }
  if(action==="record_ruins_defeat"){
    const spawnIndex=Number(body.spawn_index);
    if(!Number.isInteger(spawnIndex)||spawnIndex<0||spawnIndex>=RUINS_SPAWNS.length)
      return json({ok:false,message:"Criatura inválida."},400,origin);
    const defeatX=Number(body.defeat_x),defeatY=Number(body.defeat_y);
    if(!Number.isFinite(defeatX)||!Number.isFinite(defeatY))
      return json({ok:false,message:"Local da vitória inválido."},400,origin);
    if(!near(Number(character.x),Number(character.y),{x:defeatX,y:defeatY},112))
      return json({ok:false,message:"A posição do personagem ainda não foi sincronizada."},409,origin);
    if(!near(defeatX,defeatY,RUINS_SPAWNS[spawnIndex],360))
      return json({ok:false,message:"A criatura está fora da área de surgimento."},409,origin);
    const {data:activeQuest,error:questError}=await admin.from("character_quests")
      .select("quest_key").eq("character_id",characterId).eq("quest_key","ruins_clearance").eq("status","active").maybeSingle();
    if(questError)return json({ok:false,message:"Não foi possível validar a missão."},500,origin);
    if(!activeQuest)return json({ok:true,tracked:false,message:"Nenhuma missão de combate ativa."},200,origin);
    const now=new Date().toISOString();
    const cutoff=new Date(Date.now()-7000).toISOString();
    const seed=await admin.from("ruins_quest_cooldowns").upsert({
      character_id:characterId,spawn_index:spawnIndex,last_defeated_at:"1970-01-01T00:00:00.000Z"
    },{onConflict:"character_id,spawn_index",ignoreDuplicates:true});
    if(seed.error)return json({ok:false,message:"Não foi possível validar o surgimento."},500,origin);
    const cooldown=await admin.from("ruins_quest_cooldowns").update({last_defeated_at:now})
      .eq("character_id",characterId).eq("spawn_index",spawnIndex).lte("last_defeated_at",cutoff)
      .select("spawn_index").maybeSingle();
    if(cooldown.error)return json({ok:false,message:"Não foi possível validar o intervalo."},500,origin);
    if(!cooldown.data)return json({ok:false,message:"Aguarde o próximo surgimento dessa criatura."},429,origin);
    const result=await admin.rpc("apply_quest_event",{
      p_character_id:characterId,p_quest_key:"ruins_clearance",
      p_event_key:"ruins-monster:"+spawnIndex+":"+now,
      p_target:3,p_reward_xp:120,p_reward_item_key:"slime_essence",p_reward_item_qty:2
    });
    if(result.error)return json({ok:false,message:"Não foi possível registrar a vitória."},500,origin);
    return json({...result.data,action:"record_ruins_defeat"},200,origin);
  }
  if(action==="record_slime_defeat"){
    const spawnIndex=Number(body.spawn_index);
    if(!Number.isInteger(spawnIndex)||spawnIndex<0||spawnIndex>=SLIME_SPAWNS.length)
      return json({ok:false,message:"Monstro inválido."},400,origin);
    const defeatX=Number(body.defeat_x),defeatY=Number(body.defeat_y);
    if(!Number.isFinite(defeatX)||!Number.isFinite(defeatY))
      return json({ok:false,message:"Local da vitória inválido."},400,origin);
    if(!near(Number(character.x),Number(character.y),{x:defeatX,y:defeatY},112))
      return json({ok:false,message:"A posição do personagem ainda não foi sincronizada."},409,origin);
    if(!near(defeatX,defeatY,SLIME_SPAWNS[spawnIndex],360))
      return json({ok:false,message:"Este monstro está fora da área de surgimento."},409,origin);
    const {data:activeQuest,error:questError}=await admin.from("character_quests")
      .select("quest_key").eq("character_id",characterId).eq("quest_key","slime_hunt").eq("status","active").maybeSingle();
    if(questError)return json({ok:false,message:"Não foi possível validar a missão."},500,origin);
    if(!activeQuest)return json({ok:false,tracked:false,message:"Nenhuma missão de caça ativa."},200,origin);
    const now=new Date().toISOString();
    const cutoff=new Date(Date.now()-7000).toISOString();
    const seed=await admin.from("quest_monster_cooldowns").upsert({
      character_id:characterId,spawn_index:spawnIndex,last_defeated_at:"1970-01-01T00:00:00.000Z"
    },{onConflict:"character_id,spawn_index",ignoreDuplicates:true});
    if(seed.error)return json({ok:false,message:"Não foi possível validar o surgimento."},500,origin);
    const cooldown=await admin.from("quest_monster_cooldowns").update({last_defeated_at:now})
      .eq("character_id",characterId).eq("spawn_index",spawnIndex).lte("last_defeated_at",cutoff)
      .select("spawn_index").maybeSingle();
    if(cooldown.error)return json({ok:false,message:"Não foi possível validar o intervalo."},500,origin);
    if(!cooldown.data)return json({ok:false,message:"Aguarde o próximo surgimento desse monstro."},429,origin);
    const result=await admin.rpc("apply_quest_event",{
      p_character_id:characterId,p_quest_key:"slime_hunt",
      p_event_key:"slime:"+spawnIndex+":"+now,
      p_target:3,p_reward_xp:40,p_reward_item_key:"slime_essence",p_reward_item_qty:1
    });
    if(result.error)return json({ok:false,message:"Não foi possível registrar a vitória."},500,origin);
    return json({...result.data,action:"record_slime_defeat"},200,origin);
  }
  return json({ok:false,message:"Ação de missão desconhecida."},400,origin);
});
