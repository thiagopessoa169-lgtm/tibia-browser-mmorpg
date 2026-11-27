(() => {
  "use strict";

  const config = window.AETHERIA_SUPABASE_CONFIG || {};
  const state = {
    client: null,
    user: null,
    character: null,
    channel: null,
    connected: false,
    lastBroadcastAt: 0,
    lastTrackAt: 0,
    lastPersistAt: 0,
    lastX: null,
    lastY: null,
    mode: "login"
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
          options: { data: { display_name: name } }
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
      .select("id,name,level,hp,max_hp,x,y,map_id")
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
        detail.textContent = "Nível " + character.level + " · " + character.hp + "/" + character.max_hp + " HP";
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
    }).select("id,name,level,hp,max_hp,x,y,map_id").single();
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
    state.character = character;
    showCharacters();
    $("character-panel").hidden = true;
    $("account-bar").hidden = false;
    $("account-label").textContent = character.name + " · " + state.user.email;
    state.lastX = Number(character.x);
    state.lastY = Number(character.y);
    state.lastPersistAt = 0;
    state.lastBroadcastAt = 0;
    state.lastTrackAt = 0;
    if (window.AetheriaWorld?.setLocalPosition) {
      window.AetheriaWorld.setLocalPosition(character.x, character.y);
    }
    $("player-name").textContent = character.name;
    $("player-level").textContent = "Nível " + character.level + " · Aventureiro";
    await connectWorld();
  }

  async function connectWorld() {
    if (!state.client || !state.user || !state.character) return;
    if (state.channel) await state.client.removeChannel(state.channel);
    const topic = "aetheria:world";
    const channel = state.client.channel(topic, {
      config: {
        private: true,
        presence: { key: state.user.id },
        broadcast: { self: false, ack: false }
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
  }

  function syncPresence(channel) {
    const presence = channel.presenceState();
    const players = [];
    Object.values(presence).forEach((entries) => {
      (entries || []).forEach((entry) => {
        if (entry.user_id !== state.user?.id && entry.map_id === "aetheria-village") {
          players.push(entry);
        }
      });
    });
    window.AetheriaWorld?.syncRemotePlayers?.(players);
    $("online-count").textContent = String(players.length + 1);
  }

  async function persistPosition(position) {
    if (!state.client || !state.character || !position) return false;
    const x = Math.round(Number(position.x));
    const y = Math.round(Number(position.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const { error } = await state.client.from("characters").update({
      x, y, updated_at: new Date().toISOString()
    }).eq("id", state.character.id);
    if (error) {
      console.warn("Falha ao salvar posição:", error.message);
      return false;
    }
    state.lastPersistAt = Date.now();
    return true;
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
    if (!moved || now - state.lastBroadcastAt < 80) return;
    state.lastBroadcastAt = now;
    state.lastX = x;
    state.lastY = y;
    const payload = { user_id: state.user.id, character_id: state.character.id, name: state.character.name, x: Math.round(x), y: Math.round(y), map_id: "aetheria-village", sent_at: now };
    try {
      const result = await state.channel.send({ type: "broadcast", event: "position", payload });
      if (result !== "ok" && result?.status !== "ok") console.warn("[Aetheria] Broadcast de posição não confirmado:", result);
    } catch (error) { console.warn("[Aetheria] Erro ao transmitir posição:", error); }
    if (now - state.lastTrackAt >= 400) {
      state.lastTrackAt = now;
      try { await state.channel.track(payload); }
      catch (error) { console.warn("[Aetheria] Erro ao atualizar presença:", error); }
    }
    if (now - state.lastPersistAt >= 1000) {
      persistPosition(payload).catch((error) => console.warn("[Aetheria] Erro ao salvar posição:", error));
    }
  }

  async function logout() {
    await saveCurrentPosition();
    if (state.channel) await state.client.removeChannel(state.channel);
    await state.client.auth.signOut();
    state.user = null;
    state.character = null;
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
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveCurrentPosition();
    });
    window.addEventListener("pagehide", () => saveCurrentPosition());
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

  window.AetheriaBackend = { sendPosition, saveCurrentPosition, isOnline: () => state.connected };
  document.addEventListener("DOMContentLoaded", init);
})();