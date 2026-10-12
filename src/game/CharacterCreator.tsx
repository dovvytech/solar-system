import { useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { PlayerState } from './types';

// Réduit une photo côté client (max 256x256) → dataURL JPEG léger pour localStorage
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image'));
      img.onload = () => {
        const max = 256;
        const ratio = Math.min(max / img.width, max / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function CharacterCreator({
  saved, onStart, onReset,
}: {
  saved: PlayerState | null;
  onStart: (name: string, photo: string | null) => void;
  onReset: () => void;
}) {
  const [name, setName] = useState(saved?.name ?? '');
  const [photo, setPhoto] = useState<string | null>(saved?.photo ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = await resizeImage(f);
      setPhoto(data);
    } catch {
      // ignore fichiers invalides
    }
  };

  const start = () => {
    const n = name.trim() || 'Astronaute';
    onStart(n, photo);
    confetti({ particleCount: 140, spread: 100, origin: { y: 0.6 }, colors: ['#ffe066', '#7dffd4', '#a78bfa', '#ffffff'] });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* décor étoiles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="absolute rounded-full bg-white animate-pulse" style={{
            left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`,
            width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, opacity: 0.2 + (i % 5) * 0.15,
            animationDelay: `${(i % 7) * 0.4}s`,
          }} />
        ))}
      </div>

      <div className="relative w-full max-w-lg rounded-3xl bg-gray-900/90 border border-indigo-500/30 shadow-[0_0_60px_rgba(99,102,241,0.25)] p-6 sm:p-8">
        <h1 className="text-center text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-cyan-300 bg-clip-text text-transparent">
          🚀 Cosmic Colony
        </h1>
        <p className="text-center text-gray-400 mt-2 text-sm">
          Découvre les <b className="text-white">9 corps du système solaire</b> — même le <b className="text-yellow-300">Soleil ☀️</b> !
          Construis des <b className="text-white">abris, dômes, usines à oxygène</b>… et deviens le personnage du jeu avec ta photo ! 📸
        </p>

        {/* Avatar */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button onClick={() => fileRef.current?.click()}
            className="group relative rounded-full w-28 h-28 border-4 border-dashed border-indigo-400/60 hover:border-cyan-300 overflow-hidden bg-gray-800 transition">
            {photo ? (
              <img src={photo} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-cyan-200">
                <span className="text-3xl">🧑‍🚀</span>
                <span className="text-[10px] font-bold mt-1">Ajouter<br />une photo</span>
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          {photo && (
            <button onClick={() => setPhoto(null)} className="text-xs text-red-300 hover:text-red-200 font-bold">✖ Enlever la photo</button>
          )}
          <p className="text-[11px] text-gray-500 text-center max-w-xs">
            Ta photo reste sur cet appareil (aucun envoi sur internet). Elle remplace le visage de ton astronaute dans le jeu !
          </p>
        </div>

        {/* Nom */}
        <label className="block mt-5 text-sm font-bold text-indigo-200">Nom de l’astronaute</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder="Ex : Léo le Cosmos"
          className="mt-1 w-full rounded-xl bg-gray-800 border border-gray-700 focus:border-cyan-400 outline-none px-4 py-2.5 text-white placeholder:text-gray-500" />

        <button onClick={start}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:brightness-110 active:scale-[0.98] transition py-3.5 text-lg font-extrabold shadow-lg shadow-indigo-900/50">
          {saved ? '▶ Continuer la partie' : '🌍 Commencer l’aventure'}
        </button>

        {saved && (
          <button onClick={onReset} className="mt-2 w-full rounded-xl bg-gray-800 hover:bg-gray-700 py-2 text-xs font-bold text-gray-400">
            🗑️ Nouvelle partie (efface la sauvegarde)
          </button>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-gray-400">
          <div className="rounded-xl bg-gray-800/60 p-2">🪐<br /><b className="text-white">Explore</b><br />9 planètes + Soleil</div>
          <div className="rounded-xl bg-gray-800/60 p-2">🏗️<br /><b className="text-white">Construis</b><br />refuges & colonies</div>
          <div className="rounded-xl bg-gray-800/60 p-2">💎<br /><b className="text-white">Collecte</b><br />cristaux spatiaux</div>
        </div>
      </div>
    </div>
  );
}
