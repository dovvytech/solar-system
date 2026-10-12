import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  PLANETS, BUILDINGS, TRAVEL_ORDER, WORLD_W, VIEW_H,
  buildingDef, nextId, saveGame,
  type PlayerState, type BuildingType, type PlacedBuilding, type Crystal,
} from './types';

// ---------- Constantes physiques ----------
const WALK_SPEED = 240; // px/s (à gravité 1)
const JUMP_V = 620;
const GRAVITY = 1500;
const PLAYER_R = 22;
const GROUND_TOP = 80; // hauteur du sol depuis le bas du canvas
const OXY_RADIUS = 170;
const SHIELD_RADIUS = 200;
const DOME_RADIUS = 320;
const MAX_BUBBLES = 140;

interface Bubble { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; }
interface FloatText { x: number; y: number; text: string; t: number; color: string; }

export default function GameWorld({
  player, setPlayer, mode, setMode, onExit,
}: {
  player: PlayerState;
  setPlayer: (fn: (p: PlayerState) => PlayerState) => void;
  mode: 'explore' | 'build';
  setMode: (m: 'explore' | 'build') => void;
  onExit: () => void;
}) {
  const planet = PLANETS[player.currentPlanet];

  // Refs "vraiment" mutables pour la boucle de jeu
  const posRef = useRef({ x: WORLD_W / 2, y: 0 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const camRef = useRef(WORLD_W / 2);
  const keysRef = useRef<Set<string>>(new Set());
  const bubblesRef = useRef<Bubble[]>([]);
  const floatsRef = useRef<FloatText[]>([]);
  const timersRef = useRef({ solar: 0, crystal: 0, hazard: 0, o2: 0 });
  const shieldRef = useRef(100);
  const o2Ref = useRef(100);
  const playerRef = useRef(player);
  const modeRef = useRef(mode);
  const ghostRef = useRef<{ x: number; ok: boolean } | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Refs miroir (pour lire l'état React dans la boucle rAF)
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Chargement de la photo en avatar
  useEffect(() => {
    if (player.photo) {
      const img = new Image();
      img.src = player.photo;
      img.onload = () => { photoImgRef.current = img; };
    } else {
      photoImgRef.current = null;
    }
  }, [player.photo]);

  // HUD (mis à jour ~10x/s seulement si valeur changée)
  const [shieldUI, setShieldUI] = useState(100);
  const [o2UI, setO2UI] = useState(100);
  const [factIdx, setFactIdx] = useState(0);
  const [travelOpen, setTravelOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Étoiles d'arrière-plan fixes (générées une fois par planète)
  const starsRef = useRef<{ x: number; y: number; r: number; tw: number }[]>((() => {
    const arr: { x: number; y: number; r: number; tw: number }[] = [];
    for (let i = 0; i < 90; i++) {
      arr.push({ x: Math.random() * WORLD_W, y: Math.random() * (VIEW_H - GROUND_TOP - 40), r: Math.random() * 1.6 + 0.4, tw: Math.random() * 6 });
    }
    return arr;
  })());

  // Rochers décoratifs fixes
  const rocksRef = useRef<{ x: number; s: number }[]>((() => {
    const arr: { x: number; s: number }[] = [];
    for (let i = 0; i < 26; i++) arr.push({ x: Math.random() * WORLD_W, s: 8 + Math.random() * 22 });
    return arr;
  })());

  // ---------- Helpers colonie ----------
  const colonyOf = (pid: string) => {
    const p = playerRef.current;
    return p.colonies[pid] || { buildings: [] as PlacedBuilding[], crystals: [] as Crystal[] };
  };

  const spawnFloat = (x: number, y: number, text: string, color = '#fff') => {
    floatsRef.current.push({ x, y, text, t: 0, color });
    if (floatsRef.current.length > 20) floatsRef.current.shift();
  };

  const showToast = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 2600);
  };

  // ---------- Ramassage des cristaux ----------
  const collectCrystals = () => {
    const pid = playerRef.current.currentPlanet;
    const px = posRef.current.x;
    const col = colonyOf(pid);
    const near = col.crystals.filter((c) => Math.abs(c.x - px) < 46);
    if (near.length === 0) return;
    const ids = new Set(near.map((c) => c.id));
    setPlayer((p) => {
      const c = p.colonies[pid];
      if (!c) return p;
      return {
        ...p,
        totalCrystals: p.totalCrystals + ids.size,
        colonies: { ...p.colonies, [pid]: { ...c, crystals: c.crystals.filter((x) => !ids.has(x.id)) } },
      };
    });
    spawnFloat(px, -PLAYER_R - 40, `+${ids.size} 💎`, '#7dffd4');
    confetti({ particleCount: 25 * ids.size, spread: 60, origin: { y: 0.7 }, colors: ['#7dffd4', '#ffe066', '#ffffff'] });
  };

  // ---------- Achat / placement ----------
  const buyBuilding = (t: BuildingType) => {
    const def = buildingDef(t);
    const p = playerRef.current;
    if (p.totalCrystals < def.cost) { showToast(`Pas assez de cristaux 💎 (${def.cost} requis)`); return; }
    if (def.special && colonyOf(p.currentPlanet).buildings.some((b) => b.type === t)) {
      showToast('Il y a déjà une fusée ici ! 🚀'); return;
    }
    setPlayer((pp) => ({
      ...pp,
      totalCrystals: pp.totalCrystals - def.cost,
      inventory: { ...pp.inventory, [t]: pp.inventory[t] + 1 },
    }));
    showToast(`${def.emoji} ${def.name} acheté(e) ! Choisis un emplacement.`);
    setMode('build');
  };

  const placeSelected = (worldX: number) => {
    const p = playerRef.current;
    // pick premier objet dispo (ordre : dôme, bouclier, usine, panneau, abri, fusée)
    const order: BuildingType[] = ['dome', 'shield', 'oxygen', 'solar', 'tent', 'rocket'];
    const t = order.find((k) => p.inventory[k] > 0);
    if (!t) { showToast('Aucun objet à placer ! Achète-le dans la boutique.'); return; }
    const def = buildingDef(t);
    const half = def.width / 2 + 10;
    const x = Math.max(half, Math.min(WORLD_W - half, worldX));
    setPlayer((pp) => {
      const inv = { ...pp.inventory, [t]: pp.inventory[t] - 1 };
      const col = pp.colonies[pp.currentPlanet] || { buildings: [], crystals: [] };
      const building: PlacedBuilding = { id: nextId('b'), type: t, x };
      return {
        ...pp,
        inventory: inv,
        colonies: { ...pp.colonies, [pp.currentPlanet]: { ...col, buildings: [...col.buildings, building] } },
      };
    });
    spawnFloat(x, -60, `${def.emoji} Construit !`, '#ffe066');
    confetti({ particleCount: 40, spread: 90, origin: { y: 0.65 }, colors: [def.emoji === '🚀' ? '#ff6b6b' : '#ffe066', '#7dffd4'] });
  };

  // ---------- Voyage ----------
  const travelTo = (pid: string) => {
    if (pid === player.currentPlanet) return;
    if (player.inventory.rocket <= 0) { showToast('Construis une fusée 🚀 d’abord !'); return; }
    const target = PLANETS[pid];
    setTravelOpen(false);
    setPlayer((p) => {
      const discovered = p.discovered.includes(pid) ? p.discovered : [...p.discovered, pid];
      return {
        ...p,
        currentPlanet: pid,
        discovered,
        inventory: { ...p.inventory, rocket: p.inventory.rocket - 1 },
        colonies: p.colonies[pid] ? p.colonies : { ...p.colonies, [pid]: { buildings: [], crystals: [] } },
      };
    });
    posRef.current = { x: WORLD_W / 2, y: 0 };
    velRef.current = { vx: 0, vy: 0 };
    camRef.current = WORLD_W / 2;
    shieldRef.current = 100;
    o2Ref.current = 100;
    confetti({ particleCount: 160, spread: 120, origin: { y: 0.5 }, colors: [target.color, '#ffffff', '#ffe066'] });
    showToast(target.id === 'sun'
      ? `☀️ Tu viens de marcher sur le SOLEIL ! Reste sous les protections !`
      : `${target.emoji} Bienvenue sur ${target.name} !`);
  };

  // ---------- Clavier ----------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (['arrowleft', 'arrowright', 'arrowup', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Sauvegarde automatique
  useEffect(() => { saveGame(player); }, [player]);

  // Rotation des faits amusants
  useEffect(() => {
    setFactIdx(0);
    const iv = window.setInterval(() => setFactIdx((i) => (i + 1) % PLANETS[playerRef.current.currentPlanet].facts.length), 9000);
    return () => window.clearInterval(iv);
  }, [player.currentPlanet]);

  // ---------- Boucle principale + rendu ----------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudTick = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const P = playerRef.current;
      const pl = PLANETS[P.currentPlanet];
      const col = P.colonies[P.currentPlanet] || { buildings: [], crystals: [] };
      const keys = keysRef.current;

      // ----- Déplacement -----
      const speed = WALK_SPEED * pl.gravity;
      let vx = 0;
      if (keys.has('arrowleft') || keys.has('q') || keys.has('a')) vx -= speed;
      if (keys.has('arrowright') || keys.has('d')) vx += speed;
      velRef.current.vx = vx;
      const pos = posRef.current;
      const vel = velRef.current;
      const onGround = pos.y <= 0.01 && vel.vy <= 0;
      if ((keys.has('arrowup') || keys.has(' ') || keys.has('z') || keys.has('w')) && onGround) {
        vel.vy = JUMP_V * (0.7 + 0.3 * pl.gravity);
      }
      vel.vy -= GRAVITY * dt * (pl.id === 'sun' ? 0.35 : 0.55 + 0.45 * pl.gravity);
      pos.x = Math.max(PLAYER_R, Math.min(WORLD_W - PLAYER_R, pos.x + vel.vx * dt));
      pos.y += vel.vy * dt;
      if (pos.y < 0) { pos.y = 0; vel.vy = 0; }

      // Caméra
      camRef.current += (pos.x - camRef.current) * Math.min(1, dt * 5);

      // ----- Protection & survie -----
      const inO2 = pl.oxygen || hasBuildingNearBuild(col, 'oxygen', pos.x, OXY_RADIUS) || hasBuildingNearBuild(col, 'dome', pos.x, DOME_RADIUS);
      const inShield = hasBuildingNearBuild(col, 'shield', pos.x, SHIELD_RADIUS) || hasBuildingNearBuild(col, 'dome', pos.x, DOME_RADIUS);

      o2Ref.current = Math.max(0, Math.min(100, o2Ref.current + (inO2 ? 30 : -12) * dt));
      if (pl.hazard !== 'none') {
        shieldRef.current = Math.max(0, Math.min(100, shieldRef.current + (inShield ? 20 : -pl.hazardRate) * dt));
      } else {
        shieldRef.current = Math.min(100, shieldRef.current + 15 * dt);
      }

      // Mort → respawn à la base avec pénalité
      if (shieldRef.current <= 0 || o2Ref.current <= 0) {
        const lost = Math.min(P.totalCrystals, 8);
        setPlayer((p) => ({ ...p, totalCrystals: p.totalCrystals - lost }));
        spawnFloat(pos.x, -80, `💥 Perdu ! -${lost} 💎`, '#ff6b6b');
        showToast(o2Ref.current <= 0 ? '😵 Tu manques d’oxygène ! Retour à la base.' : `🔥 Le danger de ${pl.name} t’a repoussé ! Retour à la base.`);
        pos.x = WORLD_W / 2; pos.y = 0; vel.vy = 0;
        shieldRef.current = 100; o2Ref.current = 100;
      }

      // ----- Générateurs (panneaux solaires + cristaux aléatoires) -----
      timersRef.current.solar += dt;
      if (timersRef.current.solar >= 8) {
        timersRef.current.solar = 0;
        const nSolar = col.buildings.filter((b) => b.type === 'solar').length;
        if (nSolar > 0) {
          setPlayer((p) => ({ ...p, totalCrystals: p.totalCrystals + nSolar }));
          col.buildings.filter((b) => b.type === 'solar').forEach((b) => spawnFloat(b.x, -90, '+1 💎', '#ffe066'));
        }
      }
      timersRef.current.crystal += dt;
      if (timersRef.current.crystal >= 6) {
        timersRef.current.crystal = 0;
        if (col.crystals.length < 7) {
          const nc: Crystal = { id: nextId('c'), x: 120 + Math.random() * (WORLD_W - 240), bob: Math.random() * 6 };
          setPlayer((p) => {
            const c = p.colonies[P.currentPlanet] || { buildings: [], crystals: [] };
            return { ...p, colonies: { ...p.colonies, [P.currentPlanet]: { ...c, crystals: [...c.crystals, nc] } } };
          });
        }
      }
      collectCrystals();

      // ----- Bulles (usine à oxygène) -----
      const bs = bubblesRef.current;
      col.buildings.filter((b) => b.type === 'oxygen').forEach((b) => {
        if (bs.length < MAX_BUBBLES && Math.random() < 0.3) {
          bs.push({ x: b.x + (Math.random() - 0.5) * 40, y: -60, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 40, life: 0, max: 2 + Math.random() * 2, size: 3 + Math.random() * 6, color: 'rgba(140,220,255,0.7)' });
        }
      });
      // fumée panneaux/abris
      if (bs.length < MAX_BUBBLES && Math.random() < 0.12) {
        const src = col.buildings[Math.floor(Math.random() * col.buildings.length)];
        if (src) {
          const def = buildingDef(src.type);
          bs.push({ x: src.x + (Math.random() - 0.5) * 20, y: -def.height, vx: (Math.random() - 0.5) * 10, vy: -15 - Math.random() * 15, life: 0, max: 2.5, size: 4 + Math.random() * 5, color: 'rgba(200,200,220,0.25)' });
        }
      }
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i];
        b.life += dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.life > b.max) bs.splice(i, 1);
      }

      // textes flottants
      const fs = floatsRef.current;
      for (let i = fs.length - 1; i >= 0; i--) {
        fs[i].t += dt; fs[i].y -= 30 * dt;
        if (fs[i].t > 1.6) fs.splice(i, 1);
      }

      // ----- Rendu -----
      draw(now / 1000, P, pl, col);

      // HUD toutes les ~100 ms
      hudTick += dt;
      if (hudTick > 0.1) {
        hudTick = 0;
        setShieldUI(Math.round(shieldRef.current));
        setO2UI(Math.round(o2Ref.current));
      }

      raf = requestAnimationFrame(loop);
    };

    const hasBuildingNearBuild = (col: { buildings: PlacedBuilding[] }, t: BuildingType, x: number, r: number) =>
      col.buildings.some((b) => b.type === t && Math.abs(b.x - x) <= r);

    const draw = (time: number, P: PlayerState, pl: typeof PLANETS[string], col: { buildings: PlacedBuilding[]; crystals: Crystal[] }) => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const cw = wrap.clientWidth;
      const ch = VIEW_H;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== cw * dpr) { canvas.width = cw * dpr; canvas.height = ch * dpr; canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const viewW = Math.min(900, cw);
      const scale = cw / viewW;
      const cam = Math.max(viewW / 2, Math.min(WORLD_W - viewW / 2, camRef.current));
      const toS = (wx: number) => (wx - cam + viewW / 2) * scale;
      const groundBase = ch - GROUND_TOP; // y écran du sommet du sol

      // Ciel
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      sky.addColorStop(0, pl.skyColors[0]);
      sky.addColorStop(1, pl.skyColors[1]);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cw, ch);

      // Étoiles
      ctx.save();
      for (const s of starsRef.current) {
        const sx = toS(s.x);
        if (sx < -5 || sx > cw + 5) continue;
        ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(time + s.tw));
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx, s.y, s.r * scale, 0, 7); ctx.fill();
      }
      ctx.restore();

      // Planète voisine / soleil dans le ciel (décor)
      ctx.save();
      ctx.globalAlpha = 0.9;
      if (pl.id === 'sun') {
        const g = ctx.createRadialGradient(cw * 0.8, 70, 5, cw * 0.8, 70, 90);
        g.addColorStop(0, '#fff8c0'); g.addColorStop(1, 'rgba(255,160,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cw * 0.8, 70, 90, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,220,120,0.85)';
        ctx.beginPath(); ctx.arc(cw * 0.15, 60, 22, 0, 7); ctx.fill();
      }
      ctx.restore();

      // Sol (collines + surface)
      ctx.fillStyle = pl.groundColors[1];
      ctx.beginPath();
      ctx.moveTo(0, ch);
      for (let sx = 0; sx <= cw; sx += 20) {
        const wx = cam - viewW / 2 + sx / scale;
        const hill = Math.sin(wx * 0.004) * 18 + Math.sin(wx * 0.011 + 2) * 9;
        ctx.lineTo(sx, groundBase - hill);
      }
      ctx.lineTo(cw, ch); ctx.closePath(); ctx.fill();
      // ligne de surface
      ctx.strokeStyle = pl.groundColors[0];
      ctx.lineWidth = 3;
      ctx.beginPath();
      let first = true;
      for (let sx = 0; sx <= cw; sx += 12) {
        const wx = cam - viewW / 2 + sx / scale;
        const hill = Math.sin(wx * 0.004) * 18 + Math.sin(wx * 0.011 + 2) * 9;
        if (first) { ctx.moveTo(sx, groundBase - hill); first = false; } else ctx.lineTo(sx, groundBase - hill);
      }
      ctx.stroke();

      // Rochers
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (const r of rocksRef.current) {
        const sx = toS(r.x);
        if (sx < -30 || sx > cw + 30) continue;
        ctx.beginPath(); ctx.ellipse(sx, groundBase - 2, r.s * scale * 0.6, r.s * scale * 0.35, 0, 0, 7); ctx.fill();
      }

      // Zones de protection (rayons)
      for (const b of col.buildings) {
        const sx = toS(b.x);
        if (sx < -400 || sx > cw + 400) continue;
        if (b.type === 'oxygen') zone(ctx, sx, groundBase, OXY_RADIUS * scale, 'rgba(120,220,255,0.10)', 'rgba(120,220,255,0.35)');
        if (b.type === 'shield') zone(ctx, sx, groundBase, SHIELD_RADIUS * scale, 'rgba(180,120,255,0.10)', 'rgba(180,120,255,0.4)');
        if (b.type === 'dome') zone(ctx, sx, groundBase, DOME_RADIUS * scale, 'rgba(120,255,190,0.08)', 'rgba(120,255,190,0.4)');
      }

      // Cristaux
      ctx.font = `${26 * scale}px serif`;
      ctx.textAlign = 'center';
      for (const c of col.crystals) {
        const sx = toS(c.x);
        if (sx < -30 || sx > cw + 30) continue;
        const bob = Math.sin(time * 2.5 + c.bob) * 5;
        ctx.save();
        ctx.shadowColor = '#7dffd4'; ctx.shadowBlur = 12;
        ctx.fillText('💎', sx, groundBase - 14 + bob);
        ctx.restore();
      }

      // Bâtiments
      for (const b of col.buildings) {
        const def = buildingDef(b.type);
        const sx = toS(b.x);
        if (sx < -200 || sx > cw + 200) continue;
        drawBuilding(ctx, b.type, def.emoji, sx, groundBase, def.width * scale, def.height * scale, time);
      }

      // Fantôme de placement
      if (modeRef.current === 'build' && ghostRef.current) {
        const order: BuildingType[] = ['dome', 'shield', 'oxygen', 'solar', 'tent', 'rocket'];
        const t = order.find((k) => P.inventory[k] > 0);
        if (t) {
          const def = buildingDef(t);
          const g = ghostRef.current;
          ctx.save();
          ctx.globalAlpha = 0.55;
          drawBuilding(ctx, t, def.emoji, toS(g.x), groundBase, def.width * scale, def.height * scale, time);
          ctx.restore();
          ctx.fillStyle = g.ok ? '#7dffd4' : '#ff6b6b';
          ctx.font = `bold ${13 * scale}px sans-serif`;
          ctx.fillText(g.ok ? 'Cliquer pour poser ✔' : 'Trop près d’un bâtiment ✖', toS(g.x), groundBase - def.height * scale - 14);
        }
      }

      // Bulles
      for (const b of bubblesRef.current) {
        const alpha = Math.max(0, 1 - b.life / b.max);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(toS(b.x), groundBase + b.y, b.size * scale, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Joueur
      drawPlayer(ctx, toS(posRef.current.x), groundBase - posRef.current.y * scale, PLAYER_R * scale, P, pl, time, vxNow());

      // Textes flottants
      for (const f of floatsRef.current) {
        ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6);
        ctx.fillStyle = f.color;
        ctx.font = `bold ${15 * scale}px sans-serif`;
        ctx.fillText(f.text, toS(f.x), groundBase + f.y - 40);
      }
      ctx.globalAlpha = 1;
    };

    const vxNow = () => velRef.current.vx;

    const zone = (ctx: CanvasRenderingContext2D, x: number, gy: number, r: number, fill: string, stroke: string) => {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, gy, r, Math.PI, 2 * Math.PI); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.stroke();
      ctx.restore();
    };

    const drawBuilding = (ctx: CanvasRenderingContext2D, t: BuildingType, emoji: string, x: number, gy: number, w: number, h: number, time: number) => {
      ctx.save();
      if (t === 'dome') {
        ctx.beginPath(); ctx.arc(x, gy, w / 2, Math.PI, 2 * Math.PI); ctx.closePath();
        const g = ctx.createLinearGradient(x, gy - h, x, gy);
        g.addColorStop(0, 'rgba(190,255,220,0.35)'); g.addColorStop(1, 'rgba(90,200,150,0.15)');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(150,255,200,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.font = `${h * 0.42}px serif`; ctx.textAlign = 'center';
        ctx.fillText('🏙️', x, gy - h * 0.18);
      } else if (t === 'rocket') {
        const flick = Math.sin(time * 30) * 0.15;
        ctx.font = `${h * (1 + flick * 0.2)}px serif`; ctx.textAlign = 'center';
        ctx.fillText('🚀', x, gy - 4);
      } else if (t === 'solar') {
        ctx.strokeStyle = '#889'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy - h * 0.45); ctx.stroke();
        ctx.save();
        ctx.translate(x, gy - h * 0.5); ctx.rotate(-0.35);
        const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, '#1a3a8f'); g.addColorStop(1, '#3f6fe0');
        ctx.fillStyle = g; ctx.fillRect(-w / 2, -h * 0.22, w, h * 0.44);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + (w / 4) * i, -h * 0.22); ctx.lineTo(-w / 2 + (w / 4) * i, h * 0.22); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
        ctx.restore();
      } else {
        // ombre douce
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(x, gy + 3, w * 0.45, 6, 0, 0, 7); ctx.fill();
        ctx.font = `${h * 0.8}px serif`; ctx.textAlign = 'center';
        const wob = t === 'oxygen' ? Math.sin(time * 3 + x) * 2 : 0;
        ctx.fillText(emoji, x, gy - 4 + wob);
      }
      ctx.restore();
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, P: PlayerState, pl: typeof PLANETS[string], time: number, vx: number) => {
      ctx.save();
      // ombre
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(x, y + r + (groundShadowY()), r * 0.8, 5, 0, 0, 7); ctx.fill();
      const bounce = Math.abs(Math.sin(time * 10)) * (Math.abs(vx) > 1 ? 3 : 0);
      const py = y - bounce;
      // corps combinaison
      ctx.fillStyle = '#eef3fa';
      ctx.strokeStyle = '#9aa7bd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x - r * 0.75, py - r * 0.1, r * 1.5, r * 1.35, r * 0.45); ctx.fill(); ctx.stroke();
      // sac à dos (derrière le joueur selon la direction)
      ctx.fillStyle = '#c65b3f';
      const packX = vx >= 0 ? x - r * 1.05 : x + r * 0.65;
      ctx.beginPath(); ctx.roundRect(packX, py + r * 0.15, r * 0.4, r * 0.8, 4); ctx.fill();
      // casque
      ctx.fillStyle = 'rgba(180,220,255,0.35)';
      ctx.strokeStyle = '#cdd8e8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, py - r * 0.55, r * 0.85, 0, 7); ctx.fill(); ctx.stroke();
      // visage : photo ou smiley
      const faceR = r * 0.55;
      ctx.save();
      ctx.beginPath(); ctx.arc(x, py - r * 0.55, faceR, 0, 7); ctx.clip();
      const img = photoImgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        const s = faceR * 2;
        const ratio = Math.max(s / img.naturalWidth, s / img.naturalHeight);
        const dw = img.naturalWidth * ratio, dh = img.naturalHeight * ratio;
        ctx.drawImage(img, x - dw / 2, py - r * 0.55 - dh / 2, dw, dh);
      } else {
        ctx.fillStyle = '#ffd9a0';
        ctx.fillRect(x - faceR, py - r * 0.55 - faceR, faceR * 2, faceR * 2);
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(x - faceR * 0.35, py - r * 0.62, 2.4, 0, 7); ctx.arc(x + faceR * 0.35, py - r * 0.62, 2.4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, py - r * 0.45, faceR * 0.45, 0.2, Math.PI - 0.2); ctx.stroke();
      }
      ctx.restore();
      // reflet casque
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, py - r * 0.55, r * 0.85, -2.2, -1.2); ctx.stroke();
      // nom
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText(P.name, x, py - r * 1.9);
      ctx.shadowBlur = 0;
      // badge danger si non protégé
      if (pl.hazard !== 'none' && shieldRef.current < 40) {
        ctx.font = '16px serif';
        ctx.fillText('⚠️', x, py - r * 2.5);
      }
      ctx.restore();
    };

    const groundShadowY = () => {
      // distance au sol pour une ombre plus petite en l'air
      const hgt = posRef.current.y;
      return Math.max(0, 8 - hgt * 0.05);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentPlanet]);

  // ---------- Souris / tactile pour construire ----------
  const screenToWorld = (clientX: number): number => {
    const wrap = wrapRef.current;
    if (!wrap) return posRef.current.x;
    const cw = wrap.clientWidth;
    const viewW = Math.min(900, cw);
    const scale = cw / viewW;
    const cam = camRef.current;
    return cam - viewW / 2 + (clientX - wrap.getBoundingClientRect().left) / scale;
  };

  const canPlaceAt = (worldX: number): boolean => {
    const p = playerRef.current;
    const order: BuildingType[] = ['dome', 'shield', 'oxygen', 'solar', 'tent', 'rocket'];
    const t = order.find((k) => p.inventory[k] > 0);
    if (!t) return false;
    const def = buildingDef(t);
    const col = colonyOf(p.currentPlanet);
    return !col.buildings.some((b) => Math.abs(b.x - worldX) < (def.width + buildingDef(b.type).width) / 2 + 16);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (modeRef.current !== 'build') return;
    const x = screenToWorld(e.clientX);
    ghostRef.current = { x, ok: canPlaceAt(x) };
  };
  const handleClick = (e: React.MouseEvent) => {
    if (mode !== 'build') return;
    const x = screenToWorld(e.clientX);
    if (!canPlaceAt(x)) { showToast('Trop près d’un autre bâtiment !'); return; }
    placeSelected(x);
    ghostRef.current = null;
  };

  // Boutons tactiles
  const press = (key: string, v: boolean) => { if (v) keysRef.current.add(key); else keysRef.current.delete(key); };

  const ownedToPlace = BUILDINGS.filter((b) => player.inventory[b.type] > 0 && !b.special);
  const rockets = player.inventory.rocket;
  const undiscovered = player.discovered.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center">
      {/* Barre supérieure */}
      <header className="w-full max-w-5xl px-3 py-2 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="rounded-lg bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-sm font-bold">🌌 Système solaire</button>
          <span className="font-extrabold text-lg bg-gradient-to-r from-yellow-300 via-orange-400 to-cyan-300 bg-clip-text text-transparent hidden sm:inline">Cosmic Colony</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="rounded-full bg-gray-800 px-3 py-1">{planet.emoji} {planet.name}</span>
          <span className="rounded-full bg-indigo-900/70 px-3 py-1">💎 {player.totalCrystals}</span>
          <span className="rounded-full bg-emerald-900/70 px-3 py-1">🪐 {undiscovered}/9</span>
          <span className="rounded-full bg-purple-900/70 px-3 py-1">🚀 ×{rockets}</span>
        </div>
      </header>

      {/* Bandeau info planète */}
      <div className="w-full max-w-5xl px-3">
        <div className="rounded-xl bg-gray-900/80 border border-gray-800 px-3 py-1.5 text-xs sm:text-sm text-cyan-100 flex items-center gap-2 overflow-hidden">
          <span className="text-base shrink-0">{planet.emoji}</span>
          <span className="truncate">{planet.facts[factIdx]}</span>
        </div>
      </div>

      {/* Monde du jeu */}
      <div ref={wrapRef} className="relative mt-2 w-full max-w-5xl px-2 select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => { ghostRef.current = null; }}
        onClick={handleClick}>
        <canvas ref={canvasRef} className={`w-full rounded-2xl border border-gray-800 ${mode === 'build' ? 'cursor-crosshair' : 'cursor-grab'}`} style={{ height: VIEW_H }} />

        {/* Jauges */}
        <div className="absolute left-4 top-3 flex flex-col gap-1.5 w-36 pointer-events-none">
          <div className="text-[10px] font-bold text-purple-200">🛡️ Protection</div>
          <div className="h-2.5 rounded-full bg-gray-800/80 overflow-hidden"><div className={`h-full transition-all ${shieldUI > 40 ? 'bg-purple-400' : 'bg-red-500'}`} style={{ width: `${shieldUI}%` }} /></div>
          <div className="text-[10px] font-bold text-cyan-200">🫧 Oxygène</div>
          <div className="h-2.5 rounded-full bg-gray-800/80 overflow-hidden"><div className={`h-full transition-all ${o2UI > 40 ? 'bg-cyan-400' : 'bg-red-500'}`} style={{ width: `${o2UI}%` }} /></div>
        </div>

        {/* Contrôles tactiles */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <TouchBtn label="◀" onDown={() => press('arrowleft', true)} onUp={() => press('arrowleft', false)} />
          <TouchBtn label="▶" onDown={() => press('arrowright', true)} onUp={() => press('arrowright', false)} />
        </div>
        <div className="absolute bottom-3 right-3">
          <TouchBtn label="⬆️" big onDown={() => press(' ', true)} onUp={() => press(' ', false)} />
        </div>

        {msg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/80 border border-yellow-400/50 px-4 py-2 text-sm font-bold text-yellow-200 text-center max-w-[90%]">
            {msg}
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="w-full max-w-5xl px-3 mt-3 flex gap-2">
        <TabBtn active={mode === 'explore'} onClick={() => setMode('explore')} label="🚶 Explorer" />
        <TabBtn active={mode === 'build'} onClick={() => setMode('build')} label="🏗️ Construire" />
        <button onClick={() => setTravelOpen(true)} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 px-3 py-2.5 text-sm font-extrabold">
          🚀 Voyager {rockets > 0 ? `(×${rockets})` : '(fusée requise)'}
        </button>
      </div>

      {/* Panneau construire */}
      {mode === 'build' && (
        <div className="w-full max-w-5xl px-3 mt-2 pb-4 grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-3">
            <h3 className="font-extrabold mb-1 text-yellow-300">🛒 Boutique — clique pour acheter</h3>
            <p className="text-xs text-gray-400 mb-2">💎 Tu as {player.totalCrystals} cristaux. Ramasse ceux qui apparaissent sur le sol en marchant dessus !</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BUILDINGS.map((b) => {
                const alreadyRocket = b.special && colonyOf(player.currentPlanet).buildings.some((x) => x.type === 'rocket');
                const afford = player.totalCrystals >= b.cost && !alreadyRocket;
                return (
                  <button key={b.type} disabled={!afford} onClick={() => buyBuilding(b.type)}
                    className={`text-left rounded-xl p-2.5 border transition ${afford ? 'bg-gray-800 border-gray-700 hover:border-yellow-400 hover:bg-gray-700' : 'bg-gray-900 border-gray-800 opacity-45 cursor-not-allowed'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{b.emoji} {b.name}</span>
                      <span className="text-xs font-extrabold text-yellow-300">{alreadyRocket ? '✔ construite' : `💎 ${b.cost}`}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{b.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-3">
            <h3 className="font-extrabold mb-1 text-emerald-300">📦 À placer — clique sur le sol du monde</h3>
            {ownedToPlace.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun objet dans ton inventaire. Achète quelque chose à gauche, puis clique à l’endroit voulu dans le monde ci-dessus ! 🌍</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ownedToPlace.map((b) => (
                  <span key={b.type} className="rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-sm font-bold">{b.emoji} {b.name} ×{player.inventory[b.type]}</span>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs text-gray-400 leading-relaxed">
              💡 <b>Conseils :</b><br />
              • 🫧 Usine à Oxygène = air respirable autour d’elle.<br />
              • 🛡️ Bouclier = protège contre chaleur/froid/vents/pression.<br />
              • 🏙️ Dôme = protection totale (seul moyen de vivre sur le ☀️ Soleil !).<br />
              • 🔆 Panneau Solaire = +1 💎 / 8 s. • ⛺ Abri = joli chez-toi.
            </div>
          </div>
        </div>
      )}

      {mode === 'explore' && (
        <div className="w-full max-w-5xl px-3 mt-2 pb-4 text-center text-xs sm:text-sm text-gray-400">
          Déplace-toi avec <b className="text-white">← →</b> (ou Q/D), saute avec <b className="text-white">Espace</b> ↑. Sur <b className="text-white">Terre 🌍</b> tu peux respirer sans aide — ailleurs, reste près de tes 🫧 et 🛡️ !
        </div>
      )}

      {/* Modale voyage */}
      {travelOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setTravelOpen(false)}>
          <div className="rounded-2xl bg-gray-900 border border-indigo-500/40 p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-extrabold text-lg mb-1">🚀 Destination ?</h3>
            <p className="text-xs text-gray-400 mb-3">Chaque voyage consomme 1 fusée. {rockets === 0 && 'Construis-en une dans l’onglet 🏗️ Construire !'}</p>
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {TRAVEL_ORDER.map((pid) => {
                const pl = PLANETS[pid];
                const here = pid === player.currentPlanet;
                const known = player.discovered.includes(pid);
                return (
                  <button key={pid} disabled={here || rockets <= 0} onClick={() => travelTo(pid)}
                    className={`rounded-xl p-2 border text-center transition ${here ? 'bg-indigo-900/60 border-indigo-400' : rockets > 0 ? 'bg-gray-800 border-gray-700 hover:border-cyan-400' : 'bg-gray-900 border-gray-800 opacity-40'}`}>
                    <div className="text-2xl">{pl.emoji}</div>
                    <div className="text-xs font-bold mt-1">{pl.name}</div>
                    <div className="text-[10px] text-gray-400">{here ? '📍 Ici' : known ? 'Déjà visitée' : '❓ Inconnue'}</div>
                  </button>
                );
              })}
            </div>
            <button className="mt-3 w-full rounded-xl bg-gray-800 hover:bg-gray-700 py-2 text-sm font-bold" onClick={() => setTravelOpen(false)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TouchBtn({ label, onDown, onUp, big }: { label: string; onDown: () => void; onUp: () => void; big?: boolean }) {
  return (
    <button
      className={`rounded-xl bg-white/15 backdrop-blur border border-white/25 active:bg-white/35 font-extrabold text-white ${big ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-lg'}`}
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >{label}</button>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${active ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black' : 'bg-gray-800 hover:bg-gray-700'}`}>
      {label}
    </button>
  );
}
