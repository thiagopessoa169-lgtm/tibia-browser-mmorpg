(() => {
"use strict";
const TILE=32, MAP_W=72, MAP_H=48, WORLD_W=MAP_W*TILE, WORLD_H=MAP_H*TILE;
class WorldScene extends Phaser.Scene {
  constructor(){super("WorldScene")}
  create(){
    this.createTextures(); this.drawWorld(); this.createPlayer(); this.createVillagers();
    this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.startFollow(this.player,true,.085,.085); this.cameras.main.setZoom(1.25);
    this.cursors=this.input.keyboard.createCursorKeys();
    // addKeys captura W/A/S/D por padrão e pode impedir que inputs recebam essas letras.
    // Desabilitamos a captura padrão para que o navegador processe a digitação normalmente.
    this.keys=this.input.keyboard.addKeys("W,A,S,D,SHIFT", false);
    this.input.keyboard.removeCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D
    ]);

    // Não deixe o Phaser capturar teclas enquanto o usuário preenche formulários.
    const isTextField = (element) => Boolean(element?.closest?.(
      'input, textarea, select, [contenteditable="true"]'
    ));
    const updateKeyboardFocus = () => {
      if (this.input.keyboard) {
        this.input.keyboard.enabled = !isTextField(document.activeElement);
      }
    };
    document.addEventListener("focusin", updateKeyboardFocus);
    document.addEventListener("focusout", () => {
      requestAnimationFrame(updateKeyboardFocus);
    });
    window.addEventListener("blur", () => {
      if (this.input.keyboard) this.input.keyboard.enabled = false;
    });
    window.addEventListener("focus", updateKeyboardFocus);
    updateKeyboardFocus();
    this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
    this.physics.add.collider(this.player,this.obstacles);
    this.physics.add.collider(this.player,this.villagers);
    this.add.text(18,18,"VILA DE AETHERIA",{fontFamily:"Georgia,serif",fontSize:"13px",color:"#e7e0b9",stroke:"#17251d",strokeThickness:4,letterSpacing:2}).setScrollFactor(0).setDepth(1000);
    this.add.text(18,39,"Uma nova jornada começa...",{fontFamily:"Arial",fontSize:"10px",color:"#c0d0b9",stroke:"#17251d",strokeThickness:3}).setScrollFactor(0).setDepth(1000);
    this.remotePlayers = new Map();
    window.AetheriaWorld = {
      setLocalPosition: (x, y) => {
        if (Number.isFinite(x) && Number.isFinite(y)) this.player.setPosition(
          Phaser.Math.Clamp(x, 16, WORLD_W - 16),
          Phaser.Math.Clamp(y, 16, WORLD_H - 16)
        );
      },
      getLocalPosition: () => ({ x: this.player.x, y: this.player.y }),
      updateRemotePlayer: (data) => this.updateRemotePlayer(data),
      syncRemotePlayers: (players) => this.syncRemotePlayers(players)
    };
    this.physics.world.setFPS(60);
  }
  createTextures(){
    const g=this.make.graphics({x:0,y:0,add:false});
    [0x527b58,0x587f5d,0x4d7654,0x5c825f].forEach((c,i)=>{g.clear();g.fillStyle(c,1);g.fillRect(0,0,TILE,TILE);g.fillStyle(0xffffff,.035);g.fillRect(2+i,3,9,2);g.fillStyle(0x183c2b,.12);g.fillRect(0,29,TILE,3);g.generateTexture("grass"+i,TILE,TILE)});
    g.clear();g.fillStyle(0xb4a078,1);g.fillRect(0,0,TILE,TILE);g.fillStyle(0x7e6b4c,.22);g.fillRect(4,7,8,2);g.fillRect(20,22,7,2);g.generateTexture("path",TILE,TILE);
    g.clear();g.fillStyle(0x4b493e,1);g.fillRoundedRect(3,7,26,19,5);g.fillStyle(0x77735d,1);g.fillRoundedRect(5,5,22,16,4);g.fillStyle(0x999078,.7);g.fillRect(9,9,5,2);g.generateTexture("rock",TILE,TILE);
    g.clear();g.fillStyle(0x60452e,1);g.fillRect(13,14,7,16);g.fillStyle(0x315d3c,1);g.fillCircle(16,11,12);g.fillStyle(0x47794a,1);g.fillCircle(10,9,7);g.fillCircle(21,8,7);g.fillStyle(0x8ca56a,.7);g.fillCircle(13,5,3);g.generateTexture("tree",TILE,TILE);
    g.clear();g.fillStyle(0x806044,1);g.fillRect(2,10,28,20);g.fillStyle(0x9b7950,1);g.fillRect(0,6,32,8);g.fillStyle(0x604a36,1);g.fillRect(12,18,8,12);g.fillStyle(0x4d6d54,1);g.fillRect(4,8,24,4);g.generateTexture("house",TILE,TILE);
    g.clear();g.fillStyle(0xe4c99a,1);g.fillCircle(16,8,6);g.fillStyle(0x547ba0,1);g.fillRoundedRect(9,14,14,14,4);g.fillStyle(0x293c34,1);g.fillRect(11,25,4,6);g.fillRect(18,25,4,6);g.generateTexture("player",TILE,TILE);
    g.clear();g.fillStyle(0xe2c18b,1);g.fillCircle(16,8,6);g.fillStyle(0x9a7048,1);g.fillRoundedRect(8,14,16,14,4);g.fillStyle(0x3d3429,1);g.fillRect(11,25,4,6);g.fillRect(18,25,4,6);g.generateTexture("villager",TILE,TILE);g.destroy();
  }
  drawWorld(){
    this.obstacles=this.physics.add.staticGroup();
    for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){const n=(x*17+y*31+x*y*7)%4;this.add.image(x*TILE+16,y*TILE+16,"grass"+n).setDepth(y*TILE)}
    for(let x=7;x<65;x++)this.add.image(x*TILE+16,24*TILE+16,"path").setDepth(24*TILE+1);
    for(let y=8;y<40;y++)this.add.image(36*TILE+16,y*TILE+16,"path").setDepth(y*TILE+1);
    for(let y=21;y<28;y++)for(let x=33;x<40;x++)this.add.image(x*TILE+16,y*TILE+16,"path").setDepth(y*TILE+2);
    const props=[[15,17,"house"],[20,17,"house"],[52,17,"house"],[57,17,"house"],[15,31,"house"],[20,31,"house"],[52,31,"house"],[57,31,"house"],[10,10,"tree"],[13,8,"tree"],[24,9,"tree"],[47,9,"tree"],[61,10,"tree"],[8,37,"tree"],[13,39,"tree"],[25,38,"tree"],[47,39,"tree"],[63,37,"tree"],[29,15,"rock"],[43,14,"rock"],[29,33,"rock"],[44,34,"rock"]];
    props.forEach(([x,y,key])=>{const obj=this.add.image(x*TILE+16,y*TILE+16,key).setDepth(y*TILE+20);if(key==="house"||key==="rock")this.obstacles.add(obj);if(key==="tree"){const trunk=this.add.rectangle(x*TILE+16,y*TILE+24,9,12,0x4c3828).setDepth(y*TILE+1);this.obstacles.add(trunk);obj.setDepth(y*TILE+40)}});
    this.obstacles.refresh();
    this.add.graphics().lineStyle(8,0x2d4b37,.9).strokeRect(2,2,WORLD_W-4,WORLD_H-4).setDepth(WORLD_H+10);
  }
  createPlayer(){this.player=this.physics.add.sprite(36*TILE+16,24*TILE+16,"player");this.player.setDepth(this.player.y+30).setCollideWorldBounds(true);this.player.body.setSize(17,17).setOffset(7,12);this.player.speed=145}
  createVillagers(){
    this.villagers=this.physics.add.staticGroup();
    [[33,22,"Mira"],[40,26,"Ferreiro"],[31,27,"Guarda"]].forEach(([x,y,name])=>{
      const npc=this.villagers.create(x*TILE+16,y*TILE+16,"villager");npc.setDepth(npc.y+20);npc.refreshBody();
      this.add.text(npc.x,npc.y-28,name,{fontFamily:"Arial",fontSize:"10px",color:"#fff2c9",stroke:"#26352b",strokeThickness:3}).setOrigin(.5).setDepth(npc.y+50);
      const bar=this.add.graphics().setDepth(npc.y+49);bar.fillStyle(0x26352b,.9).fillRoundedRect(npc.x-13,npc.y-17,26,4,2);bar.fillStyle(0x83bd79,1).fillRoundedRect(npc.x-12,npc.y-16,24,2,1);
    });
  }
  updateRemotePlayer(data){
    if(!data || !data.user_id || data.map_id !== "aetheria-village") return;
    const x = Number(data.x), y = Number(data.y);
    if(!Number.isFinite(x) || !Number.isFinite(y)) return;
    let remote = this.remotePlayers.get(data.user_id);
    if(!remote){
      const sprite = this.add.image(x,y,"player").setTint(0x91c9e8).setDepth(y+30);
      const label = this.add.text(x,y-28,String(data.name || "Aventureiro"),{
        fontFamily:"Arial",fontSize:"10px",color:"#d8efff",
        stroke:"#142b3b",strokeThickness:3
      }).setOrigin(.5).setDepth(y+50);
      remote = {sprite,label,targetX:x,targetY:y,lastUpdateAt:Number(data.sent_at)||0};
      this.remotePlayers.set(data.user_id,remote);
    } else {
      const incomingAt = Number(data.sent_at) || 0;
      // Presença pode chegar atrasada; não deixe dados antigos sobrescreverem o broadcast recente.
      if (incomingAt && remote.lastUpdateAt && incomingAt < remote.lastUpdateAt) return;
      remote.targetX = x;
      remote.targetY = y;
      if (incomingAt) remote.lastUpdateAt = incomingAt;
      remote.label.setText(String(data.name || "Aventureiro"));
    }
    remote.label.setDepth(y+50);
  }
  syncRemotePlayers(players){
    const active = new Set();
    (players || []).forEach((player) => {
      if(!player?.user_id) return;
      active.add(player.user_id);
      this.updateRemotePlayer(player);
    });
    for(const [id,remote] of this.remotePlayers){
      if(!active.has(id)){
        remote.sprite.destroy();
        remote.label.destroy();
        this.remotePlayers.delete(id);
      }
    }
  }
  update(time, delta){
    // Suaviza a posição dos jogadores remotos sem alterar a movimentação local.
    const blend = 1 - Math.exp(-Math.min(delta || 16.67, 50) / 125);
    for (const remote of this.remotePlayers.values()) {
      const currentX = remote.sprite.x;
      const currentY = remote.sprite.y;
      const nextX = Phaser.Math.Linear(currentX, remote.targetX, blend);
      const nextY = Phaser.Math.Linear(currentY, remote.targetY, blend);
      remote.sprite.setPosition(nextX, nextY).setDepth(nextY + 30);
      remote.label.setPosition(nextX, nextY - 28).setDepth(nextY + 50);
    }
    if(!this.player?.body)return;
    const active=document.activeElement;
    const typing=active && (active.matches("input,textarea,select") || active.isContentEditable);
    if(typing){this.player.setVelocity(0,0);return;}
    const left=this.cursors.left.isDown||this.keys.A.isDown,right=this.cursors.right.isDown||this.keys.D.isDown,up=this.cursors.up.isDown||this.keys.W.isDown,down=this.cursors.down.isDown||this.keys.S.isDown;
    const speed=this.keys.SHIFT.isDown?205:this.player.speed;let vx=(right?1:0)-(left?1:0),vy=(down?1:0)-(up?1:0),len=Math.hypot(vx,vy)||1;
    vx=vx/len*speed;vy=vy/len*speed;this.player.setVelocity(vx,vy);this.player.setDepth(this.player.y+30);window.AetheriaBackend?.sendPosition({x:this.player.x,y:this.player.y});
    this.player.setAngle(vx<0?-4:vx>0?4:0);
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:"game",width:960,height:540,backgroundColor:"#527b58",pixelArt:true,antialias:false,roundPixels:true,physics:{default:"arcade",arcade:{debug:false}},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{powerPreference:"high-performance",pixelArt:true},scene:[WorldScene]});
})();