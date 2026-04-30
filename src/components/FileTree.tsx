import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode } from 'lucide-react';

interface TreeNode {
  name: string;
  type: 'dir' | 'file';
  ext?: string;
  children?: TreeNode[];
  description?: string;
  badge?: string;
  badgeColor?: string;
}

const PROJECT_TREE: TreeNode[] = [
  {
    name: 'WinFence/', type: 'dir', children: [
      {
        name: 'CMakeLists.txt', type: 'file', ext: 'cmake',
        description: 'Build system: C++20, static runtime, DWM/DX11 linkage',
        badge: 'Build', badgeColor: 'bg-orange-500/20 text-orange-400',
      },
      {
        name: 'resources/', type: 'dir', children: [
          { name: 'winfence.rc',       type: 'file', ext: 'rc',  description: 'App icon + version info resource' },
          { name: 'winfence.manifest', type: 'file', ext: 'xml', description: 'DPI awareness + UAC level' },
        ],
      },
      {
        name: 'src/', type: 'dir', children: [
          { name: 'main.cpp', type: 'file', ext: 'cpp', description: 'WinMain: COM init, single-instance mutex, Application lifecycle',
            badge: 'Entry', badgeColor: 'bg-red-500/20 text-red-400' },
          {
            name: 'common/', type: 'dir', children: [
              { name: 'Types.h',  type: 'file', ext: 'h', description: 'FenceConfig, DesktopIcon, Rect, Color – shared POD types' },
              { name: 'Logger.h', type: 'file', ext: 'h', description: 'Thread-safe file + debug output logger' },
              { name: 'Config.h', type: 'file', ext: 'h', description: 'Compile-time constants and defaults' },
            ],
          },
          {
            name: 'core/', type: 'dir', children: [
              { name: 'Application.h/.cpp',      type: 'file', ext: 'cpp', description: 'Top-level controller: DX11 device, main message loop',
                badge: 'Core', badgeColor: 'bg-violet-500/20 text-violet-400' },
              { name: 'FenceManager.h/.cpp',     type: 'file', ext: 'cpp', description: 'CRUD for FenceWindow instances, Z-order management' },
              { name: 'FenceWindow.h/.cpp',      type: 'file', ext: 'cpp', description: 'Single fence: ImGui+DX11 render, DWM blur, drag/resize',
                badge: 'UI', badgeColor: 'bg-blue-500/20 text-blue-400' },
              { name: 'IconManager.h/.cpp',      type: 'file', ext: 'cpp', description: 'Capture / release icons via LVM_SETITEMPOSITION' },
              { name: 'PersistenceManager.h',    type: 'file', ext: 'h',   description: 'Atomic JSON save/load to %APPDATA%\\WinFence',
                badge: 'JSON', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
            ],
          },
          {
            name: 'shell/', type: 'dir', children: [
              { name: 'DesktopShell.h/.cpp', type: 'file', ext: 'cpp', description: 'FindDesktopListView, WorkerW injection, Progman helpers' },
              { name: 'ShellHook.h/.cpp',    type: 'file', ext: 'cpp', description: '3-layer hook: WinEvent + ReadProcessMem + Polling',
                badge: 'Hook', badgeColor: 'bg-amber-500/20 text-amber-400' },
            ],
          },
          {
            name: 'ui/', type: 'dir', children: [
              { name: 'TrayIcon.h/.cpp',    type: 'file', ext: 'cpp', description: 'Shell_NotifyIcon, right-click context menu' },
              { name: 'ContextMenu.h/.cpp', type: 'file', ext: 'cpp', description: 'TrackPopupMenu: New Fence, Settings, Exit' },
            ],
          },
        ],
      },
      {
        name: 'vendor/', type: 'dir', children: [
          { name: 'imgui/',    type: 'dir', description: 'Dear ImGui v1.90 (vendored, statically compiled)', children: [] },
          { name: 'nlohmann/', type: 'dir', description: 'nlohmann/json v3.11 (header-only)', children: [] },
        ],
      },
    ],
  },
];

interface NodeProps {
  node: TreeNode;
  depth: number;
}

const TreeNodeComponent: React.FC<NodeProps> = ({ node, depth }) => {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === 'dir';

  const extColor: Record<string, string> = {
    cpp: 'text-blue-400', h: 'text-violet-400',
    cmake: 'text-orange-400', rc: 'text-yellow-400',
    xml: 'text-emerald-400', json: 'text-amber-400',
  };

  return (
    <div>
      <div
        className={`flex items-start gap-1.5 py-0.5 px-2 rounded cursor-pointer group
                    hover:bg-slate-800/60 transition-colors`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => isDir && setOpen(o => !o)}
      >
        {/* Expand arrow */}
        <div className="mt-0.5 w-3 shrink-0 text-slate-600">
          {isDir && (open
            ? <ChevronDown size={11} className="text-slate-400" />
            : <ChevronRight size={11} />)}
        </div>

        {/* Icon */}
        <div className="mt-0.5 shrink-0">
          {isDir
            ? open
              ? <FolderOpen size={13} className="text-yellow-400" />
              : <Folder      size={13} className="text-yellow-500" />
            : <FileCode size={13} className={extColor[node.ext || ''] || 'text-slate-400'} />}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-mono leading-relaxed ${isDir ? 'text-slate-300 font-medium' : extColor[node.ext || ''] || 'text-slate-400'}`}>
              {node.name}
            </span>
            {node.badge && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${node.badgeColor}`}>
                {node.badge}
              </span>
            )}
          </div>
          {node.description && (
            <p className="text-[10px] text-slate-600 group-hover:text-slate-500 transition-colors leading-tight">
              {node.description}
            </p>
          )}
        </div>
      </div>

      {isDir && open && node.children?.map((child, i) => (
        <TreeNodeComponent key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

export const FileTree: React.FC = () => (
  <div className="rounded-xl border border-slate-700/60 bg-[#0f0f1a] overflow-hidden">
    <div className="px-4 py-2.5 border-b border-slate-700/50 bg-[#181825] flex items-center gap-2">
      <Folder size={13} className="text-yellow-400" />
      <span className="text-xs font-mono text-slate-400">Project Structure</span>
    </div>
    <div className="py-2">
      {PROJECT_TREE.map((node, i) => (
        <TreeNodeComponent key={i} node={node} depth={0} />
      ))}
    </div>
  </div>
);
