(() => {
  "use strict";

  const config = window.AETHERIA_SUPABASE_CONFIG || {};
  const state = {
    client: null,
    user: null,
    character: null,
    channel: null,
    progressChannel: null,
    connected: false,
    lastBroadcastAt: 0,
    lastPersistAt: 0,
    lastX: null,
    lastY: null,
    mapId: "aetheria-village",
    mode: "login",
    questData: null,
    inventoryData: null
  };

  const $ = (id) => document.getElementById(id);
  const authPanel = $("auth-panel");
  const characterPanel = $("character-panel");
  const authMessage = $("auth-message");
  const accountBar = $("account-bar");
  const statusLabel = $("backend-status");

  function message(element, text, type = "info") {
    if (!element) return;
    element.textContent = text;
    element.dataset.type = type;
  }

  function configured() {
    return Boolean(config.url && config.publishableKey);
  }

  function setMode(mode) {
    state.mode = mode;
    const register = mode === "register";
    $("auth-submit").textContent = register ? "Criar conta" : "Entrar";
    $("auth-name-wrap").hidden = !register;
    $("auth-mode-toggle").textContent = register
      ? "Já tenho uma conta — entrar"
      : "Criar uma conta";
    message(authMessage, register
      ? "Use um e-mail válido e uma senha com pelo menos 6 caracteres."
      : "Entre para carregar seu personagem e acessar o mundo online.");
  }

  function showAuth() {
    if (authPanel) authPanel.hidden = false;
    if (characterPanel) characterPanel.hidden = true;
    if (accountBar) accountBar.hidden = true;
  }

  function showCharacters() {
    if (authPanel) authPanel.hidden = true;
    if (characterPanel) characterPanel.hidden = false;
    if (accountBar) accountBar.hidden = false;
    $("account-label").textContent = state.user?.email || "Conta conectada";
  }

  function cleanName(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16);
  }

  async function authenticate(event) {
    event.preventDefault();
    if (!state.client) return;
    const email = $("auth-email").value.trim();
    const password = $("auth-password").value;
    const name = cleanName($("auth-name").value);
    const submit = $("auth-submit");
    submit.disabled = true;

    try {
      if (state.mode === "register") {
        if (name.length < 3) throw new Error("O nome do aventureiro precisa ter de 3 a 16 caracteres.");
        if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        const { data, error } = await state.client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
            // Sempre retornar ao endereço público do jogo após confirmar o e-mail.
            emailRedirectTo: "https://tibia-browser-mmorpg.vercel.app"
          }
        });
        if (error) throw error;
        if (!data.session) {
          message(authMessage, "Conta criada! Confira seu e-mail para confirmar o cadastro e depois entre.", "success");
        } else {
          state.user = data.user;
          await loadCharacters();
        }
      } else {
        const { data, error } = await state.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.user = data.user;
        await loadCharacters();
      }
    } catch (error) {
      message(authMessage, error.message || "Não foi possível autenticar.", "error");
    } finally {
      submit.disabled = false;
    }
  }

  async function loadCharacters() {
    if (!state.user) return;
    const list = $("character-list");
    list.replaceChildren();
    const { data, error } = await state.client
      .from("characters")
      .select("id,name,level,hp,max_hp,xp,x,y,map_id")
      .order("created_at", { ascending: true });
    if (error) {
      message($("character-message"), "Erro ao carregar personagens: " + error.message, "error");
      showCharacters();
      return;
    }

    if (!data.length) {
      message($("character-message"), "Você ainda não tem personagem. Crie seu primeiro aventureiro.");
    } else {
      message($("character-message"), "Escolha um personagem para entrar no mundo.");
      data.forEach((character) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "character-choice";
        const title = document.createElement("strong");
        title.textContent = character.name;
        const detail = document.createElement("span");
        detail.textContent = "Nível " + character.level + " · " + character.hp + "/" + character.max_hp + " HP · " + (character.xp || 0) + " XP";
        button.append(title, detail);
        button.addEventListener("click", () => selectCharacter(character));
        list.append(button);
      });
    }
    showCharacters();
  }

  async function createCharacter(event) {
    event.preventDefault();
    if (!state.user) return;
    const name = cleanName($("character-name").value);
    if (name.length < 3) {
      message($("character-message"), "Use de 3 a 16 caracteres: letras, números ou _.", "error");
      return;
    }
    const button = $("create-character-submit");
    button.disabled = true;
    // O banco preenche level, HP, posição e mapa pelos valores padrão.
    const { data, error } = await state.client.from("characters").insert({
      user_id: state.user.id,
      name
    }).select("id,name,level,hp,max_hp,xp,x,y,map_id").single();
    button.disabled = false;
    if (error) {
      message($("character-message"), error.code === "23505"
        ? "Esse nome já está em uso. Escolha outro."
        : "Não foi possível criar: " + error.message, "error");
      return;
    }
    await selectCharacter(data);
  }

  async function selectCharacter(character) {
    const level = Math.max(1, Math.floor(Number(character.level) || 1));
    const maxHp = Math.max(1, Math.floor(Number(character.max_hp) || 100));
    const hp = Math.min(maxHp, Math.max(0, Math.floor(Number(character.hp) || 0)));
    const xp = Math.min(level * 100 - 1, Math.max(0, Math.floor(Number(character.xp) || 0)));
    state.character = { ...character, level, hp, max_hp: maxHp, xp };
    state.mapId = ["bosque-antigo","ruinas-elyndor"].includes(character.map_id) ? character.map_id : "aetheria-village";

    if (hp <= 0) {
      const restored = await respawnCharacter();
      if (!restored?.ok) {
        message($("character-message"), restored?.message || "Não foi possível restaurar o personagem.", "error");
        return;
      }
      const moved = await changeMap("aetheria-village", 36 * 32 + 16, 24 * 32 + 16);
      if (!moved?.ok) {
        message($("character-message"), moved?.message || "Não foi possível retornar à vila.", "error");
        return;
      }
    }

    const current = state.character;
    const currentLevel = Math.max(1, Number(current.level) || 1);
    const currentMaxHp = Math.max(1, Number(current.max_hp) || 100);
    const currentHp = Math.min(currentMaxHp, Math.max(0, Number(current.hp) || 0));
    const currentXp = Math.min(currentLevel * 100 - 1, Math.max(0, Number(current.xp) || 0));
    const x = Number(current.x) || 36 * 32 + 16;
    const y = Number(current.y) || 24 * 32 + 16;

    state.character = { ...current, level: currentLevel, hp: currentHp, max_hp: currentMaxHp, xp: currentXp, x, y };
    showCharacters();
    $("character-panel").hidden = true;
    $("account-bar").hidden = false;
    $("account-label").textContent = current.name + " · " + state.user.email;
    state.lastX = x;
    state.lastY = y;
    state.lastPersistAt = 0;
    state.lastBroadcastAt = 0;
    state.mapId = ["bosque-antigo","ruinas-elyndor"].includes(current.map_id) ? current.map_id : "aetheria-village";
    window.AetheriaWorld?.loadMap?.(state.mapId, x, y, { level: currentLevel, hp: currentHp, max_hp: currentMaxHp, xp: currentXp });
    window.AetheriaWorld?.loadProgress?.({ level: currentLevel, hp: currentHp, max_hp: currentMaxHp, xp: currentXp });
    $("player-name").textContent = current.name;
    $("player-level").textContent = "Nível " + currentLevel + " · Aventureiro";
    await connectWorld();
    await loadQuests();
  }

  async function connectWorld() {
    if (!state.client || !state.user || !state.character) return;
    if (state.channel) await state.client.removeChannel(state.channel);
    if (state.progressChannel) await state.client.removeChannel(state.progressChannel);
    const topic = "aetheria:world";
    const channel = state.client.channel(topic, {
      config: {
        private: true,
        presence: { key: state.user.id },
        broadcast: { self: false, ack: true }
      }
    });

    channel
      .on("presence", { event: "sync" }, () => syncPresence(channel))
      .on("presence", { event: "join" }, () => syncPresence(channel))
      .on("presence", { event: "leave" }, () => syncPresence(channel))
      .on("broadcast", { event: "position" }, ({ payload }) => {
        if (!payload || payload.user_id === state.user.id) return;
        window.AetheriaWorld?.updateRemotePlayer?.(payload);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          state.connected = true;
          if (statusLabel) statusLabel.textContent = "Mundo online";
          await channel.track({
            user_id: state.user.id,
            character_id: state.character.id,
            name: state.character.name,
            x: state.character.x,
            y: state.character.y,
            map_id: state.character.map_id
          });
          syncPresence(channel);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          state.connected = false;
          console.error("[Aetheria] Falha no canal multiplayer:", status);
          if (statusLabel) statusLabel.textContent = "Reconectando...";
        } else {
          console.info("[Aetheria] Status do canal multiplayer:", status);
        }
      });
    state.channel = channel;

    // Canal público separado para mudanças Postgres do próprio personagem.
    // A política RLS da tabela continua limitando a leitura ao dono da linha.
    const progressChannel = state.client.channel("aetheria:character:" + state.character.id)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "characters",
        filter: "id=eq." + state.character.id
      }, ({ new: row }) => {
        if (!row || row.id !== state.character?.id) return;
        const hp = Number(row.hp);
        if (Number.isFinite(hp)) {
          window.AetheriaWorld?.applyServerHp?.(hp);
          state.character = { ...state.character, hp };
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[Aetheria] Falha ao receber atualização de HP:", status);
        }
      });
    state.progressChannel = progressChannel;
  }

  function syncPresence(channel) {
    const presence = channel.presenceState();
    const players = [];
    Object.values(presence).forEach((entries) => {
      (entries || []).forEach((entry) => {
        if (entry.user_id !== state.user?.id && entry.map_id === state.character?.map_id) {
          players.push(entry);
        }
      });
    });
    window.AetheriaWorld?.syncRemotePlayers?.(players);
    $("online-count").textContent = String(players.length + 1);
  }

  async function persistPosition(position) {
    if (!state.client || !state.user || !state.character || !position) return false;
    const x = Math.round(Number(position.x));
    const y = Math.round(Number(position.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const mapId=["aetheria-village","bosque-antigo","ruinas-elyndor"].includes(state.character.map_id)?state.character.map_id:"aetheria-village";
    const { error } = await state.client.from("characters").update({x,y,map_id:mapId,updated_at:new Date().toISOString()}).eq("id",state.character.id).eq("user_id",state.user.id);
    if (error) {
      console.warn("Falha ao salvar posição:", error.message);
      return false;
    }
    state.character = { ...state.character, x, y };
    state.lastPersistAt = Date.now();
    return true;
  }

  async function invokeProgressAction(action, extra = {}) {
    if (!state.client || !state.user || !state.character) {
      return { ok: false, message: "Entre no jogo para salvar seu progresso." };
    }
    const { data, error } = await state.client.functions.invoke("progress-action", {
      body: { action, character_id: state.character.id, ...extra }
    });
    if (error) {
      console.warn("[Aetheria] Falha na progressão do servidor:", error.message);
      return { ok: false, message: error.message || "Não foi possível atualizar o progresso." };
    }
    if (data?.character) state.character = { ...state.character, ...data.character };
    return data || { ok: false, message: "O servidor não confirmou a ação." };
  }

  async function awardMonsterDefeat(spawnIndex, defeatPosition) {
    const position = currentPosition();
    if (!position || !(await persistPosition(position))) {
      return { ok: false, message: "Não foi possível atualizar sua posição. Tente novamente." };
    }
    const result = await invokeProgressAction("award_monster", {
      spawn_index: spawnIndex,
      defeat_x: Number(defeatPosition?.x),
      defeat_y: Number(defeatPosition?.y)
    });
    if (result?.ok && result.character) window.AetheriaWorld?.loadProgress?.(result.character);
    return result;
  }

  async function applyMonsterDamage(spawnIndex) {
    const position = currentPosition();
    if (!position || !(await persistPosition(position))) return { ok: false, message: "Não foi possível validar sua posição." };
    const result = await invokeProgressAction("monster_damage", { spawn_index: spawnIndex });
    if (result?.ok && result.character) window.AetheriaWorld?.applyServerHp?.(result.character.hp);
    return result;
  }

  async function respawnCharacter() {
    const result = await invokeProgressAction("respawn");
    if (result?.ok && result.character) window.AetheriaWorld?.loadProgress?.(result.character);
    return result;
  }

  async function getRegionalBossState() {
    const result=await invokeProgressAction("boss_state");
    if(result?.ok&&result.character)window.AetheriaWorld?.loadProgress?.(result.character);
    return result;
  }

  async function hitRegionalBoss() {
    const position=currentPosition();
    if(!position || !(await persistPosition(position))) return {ok:false,message:"Não foi possível validar sua posição."};
    const result=await invokeProgressAction("boss_hit");
    if(result?.ok && result.character) window.AetheriaWorld?.loadProgress?.(result.character);
    if(result?.ok && Number(result.reward_item_qty)>0) await loadInventory();
    return result;
  }

  async function receiveRegionalBossStrike() {
    const position=currentPosition();
    if(!position || !(await persistPosition(position))) return {ok:false,message:"Não foi possível validar sua posição."};
    const result=await invokeProgressAction("boss_strike");
    if(result?.ok && result.character) window.AetheriaWorld?.applyServerHp?.(result.character.hp);
    return result;
  }

  function currentPosition() {
    return window.AetheriaWorld?.getLocalPosition?.() ||
      (state.lastX !== null && state.lastY !== null
        ? { x: state.lastX, y: state.lastY } : null);
  }

  async function saveCurrentPosition() {
    const position = currentPosition();
    if (!position || !state.character) return false;
    return persistPosition(position);
  }

  async function sendPosition(position) {
    if (!state.character || !state.channel || !state.connected || !position) return;
    const now = Date.now();
    const x = Number(position.x), y = Number(position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const moved = state.lastX === null || Math.abs(x - state.lastX) + Math.abs(y - state.lastY) >= 1;
    if (!moved || now - state.lastBroadcastAt < 100) return;
    state.lastBroadcastAt = now;
    state.lastX = x;
    state.lastY = y;
    const payload = { user_id: state.user.id, character_id: state.character.id, name: state.character.name, x: Math.round(x), y: Math.round(y), map_id: state.character.map_id || state.mapId, sent_at: now };
    try {
      const result = await state.channel.send({ type: "broadcast", event: "position", payload });
      if (result !== "ok" && result?.status !== "ok") console.warn("[Aetheria] Broadcast de posição não confirmado:", result);
    } catch (error) { console.warn("[Aetheria] Erro ao transmitir posição:", error); }
    const inArena = x >= 31 * 32 + 16 && x <= 42 * 32 + 16
      && y >= 35 * 32 + 16 && y <= 43 * 32 + 16;
    const persistInterval = inArena ? 300 : 1000;
    if (now - state.lastPersistAt >= persistInterval) {
      state.lastPersistAt = now;
      persistPosition(payload).catch((error) => console.warn("[Aetheria] Erro ao salvar posição:", error));
    }
  }

  async function changeMap(mapId,x,y){
    if(!state.client||!state.character||!state.user)return {ok:false,message:"Entre no jogo para viajar."};const destination=["aetheria-village","bosque-antigo","ruinas-elyndor"].includes(mapId)?mapId:null;const px=Math.round(Number(x)),py=Math.round(Number(y));if(!destination||!Number.isFinite(px)||!Number.isFinite(py)||px<16||px>2288||py<16||py>1520)return {ok:false,message:"Destino inválido."};
    const {data,error}=await state.client.from("characters").update({map_id:destination,x:px,y:py,updated_at:new Date().toISOString()}).eq("id",state.character.id).eq("user_id",state.user.id).select("id,map_id,x,y").maybeSingle();if(error||!data)return {ok:false,message:"Não foi possível salvar a região: "+(error?.message||"personagem não encontrado.")};state.character={...state.character,map_id:destination,x:px,y:py};state.mapId=destination;state.lastX=px;state.lastY=py;state.lastPersistAt=Date.now();if(state.channel)await state.channel.track({user_id:state.user.id,character_id:state.character.id,name:state.character.name,x:px,y:py,map_id:destination});await loadQuests();return {ok:true,map_id:destination};
  }

  async function attackPlayer(targetCharacterId) {
    if (!state.client || !state.character || !state.user) {
      return { ok: false, message: "Entre no jogo para participar da arena." };
    }
    const { data, error } = await state.client.functions.invoke("arena-attack", {
      body: {
        attacker_character_id: state.character.id,
        target_character_id: targetCharacterId
      }
    });
    if (error) {
      console.warn("[Aetheria] Falha no duelo:", error.message);
      return { ok: false, message: error.message || "Não foi possível realizar o duelo." };
    }
    return data || { ok: false, message: "O servidor não confirmou o duelo." };
  }


  async function invokeQuestAction(action, extra = {}) {
    if (!state.client || !state.character || !state.user) {
      return { ok: false, message: "Entre no jogo para usar as missões." };
    }
    const { data, error } = await state.client.functions.invoke("quest-action", {
      body: { action, character_id: state.character.id, ...extra }
    });
    if (error) {
      console.warn("[Aetheria] Falha no sistema de missões:", error.message);
      return { ok: false, message: error.message || "Não foi possível conectar ao diário." };
    }
    if (data?.character) {
      state.character = { ...state.character, ...data.character };
      window.AetheriaWorld?.loadProgress?.(data.character);
    }
    return data || { ok: false, message: "O servidor não confirmou a ação." };
  }

  function renderQuestPanel(data) {
    const list = $("quest-list");
    if (!list) return;
    list.replaceChildren();
    const labels = {
      slime_hunt: "Limpeza da estrada",
      herb_gathering: "Ervas para a oficina",
      rune_research: "Memórias de Elyndor",
      ruins_clearance: "Ameaça nas ruínas"
    };
    const quests = Array.isArray(data?.quests) ? data.quests : [];
    if (!quests.length) {
      const empty = document.createElement("p");
      empty.className = "quest-empty";
      empty.textContent = "Converse com os habitantes das regiões para receber missões.";
      list.append(empty);
    } else {
      quests.forEach((quest) => {
        const item = document.createElement("div");
        item.className = "quest-entry" + (quest.status === "completed" ? " is-completed" : "");
        const title = document.createElement("strong");
        title.textContent = labels[quest.quest_key] || "Missão";
        const progress = document.createElement("span");
        progress.textContent = quest.status === "completed"
          ? "Concluída"
          : Math.min(quest.progress, quest.target) + " / " + quest.target + " objetivos";
        item.append(title, progress);
        list.append(item);
      });
    }
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length) {
      const rewards = document.createElement("p");
      rewards.className = "quest-rewards";
      rewards.textContent = "Materiais recebidos: " + items.map((item) =>
        (item.item_key === "medicinal_herb" ? "Erva medicinal" : "Essência de lodo") + " ×" + item.quantity
      ).join(" · ");
      list.append(rewards);
    }
  }

  async function loadQuests() {
    const result = await invokeQuestAction("list");
    if (!result?.ok) {
      console.warn("[Aetheria] Diário indisponível:", result?.message);
      await loadInventory();
      return result;
    }
    state.questData = result;
    renderQuestPanel(result);
    window.AetheriaWorld?.loadQuestData?.(result);
    if (state.mapId === "aetheria-village") await loadInventory();
    return result;
  }

  async function acceptQuest(questKey) {
    const result = await invokeQuestAction("accept", { quest_key: questKey });
    if (result?.ok) await loadQuests();
    return result;
  }

  async function collectHerb(nodeKey) {
    const position = currentPosition();
    if (!position || !(await persistPosition(position))) {
      return { ok: false, message: "Não foi possível atualizar sua posição. Tente novamente." };
    }
    const result = await invokeQuestAction("collect_herb", { node_key: nodeKey });
    if (result?.ok) await loadQuests();
    return result;
  }

  async function collectRune(nodeKey) {
    const position = currentPosition();
    if (!position || !(await persistPosition(position))) {
      return { ok: false, message: "Não foi possível atualizar sua posição. Tente novamente." };
    }
    const result = await invokeQuestAction("collect_rune", { node_key: nodeKey });
    if (result?.ok) await loadQuests();
    return result;
  }

  async function recordRuinsDefeat(spawnIndex, defeatPosition) {
    const position = currentPosition();
    if (!position || !(await persistPosition(position))) {
      return { ok: false, message: "Não foi possível atualizar sua posição. Tente novamente." };
    }
    const result = await invokeQuestAction("record_ruins_defeat", {
      spawn_index: spawnIndex,
      defeat_x: Number(defeatPosition?.x),
      defeat_y: Number(defeatPosition?.y)
    });
    if (result?.ok && result.tracked !== false) await loadQuests();
    return result;
  }

  async function recordSlimeDefeat(spawnIndex, defeatPosition) {
    const position = currentPosition();
    if (!position || !(await persistPosition(position))) {
      return { ok: false, message: "Não foi possível atualizar sua posição. Tente novamente." };
    }
    const result = await invokeQuestAction("record_slime_defeat", {
      spawn_index: spawnIndex,
      defeat_x: Number(defeatPosition?.x),
      defeat_y: Number(defeatPosition?.y)
    });
    if (result?.ok && result.tracked !== false) await loadQuests();
    return result;
  }


  const INVENTORY_ITEMS = {
    medicinal_herb: { name: "Erva medicinal", type: "Consumível", description: "Recupera até 25 pontos de vida.", action: "use", actionLabel: "Usar" },
    slime_essence: { name: "Essência de lodo", type: "Material", description: "Material coletado dos Lodos da Floresta." },
    traveler_tunic: { name: "Túnica do viajante", type: "Equipamento · Corpo", description: "Uma túnica simples para a jornada.", action: "equip", actionLabel: "Equipar" },
    trail_boots: { name: "Botas de trilha", type: "Equipamento · Pés", description: "Botas resistentes para explorar Aetheria.", action: "equip", actionLabel: "Equipar" },
    copper_charm: { name: "Amuleto de cobre", type: "Equipamento · Amuleto", description: "Um amuleto simples para completar seu equipamento.", action: "equip", actionLabel: "Equipar" },
    rune_crystal: { name: "Cristal rúnico", type: "Material", description: "Fragmento estabilizado da antiga cidade." },
    guardian_core: { name: "Núcleo do Guardião", type: "Material", description: "Núcleo mineral recuperado das criaturas das ruínas." },
    runic_mantle: { name: "Manto rúnico", type: "Equipamento · Corpo", description: "Manto tecido com símbolos antigos de Elyndor.", action: "equip", actionLabel: "Equipar" },
    stoneguard_boots: { name: "Botas do Guardião", type: "Equipamento · Pés", description: "Botas reforçadas com placas de pedra rúnica.", action: "equip", actionLabel: "Equipar" },
    elyndor_sigil: { name: "Selo de Elyndor", type: "Equipamento · Amuleto", description: "Selo antigo concedido após a queda do Guardião.", action: "equip", actionLabel: "Equipar" }
  };
  const EQUIPMENT_SLOTS = [
    { key: "body", label: "Corpo" },
    { key: "feet", label: "Pés" },
    { key: "amulet", label: "Amuleto" }
  ];

  function renderInventoryPanel(data) {
    const list = $("inventory-list");
    const equipmentList = $("equipment-list");
    const capacity = $("inventory-capacity");
    if (!list || !equipmentList) return;
    list.replaceChildren();
    equipmentList.replaceChildren();
    const items = Array.isArray(data?.inventory) ? data.inventory : [];
    const total = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (capacity) capacity.textContent = total + " / 20 itens";
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "inventory-empty";
      empty.textContent = "Sua bolsa está vazia.";
      list.append(empty);
    }
    items.forEach((entry) => {
      const definition = INVENTORY_ITEMS[entry.item_key];
      if (!definition) return;
      const card = document.createElement("article");
      card.className = "inventory-item";
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = definition.name + " ×" + entry.quantity;
      const type = document.createElement("small");
      type.textContent = definition.type;
      const description = document.createElement("p");
      description.textContent = definition.description;
      details.append(name, type, description);
      card.append(details);
      if (definition.action) {
        const action = document.createElement("button");
        action.type = "button";
        action.className = "inventory-action";
        action.dataset.inventoryAction = definition.action;
        action.dataset.itemKey = entry.item_key;
        action.textContent = definition.actionLabel;
        card.append(action);
      }
      list.append(card);
    });
    const equipped = new Map((Array.isArray(data?.equipment) ? data.equipment : []).map((item) => [item.slot, item.item_key]));
    EQUIPMENT_SLOTS.forEach((slot) => {
      const row = document.createElement("div");
      row.className = "equipment-slot";
      const label = document.createElement("strong");
      label.textContent = slot.label;
      const item = equipped.get(slot.key);
      const value = document.createElement("span");
      value.textContent = item ? (INVENTORY_ITEMS[item]?.name || item) : "Vazio";
      row.append(label, value);
      if (item) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "inventory-action secondary";
        remove.dataset.inventoryAction = "unequip";
        remove.dataset.slot = slot.key;
        remove.textContent = "Remover";
        row.append(remove);
      }
      equipmentList.append(row);
    });
  }

  async function loadInventory() {
    if (!state.client || !state.character || !state.user) return { ok: false };
    const { data, error } = await state.client.functions.invoke("inventory-action", {
      body: { action: "list", character_id: state.character.id }
    });
    if (error || !data?.ok) {
      console.warn("[Aetheria] Não foi possível carregar a bolsa:", error?.message || data?.message);
      const list = $("inventory-list");
      if (list) list.textContent = "Não foi possível carregar seus itens. Feche e tente novamente.";
      return { ok: false, message: data?.message || error?.message };
    }
    state.inventoryData = data;
    renderInventoryPanel(data);
    return data;
  }

  async function performInventoryAction(action, itemKey, slot) {
    if (!state.client || !state.character || !state.user) return;
    const panel = $("inventory-panel");
    if (panel) panel.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    const { data, error } = await state.client.functions.invoke("inventory-action", {
      body: { action, character_id: state.character.id, item_key: itemKey || undefined, slot: slot || undefined }
    });
    if (error || !data?.ok) {
      window.AetheriaWorld?.showMessage?.(data?.message || error?.message || "Não foi possível atualizar a bolsa.");
      await loadInventory();
      return;
    }
    state.inventoryData = data;
    if (data.character) {
      state.character = { ...state.character, ...data.character };
      window.AetheriaWorld?.loadProgress?.(data.character);
    }
    renderInventoryPanel(data);
    const result = data.action_result || {};
    if (action === "use") {
      window.AetheriaWorld?.showMessage?.("Você usou uma erva medicinal e recuperou " + (result.healed || 25) + " HP.");
    } else if (action === "equip") {
      window.AetheriaWorld?.showMessage?.("Equipamento atualizado.");
    } else if (action === "unequip") {
      window.AetheriaWorld?.showMessage?.("Equipamento guardado na bolsa.");
    }
  }

  function openInventory() {
    if (!state.character) return;
    window.AetheriaWorld?.setInventoryOpen?.(true);
    loadInventory();
  }

  function closeInventory() {
    window.AetheriaWorld?.setInventoryOpen?.(false);
  }

  function getQuestState(questKey) {
    return state.questData?.quests?.find((quest) => quest.quest_key === questKey) || null;
  }

  async function logout() {
    await saveCurrentPosition();
    if (state.channel) await state.client.removeChannel(state.channel);
    if (state.progressChannel) await state.client.removeChannel(state.progressChannel);
    state.channel = null;
    state.progressChannel = null;
    await state.client.auth.signOut();
    state.user = null;
    state.character = null;
    state.questData = null;
    state.inventoryData = null;
    renderQuestPanel(null);
    closeInventory();
    state.connected = false;
    if (statusLabel) statusLabel.textContent = "Mundo local";
    showAuth();
  }

  function init() {
    if (!configured() || !window.supabase?.createClient) {
      message(authMessage, "Modo local ativo. Para habilitar contas e multiplayer, configure a URL e a chave publishable do Supabase em src/supabase-config.js e aplique a migração SQL.", "warning");
      $("auth-submit").disabled = true;
      $("auth-mode-toggle").disabled = true;
      return;
    }

    state.client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    $("auth-form").addEventListener("submit", authenticate);
    $("auth-mode-toggle").addEventListener("click", () => setMode(state.mode === "login" ? "register" : "login"));
    $("character-form").addEventListener("submit", createCharacter);
    $("logout-btn").addEventListener("click", logout);
    $("inventory-open")?.addEventListener("click", openInventory);
    $("inventory-close")?.addEventListener("click", closeInventory);
    $("inventory-panel")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-inventory-action]");
      if (!button || button.disabled) return;
      performInventoryAction(
        button.dataset.inventoryAction,
        button.dataset.itemKey,
        button.dataset.slot
      );
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        saveCurrentPosition();
      }
    });
    window.addEventListener("pagehide", () => {
      saveCurrentPosition();
    });
    setMode("login");

    state.client.auth.getSession().then(({ data, error }) => {
      if (error) {
        message(authMessage, error.message, "error");
        return;
      }
      state.user = data.session?.user || null;
      if (state.user) loadCharacters();
    });
    state.client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        state.user = null;
        state.character = null;
        showAuth();
      }
    });
  }

  window.AetheriaBackend = {
    sendPosition,
    changeMap,
    saveCurrentPosition,
    awardMonsterDefeat,
    applyMonsterDamage,
    respawnCharacter,
    getRegionalBossState,
    hitRegionalBoss,
    receiveRegionalBossStrike,
    hasOnlineCharacter: () => Boolean(state.client && state.user && state.character),
    attackPlayer,
    loadQuests,
    acceptQuest,
    collectHerb,
    collectRune,
    recordRuinsDefeat,
    recordSlimeDefeat,
    getQuestState,
    openInventory,
    closeInventory,
    isOnline: () => state.connected
  };
  document.addEventListener("DOMContentLoaded", init);
})();