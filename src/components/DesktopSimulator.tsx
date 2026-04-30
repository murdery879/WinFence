import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Icon {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  fenceId: string | null;
}

interface Fence {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  accentColor: string;
}

const INITIAL_FENCES: Fence[] = [
  {
    id: 'f1', title: 'Development', x: 30, y: 40, w: 220, h: 180,
    color: 'rgba(109,40,217,0.38)', accentColor: '#8b5cf6',
  },
  {
    id: 'f2', title: 'Media', x: 290, y: 40, w: 190, h: 155,
    color: 'rgba(5,150,105,0.35)', accentColor: '#10b981',
  },
  {
    id: 'f3', title: 'Games', x: 30, y: 255, w: 220, h: 155,
    color: 'rgba(180,83,9,0.35)', accentColor: '#f59e0b',
  },
];

const INITIAL_ICONS: Icon[] = [
  { id: 'ic1', name: 'VS Code',    emoji: '💻', x: 20, y: 45,  fenceId: 'f1' },
  { id: 'ic2', name: 'Terminal',   emoji: '⬛', x: 85, y: 45,  fenceId: 'f1' },
  { id: 'ic3', name: 'GitHub',     emoji: '🐙', x: 150, y: 45, fenceId: 'f1' },
  { id: 'ic4', name: 'CMake',      emoji: '🔧', x: 20, y: 110, fenceId: 'f1' },
  { id: 'ic5', name: 'VLC',        emoji: '🎬', x: 20, y: 45,  fenceId: 'f2' },
  { id: 'ic6', name: 'Spotify',    emoji: '🎵', x: 85, y: 45,  fenceId: 'f2' },
  { id: 'ic7', name: 'Steam',      emoji: '🎮', x: 20, y: 45,  fenceId: 'f3' },
  { id: 'ic8', name: 'Discord',    emoji: '💬', x: 85, y: 45,  fenceId: 'f3' },
  { id: 'ic9', name: 'Recycle',    emoji: '🗑', x: 520, y: 50,  fenceId: null },
  { id: 'ic10',name: 'My PC',      emoji: '🖥', x: 520, y: 140, fenceId: null },
  { id: 'ic11',name: 'Network',    emoji: '🌐', x: 520, y: 230, fenceId: null },
];

const FENCE_COLORS = [
  { color: 'rgba(109,40,217,0.38)', accent: '#8b5cf6', name: 'Purple' },
  { color: 'rgba(5,150,105,0.35)',  accent: '#10b981', name: 'Emerald' },
  { color: 'rgba(180,83,9,0.35)',   accent: '#f59e0b', name: 'Amber' },
  { color: 'rgba(30,64,175,0.38)',  accent: '#3b82f6', name: 'Blue' },
  { color: 'rgba(157,23,77,0.38)',  accent: '#ec4899', name: 'Pink' },
];

let nextFenceId = 10;

export const DesktopSimulator: React.FC = () => {
  const [fences, setFences]     = useState<Fence[]>(INITIAL_FENCES);
  const [icons, setIcons]       = useState<Icon[]>(INITIAL_ICONS);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ type: 'fence' | 'icon'; id: string; ox: number; oy: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; ox: number; oy: number; ow: number; oh: number } | null>(null);
  const [showAddFence, setShowAddFence] = useState(false);
  const [newFenceTitle, setNewFenceTitle] = useState('');
  const [newFenceColor, setNewFenceColor] = useState(0);
  const [showGrid, setShowGrid]       = useState(false);
  const [blurEnabled, setBlurEnabled] = useState(true);
  const [log, setLog]                 = useState<string[]>(['[WinFence] Initialized.', '[ShellHook] WinEventHook installed.']);

  const containerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 12));
  }, []);

  // ── Mouse handling ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragging) {
      if (dragging.type === 'fence') {
        setFences(prev => prev.map(f =>
          f.id === dragging.id
            ? { ...f, x: Math.max(0, mx - dragging.ox), y: Math.max(0, my - dragging.oy) }
            : f
        ));
      } else {
        setIcons(prev => prev.map(ic =>
          ic.id === dragging.id
            ? { ...ic, x: mx - dragging.ox, y: my - dragging.oy, fenceId: null }
            : ic
        ));
      }
    }

    if (resizing) {
      setFences(prev => prev.map(f =>
        f.id === resizing.id
          ? {
              ...f,
              w: Math.max(140, resizing.ow + (mx - resizing.ox)),
              h: Math.max(90,  resizing.oh + (my - resizing.oy)),
            }
          : f
      ));
    }
  }, [dragging, resizing]);

  const handleMouseUp = useCallback(() => {
    if (dragging?.type === 'icon') {
      const ic = icons.find(i => i.id === dragging.id);
      if (ic) {
        // Snap to fence check
        const fenceHit = fences.find(f =>
          ic.x > f.x && ic.x < f.x + f.w &&
          ic.y > f.y && ic.y < f.y + f.h
        );
        if (fenceHit) {
          setIcons(prev => prev.map(i =>
            i.id === dragging.id ? { ...i, fenceId: fenceHit.id } : i
          ));
          addLog(`[IconManager] Captured "${ic.name}" → "${fenceHit.title}"`);
        } else {
          addLog(`[IconManager] Released "${ic.name}" to desktop`);
        }
      }
    }
    if (dragging?.type === 'fence') {
      const f = fences.find(f => f.id === dragging.id);
      if (f) addLog(`[FenceWindow] Moved "${f.title}" → (${Math.round(f.x)}, ${Math.round(f.y)})`);
    }
    if (resizing) {
      const f = fences.find(f => f.id === resizing.id);
      if (f) addLog(`[FenceWindow] Resized "${f.title}" → ${Math.round(f.w)}×${Math.round(f.h)}`);
    }
    setDragging(null);
    setResizing(null);
  }, [dragging, resizing, fences, icons, addLog]);

  const startFenceDrag = useCallback((e: React.MouseEvent, fenceId: string) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fence = fences.find(f => f.id === fenceId)!;
    setDragging({ type: 'fence', id: fenceId,
      ox: e.clientX - rect.left - fence.x,
      oy: e.clientY - rect.top  - fence.y });
    setSelected(fenceId);
  }, [fences]);

  const startIconDrag = useCallback((e: React.MouseEvent, iconId: string, absX: number, absY: number) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setIcons(prev => prev.map(i => i.id === iconId ? { ...i, x: absX, y: absY, fenceId: null } : i));
    setDragging({ type: 'icon', id: iconId, ox: mx - absX, oy: my - absY });
  }, []);

  const startResize = useCallback((e: React.MouseEvent, fenceId: string) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect  = containerRef.current.getBoundingClientRect();
    const fence = fences.find(f => f.id === fenceId)!;
    setResizing({ id: fenceId,
      ox: e.clientX - rect.left, oy: e.clientY - rect.top,
      ow: fence.w, oh: fence.h });
  }, [fences]);

  const deleteFence = useCallback((id: string) => {
    const f = fences.find(f => f.id === id);
    setFences(prev => prev.filter(f => f.id !== id));
    setIcons(prev => prev.map(i => i.fenceId === id ? { ...i, fenceId: null, x: 520, y: 50 } : i));
    addLog(`[FenceManager] Destroyed fence "${f?.title}"`);
  }, [fences, addLog]);

  const addFence = useCallback(() => {
    const scheme = FENCE_COLORS[newFenceColor];
    const id = `f${nextFenceId++}`;
    setFences(prev => [...prev, {
      id, title: newFenceTitle || 'New Fence',
      x: 80 + Math.random() * 120,
      y: 80 + Math.random() * 80,
      w: 200, h: 160,
      color: scheme.color,
      accentColor: scheme.accent,
    }]);
    addLog(`[FenceManager] Created fence "${newFenceTitle || 'New Fence'}"`);
    setShowAddFence(false);
    setNewFenceTitle('');
  }, [newFenceTitle, newFenceColor, addLog]);

  // Render icons belonging to a fence
  const renderFenceIcons = (fence: Fence) => {
    const fenceIcons = icons.filter(i => i.fenceId === fence.id);
    return fenceIcons.map((icon, idx) => {
      const relX = 16 + (idx % 3) * 62;
      const relY = 34 + Math.floor(idx / 3) * 70;
      const absX = fence.x + relX;
      const absY = fence.y + relY;
      return (
        <div
          key={icon.id}
          className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
          style={{ left: relX, top: relY, width: 52 }}
          onMouseDown={(e) => startIconDrag(e, icon.id, absX, absY)}
        >
          <div className="text-2xl drop-shadow-lg">{icon.emoji}</div>
          <span className="text-[9px] text-white/80 text-center leading-tight mt-0.5 max-w-[52px] truncate drop-shadow">
            {icon.name}
          </span>
        </div>
      );
    });
  };

  // Floating (non-fenced) icons
  const floatingIcons = icons.filter(i => i.fenceId === null);

  return (
    <div className="select-none rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
      {/* Taskbar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1a1a2e]/95 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-violet-400 font-bold font-mono">WinFence MVP</span>
          <span className="text-xs text-slate-500">Interactive Simulator</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowGrid(g => !g); addLog(`[Settings] Grid ${!showGrid ? 'enabled' : 'disabled'}`); }}
            className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${showGrid ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Grid
          </button>
          <button
            onClick={() => { setBlurEnabled(b => !b); addLog(`[Settings] Blur ${!blurEnabled ? 'enabled' : 'disabled'}`); }}
            className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${blurEnabled ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Blur
          </button>
          <button
            onClick={() => setShowAddFence(true)}
            className="text-[10px] px-2 py-0.5 rounded bg-emerald-700 text-white hover:bg-emerald-600 font-mono transition-colors"
          >
            + Fence
          </button>
        </div>
      </div>

      {/* Desktop area */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{
          height: 440,
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          cursor: dragging || resizing ? 'grabbing' : 'default',
          backgroundImage: showGrid
            ? 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%), repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(255,255,255,0.03) 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(255,255,255,0.03) 32px)'
            : undefined,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelected(null)}
      >
        {/* Fences */}
        <AnimatePresence>
          {fences.map(fence => (
            <motion.div
              key={fence.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="absolute rounded-xl overflow-hidden"
              style={{
                left: fence.x, top: fence.y,
                width: fence.w, height: fence.h,
                background: blurEnabled
                  ? fence.color
                  : fence.color.replace(/[\d.]+\)$/, '0.6)'),
                backdropFilter: blurEnabled ? 'blur(12px) saturate(180%)' : undefined,
                WebkitBackdropFilter: blurEnabled ? 'blur(12px) saturate(180%)' : undefined,
                border: `1px solid ${selected === fence.id ? fence.accentColor : 'rgba(255,255,255,0.15)'}`,
                boxShadow: selected === fence.id
                  ? `0 0 0 2px ${fence.accentColor}55, 0 8px 32px rgba(0,0,0,0.4)`
                  : '0 4px 24px rgba(0,0,0,0.35)',
                zIndex: selected === fence.id ? 10 : 5,
                userSelect: 'none',
              }}
            >
              {/* Title bar */}
              <div
                className="flex items-center justify-between px-2.5 py-1.5 cursor-grab active:cursor-grabbing"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  height: 28,
                }}
                onMouseDown={(e) => startFenceDrag(e, fence.id)}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: fence.accentColor }} />
                  <span className="text-white text-[11px] font-semibold tracking-wide">{fence.title}</span>
                </div>
                <button
                  className="text-white/40 hover:text-red-400 text-[10px] w-4 h-4 flex items-center justify-center rounded transition-colors"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); deleteFence(fence.id); }}
                >
                  ✕
                </button>
              </div>

              {/* Icon area */}
              <div className="relative" style={{ height: fence.h - 28 }}>
                {renderFenceIcons(fence)}
              </div>

              {/* Resize handle */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                style={{ zIndex: 20 }}
                onMouseDown={(e) => startResize(e, fence.id)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" className="absolute bottom-1 right-1 opacity-40">
                  <line x1="2" y1="14" x2="14" y2="2" stroke="white" strokeWidth="1.5"/>
                  <line x1="7" y1="14" x2="14" y2="7" stroke="white" strokeWidth="1.5"/>
                </svg>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating icons */}
        {floatingIcons.map(icon => (
          <div
            key={icon.id}
            className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
            style={{ left: icon.x, top: icon.y, width: 52, zIndex: 20 }}
            onMouseDown={(e) => startIconDrag(e, icon.id, icon.x, icon.y)}
          >
            <div className="text-2xl drop-shadow-lg">{icon.emoji}</div>
            <span className="text-[9px] text-white/80 text-center leading-tight mt-0.5 max-w-[52px] truncate drop-shadow">
              {icon.name}
            </span>
          </div>
        ))}

        {/* Add fence modal */}
        <AnimatePresence>
          {showAddFence && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center z-50"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowAddFence(false)}
            >
              <div
                className="bg-[#1e1e3a] border border-slate-600 rounded-xl p-5 w-72 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-white font-semibold mb-3 text-sm">Create New Fence</h3>
                <input
                  autoFocus
                  className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-violet-500 mb-3"
                  placeholder="Fence title…"
                  value={newFenceTitle}
                  onChange={(e) => setNewFenceTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFence()}
                />
                <div className="flex gap-2 mb-4">
                  {FENCE_COLORS.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setNewFenceColor(i)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${newFenceColor === i ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: c.accent }}
                      title={c.name}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addFence}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm py-2 rounded-lg font-medium transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowAddFence(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Debug log */}
      <div className="bg-[#0a0a14] border-t border-slate-800 px-3 py-2" style={{ height: 90 }}>
        <p className="text-[9px] text-slate-500 font-mono mb-1">WinFence Debug Console</p>
        <div className="overflow-y-auto" style={{ maxHeight: 64 }}>
          {log.map((line, i) => (
            <p key={i} className={`text-[9px] font-mono leading-relaxed ${i === 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};
