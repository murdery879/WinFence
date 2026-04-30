import React from 'react';

interface Node {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  icon?: string;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
  color?: string;
  dashed?: boolean;
}

const nodes: Node[] = [
  // OS Layer
  { id: 'progman',  label: 'Progman',        sublabel: 'Shell Root HWND',       color: '#374151', x: 20,  y: 20,  w: 150, h: 52, icon: '🖥' },
  { id: 'workerw',  label: 'WorkerW',         sublabel: 'Video Wallpaper HWND',  color: '#374151', x: 200, y: 20,  w: 150, h: 52, icon: '🖥' },
  { id: 'listview', label: 'SysListView32',   sublabel: 'Desktop Icon Store',    color: '#1e3a5f', x: 110, y: 110, w: 165, h: 52, icon: '📋' },

  // WinFence Core
  { id: 'app',      label: 'Application',     sublabel: 'COM + DX11 + Loop',     color: '#4c1d95', x: 360, y: 20,  w: 160, h: 52, icon: '⚙' },
  { id: 'fmgr',     label: 'FenceManager',    sublabel: 'CRUD + Z-order',        color: '#5b21b6', x: 360, y: 120, w: 160, h: 52, icon: '📦' },
  { id: 'fwnd',     label: 'FenceWindow',     sublabel: 'ImGui + DX11 Window',   color: '#6d28d9', x: 360, y: 220, w: 160, h: 52, icon: '🪟' },
  { id: 'iconmgr',  label: 'IconManager',     sublabel: 'Capture / Release',     color: '#7c3aed', x: 560, y: 120, w: 160, h: 52, icon: '🔲' },
  { id: 'persist',  label: 'PersistenceMgr',  sublabel: 'fences.json (atomic)',  color: '#4338ca', x: 560, y: 220, w: 160, h: 52, icon: '💾' },

  // Shell Hook
  { id: 'hook',     label: 'ShellHook',       sublabel: '3-layer detection',     color: '#065f46', x: 560, y: 20,  w: 160, h: 52, icon: '🪝' },
  { id: 'winevent', label: 'WinEventHook',    sublabel: 'EVENT_OBJECT_LOCATION', color: '#047857', x: 750, y: 20,  w: 175, h: 52, icon: '📡' },
  { id: 'remotevm', label: 'ReadProcessMem',  sublabel: 'LVM_GETITEMPOSITION',   color: '#047857', x: 750, y: 110, w: 175, h: 52, icon: '🔬' },
  { id: 'polling',  label: 'Polling Thread',  sublabel: 'Fallback (250ms)',      color: '#065f46', x: 750, y: 200, w: 175, h: 52, icon: '🔄' },

  // UI
  { id: 'tray',     label: 'TrayIcon',        sublabel: 'Shell_NotifyIcon',      color: '#7f1d1d', x: 200, y: 310, w: 155, h: 52, icon: '🔔' },
  { id: 'dwm',      label: 'DWM / Acrylic',   sublabel: 'Blur-behind glass',     color: '#1e40af', x: 20,  y: 220, w: 155, h: 52, icon: '✨' },
];

const nodeMap = new Map(nodes.map(n => [n.id, n]));

const edges: Edge[] = [
  { from: 'progman',  to: 'listview', color: '#6b7280' },
  { from: 'workerw',  to: 'listview', color: '#6b7280' },
  { from: 'app',      to: 'fmgr',    color: '#8b5cf6' },
  { from: 'app',      to: 'hook',    color: '#8b5cf6' },
  { from: 'app',      to: 'persist', color: '#8b5cf6', dashed: true },
  { from: 'fmgr',     to: 'fwnd',    color: '#a78bfa' },
  { from: 'fmgr',     to: 'iconmgr', color: '#a78bfa' },
  { from: 'fwnd',     to: 'dwm',     color: '#60a5fa', label: 'DwmExtendFrame' },
  { from: 'fwnd',     to: 'persist', color: '#6366f1', dashed: true },
  { from: 'hook',     to: 'winevent',color: '#34d399' },
  { from: 'hook',     to: 'remotevm',color: '#34d399' },
  { from: 'hook',     to: 'polling', color: '#34d399', dashed: true },
  { from: 'remotevm', to: 'listview',color: '#6ee7b7', dashed: true, label: 'cross-proc' },
  { from: 'iconmgr',  to: 'listview',color: '#fbbf24', dashed: true, label: 'LVM_SETITEMPOSITION' },
  { from: 'app',      to: 'tray',    color: '#f87171' },
];

function getCenter(n: Node) {
  return { cx: n.x + n.w / 2, cy: n.y + n.h / 2 };
}

function edgePath(from: Node, to: Node) {
  const a = getCenter(from);
  const b = getCenter(to);
  const mx = (a.cx + b.cx) / 2;
  const my = (a.cy + b.cy) / 2;
  return `M ${a.cx} ${a.cy} Q ${mx} ${my} ${b.cx} ${b.cy}`;
}

export const ArchDiagram: React.FC = () => {
  const svgW = 960;
  const svgH = 400;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 bg-[#0f0f1a] p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-blue-950/20 pointer-events-none" />
      <p className="text-xs text-slate-500 font-mono mb-3 text-right">
        System Architecture — WinFence v1.0
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width={svgW}
          height={svgH}
          className="font-mono"
        >
          <defs>
            <marker id="arrowBlue"  markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#60a5fa" />
            </marker>
            <marker id="arrowGray"  markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#6b7280" />
            </marker>
            <marker id="arrowViolet" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#a78bfa" />
            </marker>
            <marker id="arrowGreen"  markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#34d399" />
            </marker>
            <marker id="arrowYellow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#fbbf24" />
            </marker>
            <marker id="arrowRed"   markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#f87171" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Section labels */}
          <text x="8" y="16" fill="#374151" fontSize="10" fontWeight="bold">OS Shell Layer</text>
          <text x="355" y="16" fill="#5b21b6" fontSize="10" fontWeight="bold">WinFence Core</text>
          <text x="743" y="16" fill="#047857" fontSize="10" fontWeight="bold">Hook System</text>

          {/* Edges */}
          {edges.map((e, i) => {
            const fromNode = nodeMap.get(e.from)!;
            const toNode   = nodeMap.get(e.to)!;
            if (!fromNode || !toNode) return null;
            const markerMap: Record<string, string> = {
              '#6b7280': 'arrowGray',
              '#8b5cf6': 'arrowViolet',
              '#a78bfa': 'arrowViolet',
              '#60a5fa': 'arrowBlue',
              '#6366f1': 'arrowViolet',
              '#34d399': 'arrowGreen',
              '#6ee7b7': 'arrowGreen',
              '#fbbf24': 'arrowYellow',
              '#f87171': 'arrowRed',
            };
            const markerId = markerMap[e.color || '#6b7280'] || 'arrowGray';
            return (
              <g key={i}>
                <path
                  d={edgePath(fromNode, toNode)}
                  stroke={e.color || '#6b7280'}
                  strokeWidth={1.5}
                  strokeDasharray={e.dashed ? '5,4' : undefined}
                  fill="none"
                  opacity={0.7}
                  markerEnd={`url(#${markerId})`}
                />
                {e.label && (() => {
                  const a = getCenter(fromNode);
                  const b = getCenter(toNode);
                  return (
                    <text
                      x={(a.cx + b.cx) / 2}
                      y={(a.cy + b.cy) / 2 - 5}
                      fill={e.color || '#9ca3af'}
                      fontSize="8"
                      textAnchor="middle"
                      opacity={0.85}
                    >
                      {e.label}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(n => (
            <g key={n.id}>
              <rect
                x={n.x} y={n.y} width={n.w} height={n.h}
                rx={8}
                fill={n.color}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
                filter="url(#glow)"
              />
              <text x={n.x + 26} y={n.y + 18} fill="white" fontSize="11" fontWeight="600">{n.label}</text>
              {n.sublabel && (
                <text x={n.x + 26} y={n.y + 33} fill="rgba(255,255,255,0.55)" fontSize="8.5">{n.sublabel}</text>
              )}
              {n.icon && (
                <text x={n.x + 8} y={n.y + 21} fontSize="12">{n.icon}</text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        {[
          { color: '#a78bfa', label: 'Core control flow' },
          { color: '#34d399', label: 'Hook system' },
          { color: '#60a5fa', label: 'DWM / Win32 API' },
          { color: '#fbbf24', label: 'Cross-process IPC' },
        ].filter(Boolean).map((item: any, i) => item && (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded" style={{ backgroundColor: item.color }} />
            <span className="text-slate-400">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#6b7280" strokeDasharray="4,3" strokeWidth="1.5"/></svg>
          <span className="text-slate-400">Async / optional</span>
        </div>
      </div>
    </div>
  );
};
