import { useState } from 'react';
import {
  Cpu, BookOpen, Code2, Network, Layers, Wrench,
  ChevronRight, ExternalLink, Zap, Shield, Box
} from 'lucide-react';

import { CodeBlock } from './components/CodeBlock';
import { ArchDiagram } from './components/ArchDiagram';
import { DesktopSimulator } from './components/DesktopSimulator';
import { FileTree } from './components/FileTree';
import { HookMechanismDiagram } from './components/HookMechanismDiagram';
import { BuildGuide } from './components/BuildGuide';
import { SectionHeader } from './components/SectionHeader';
import { codeSnippets } from './data/codeSnippets';

// ─── Navigation ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',    label: 'Overview',      icon: BookOpen },
  { id: 'simulator',  label: 'Live MVP',       icon: Layers },
  { id: 'arch',       label: 'Architecture',   icon: Network },
  { id: 'hook',       label: 'Shell Hook',     icon: Cpu },
  { id: 'code',       label: 'Source Code',    icon: Code2 },
  { id: 'build',      label: 'Build Guide',    icon: Wrench },
];

// ─── Code tabs ────────────────────────────────────────────────────────────────
const CODE_TABS = [
  { key: 'cmakeLists',      label: 'CMakeLists.txt',          lang: 'cmake',  file: 'CMakeLists.txt' },
  { key: 'typesHeader',     label: 'Types.h',                 lang: 'cpp',    file: 'src/common/Types.h' },
  { key: 'applicationHeader', label: 'Application.h',         lang: 'cpp',    file: 'src/core/Application.h' },
  { key: 'fenceWindowHeader', label: 'FenceWindow.h',         lang: 'cpp',    file: 'src/core/FenceWindow.h' },
  { key: 'fenceWindowImpl',   label: 'FenceWindow.cpp',       lang: 'cpp',    file: 'src/core/FenceWindow.cpp' },
  { key: 'shellHookHeader',   label: 'ShellHook.h',           lang: 'cpp',    file: 'src/shell/ShellHook.h' },
  { key: 'shellHookImpl',     label: 'ShellHook.cpp',         lang: 'cpp',    file: 'src/shell/ShellHook.cpp' },
  { key: 'persistenceManager', label: 'PersistenceMgr.h',    lang: 'cpp',    file: 'src/core/PersistenceManager.h' },
  { key: 'mainEntry',          label: 'main.cpp',             lang: 'cpp',    file: 'src/main.cpp' },
];

// ─── Feature cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🪟', title: 'Transparent Containers',
    desc: 'Semi-transparent, blur-behind fences using DwmExtendFrameIntoClientArea and SetWindowCompositionAttribute (Acrylic).',
    badge: 'DWM', color: '#60a5fa',
  },
  {
    icon: '📡', title: '3-Layer Icon Hook',
    desc: 'WinEventHook (EVENT_OBJECT_LOCATIONCHANGE) + cross-process LVM_GETITEMPOSITION + polling fallback for 100% reliability.',
    badge: 'Win32', color: '#34d399',
  },
  {
    icon: '💾', title: 'Atomic JSON Persistence',
    desc: 'All fence positions, titles, colors, and captured icons saved to %APPDATA%\\WinFence\\fences.json atomically (write-rename).',
    badge: 'JSON', color: '#fbbf24',
  },
  {
    icon: '🖱', title: 'Drag & Resize',
    desc: 'WS_EX_NOACTIVATE fences capture WM_NCHITTEST for drag, resize handles via custom hit-testing in ImGui/DX11 overlay.',
    badge: 'ImGui', color: '#a78bfa',
  },
  {
    icon: '⚡', title: '< 8MB RAM, < 0.2% CPU',
    desc: 'Render only on WM_PAINT/change, VSync via DXGI Present(1, 0), polling thread sleeps 250ms between checks.',
    badge: 'Perf', color: '#f87171',
  },
  {
    icon: '🔒', title: 'Standalone .exe',
    desc: 'MSVC static runtime (/MT), vendored ImGui, header-only nlohmann/json. Zero redistributables required.',
    badge: 'Dist', color: '#fb923c',
  },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [activeCodeTab, setActiveCodeTab] = useState(0);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#080812] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Ambient background ──────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07]"
             style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.05]"
             style={{ background: 'radial-gradient(circle, #2563eb, transparent)' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-[0.04]"
             style={{ background: 'radial-gradient(circle, #059669, transparent)' }} />
      </div>

      {/* ── Sticky nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/80"
           style={{ background: 'rgba(8,8,18,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm shadow-lg">
              🪟
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">WinFence</span>
              <span className="text-slate-600 text-xs ml-1.5 font-mono hidden sm:inline">v1.0 MVP</span>
            </div>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === item.id
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <item.icon size={12} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Right badge */}
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">C++20</span>
            <span className="px-2 py-1 rounded bg-violet-900/50 text-violet-400 border border-violet-800/50">Win32</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 space-y-32">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section id="overview">
          <div className="text-center mb-16 pt-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-mono mb-6">
              <Zap size={11} />
              Technical Architecture & MVP — Windows Desktop Organizer
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-tight">
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                WinFence
              </span>
              <br />
              <span className="text-slate-300 text-3xl md:text-5xl font-bold">Desktop Organizer</span>
            </h1>

            <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
              A lightweight C++ clone of <em className="text-violet-400">Stardock Fences</em>.
              Semi-transparent, blur-behind containers for desktop icons, built with
              Win32 API + Dear ImGui + DirectX 11. Fully standalone <code className="font-mono text-violet-300 bg-violet-900/30 px-1 rounded">.exe</code>,
              no runtime dependencies.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => scrollTo('simulator')}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-violet-900/30"
              >
                Try the Simulator <ChevronRight size={14} />
              </button>
              <button
                onClick={() => scrollTo('code')}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-sm transition-colors border border-slate-700"
              >
                <Code2 size={14} /> View Source Code
              </button>
            </div>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i}
                   className="group p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ color: f.color, background: `${f.color}18` }}>
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1.5 text-sm">{f.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed group-hover:text-slate-400 transition-colors">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Tech stack pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'C++20', color: '#60a5fa' },
              { label: 'Win32 API', color: '#a78bfa' },
              { label: 'Dear ImGui', color: '#34d399' },
              { label: 'DirectX 11', color: '#f59e0b' },
              { label: 'DWM / Acrylic', color: '#60a5fa' },
              { label: 'nlohmann/json', color: '#fb923c' },
              { label: 'CMake 3.20', color: '#f87171' },
              { label: 'MSVC Static', color: '#c084fc' },
              { label: 'SetWinEventHook', color: '#34d399' },
              { label: 'ReadProcessMemory', color: '#fbbf24' },
            ].map(t => (
              <span key={t.label}
                    className="px-2.5 py-1 rounded-full text-[10px] font-mono border"
                    style={{ color: t.color, borderColor: `${t.color}30`, background: `${t.color}10` }}>
                {t.label}
              </span>
            ))}
          </div>
        </section>

        {/* ── LIVE MVP SIMULATOR ───────────────────────────────────────────── */}
        <section id="simulator">
          <SectionHeader
            icon={Layers}
            label="Interactive MVP"
            title="Live Desktop Simulator"
            description="Drag fences, resize them, drag icons between fences and the desktop. Watch the debug console for real-time event output — mimicking what the C++ application's ShellHook and FenceManager would emit."
            accent="from-emerald-500 to-teal-500"
          />
          <DesktopSimulator />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: '🖱', tip: 'Drag the fence title bar to move it anywhere on the desktop.' },
              { icon: '↔', tip: 'Drag the ↘ resize handle (bottom-right corner) to resize a fence.' },
              { icon: '🎯', tip: 'Drag any icon onto a fence to "capture" it — drop outside to release.' },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-500">
                <span className="text-base">{t.icon}</span>
                {t.tip}
              </div>
            ))}
          </div>
        </section>

        {/* ── ARCHITECTURE ─────────────────────────────────────────────────── */}
        <section id="arch">
          <SectionHeader
            icon={Network}
            label="System Design"
            title="Application Architecture"
            description="WinFence is split into four layers: OS Shell integration, core application logic, the hook system for icon monitoring, and the UI/persistence layer. Each module has a single responsibility."
            accent="from-blue-500 to-cyan-500"
          />
          <ArchDiagram />

          {/* Module descriptions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Application (main controller)',
                color: '#7c3aed',
                items: [
                  'Owns the shared DirectX 11 device (ID3D11Device)',
                  'Single-instance guard via named Win32 Mutex',
                  'Auto-save timer (30s interval, atomic JSON write)',
                  'Manages the hidden HWND for global message routing',
                ],
              },
              {
                title: 'FenceWindow (per-fence rendering)',
                color: '#2563eb',
                items: [
                  'WS_EX_LAYERED | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW',
                  'Per-window ImGui context + DXGI SwapChain',
                  'DwmExtendFrameIntoClientArea({-1}) = full glass',
                  'SetWindowCompositionAttribute for Acrylic blur',
                ],
              },
              {
                title: 'ShellHook (icon detection)',
                color: '#059669',
                items: [
                  'Layer 1: SetWinEventHook (out-of-context, no DLL)',
                  'Layer 2: VirtualAllocEx → LVM_GETITEMPOSITION → ReadProcessMemory',
                  'Layer 3: 250ms polling thread (fallback / auto-arrange)',
                  'FindDesktopListView: Progman + WorkerW path search',
                ],
              },
              {
                title: 'PersistenceManager (JSON storage)',
                color: '#d97706',
                items: [
                  'Location: %APPDATA%\\WinFence\\fences.json',
                  'Atomic write: fences.json.tmp → rename',
                  'nlohmann/json (header-only, zero dependencies)',
                  'Versioned schema (v1) for forward compatibility',
                ],
              },
            ].map((mod, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-700/50 bg-slate-900/60">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: mod.color }} />
                  <h4 className="text-sm font-semibold text-white">{mod.title}</h4>
                </div>
                <ul className="space-y-1.5">
                  {mod.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                      <ChevronRight size={10} className="mt-0.5 shrink-0 text-slate-600" />
                      <code className="font-mono text-[10px] leading-relaxed">{item}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── SHELL HOOK DEEP-DIVE ─────────────────────────────────────────── */}
        <section id="hook">
          <SectionHeader
            icon={Cpu}
            label="Hook Mechanism"
            title="3-Layer Icon Detection System"
            description="Detecting when the user moves a desktop icon requires a multi-layer approach. WinFence uses WinEventHook as the primary signal, cross-process memory reads for position data, and a polling thread as a reliable fallback."
            accent="from-emerald-500 to-green-500"
          />
          <HookMechanismDiagram />

          {/* Z-order explanation */}
          <div className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Box size={16} className="text-blue-400" />
              Window Z-Order: How Fences Sit Between Wallpaper and Icons
            </h3>
            <div className="space-y-2">
              {[
                { label: 'HWND_TOP — App windows, dialog boxes',          z: 'Z: ∞',  color: '#6b7280', w: '100%'  },
                { label: 'Shell_TrayWnd — Taskbar',                        z: 'Z: 4',  color: '#f59e0b', w: '85%'   },
                { label: 'SHELLDLL_DefView / SysListView32 — Desktop icons',z: 'Z: 3', color: '#34d399', w: '70%'   },
                { label: '◄── FenceWindow lives here (WS_EX_NOACTIVATE)', z: 'Z: 2',  color: '#8b5cf6', w: '55%', highlight: true },
                { label: 'WorkerW — Live wallpaper layer',                 z: 'Z: 1',  color: '#3b82f6', w: '40%'   },
                { label: 'Progman — Static wallpaper',                     z: 'Z: 0',  color: '#374151', w: '25%'   },
              ].map((layer, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${layer.highlight ? 'bg-violet-900/30 border border-violet-500/30' : ''}`}>
                  <div className="text-[10px] font-mono text-slate-500 w-8 text-right shrink-0">{layer.z}</div>
                  <div className="flex-1 h-6 rounded-md flex items-center px-2"
                       style={{ background: `${layer.color}22`, border: `1px solid ${layer.color}40`, width: layer.w }}>
                    <span className="text-[10px] font-mono truncate" style={{ color: layer.color }}>
                      {layer.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              <Shield size={10} className="inline mr-1 text-violet-400" />
              Fences use <code className="font-mono text-violet-300 bg-violet-900/20 px-1 rounded">SetWindowPos(hwnd, HWND_BOTTOM, ...)</code> after
              sending <code className="font-mono bg-slate-800 px-1 rounded">WM_SPAWN_WORKER</code> to Progman
              to insert the WorkerW layer, then re-parent the fence window above WorkerW but below the desktop ListView.
            </p>
          </div>
        </section>

        {/* ── SOURCE CODE ──────────────────────────────────────────────────── */}
        <section id="code">
          <SectionHeader
            icon={Code2}
            label="Full Source Code"
            title="Production-Grade C++20 Implementation"
            description="Complete, compilable source code for all core modules. Organized with header/source separation, modern C++20 features (concepts, std::span, std::format), and full Win32 API integration."
            accent="from-violet-500 to-purple-500"
          />

          {/* File tree */}
          <div className="mb-6">
            <FileTree />
          </div>

          {/* Tab selector */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {CODE_TABS.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => setActiveCodeTab(i)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                  activeCodeTab === i
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code block */}
          <CodeBlock
            code={codeSnippets[CODE_TABS[activeCodeTab].key as keyof typeof codeSnippets]}
            language={CODE_TABS[activeCodeTab].lang}
            filename={CODE_TABS[activeCodeTab].file}
            maxHeight="600px"
          />

          {/* Implementation notes */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: '🏗',
                title: 'WM_SPAWN_WORKER Trick',
                desc: 'To inject a window behind desktop icons, send 0x052C to Progman. This forces explorer.exe to create a WorkerW HWND above the wallpaper. WinFence then creates its fence windows between WorkerW and the SysListView32.',
                code: `PostMessage(hProgman, 0x052C, 0, 0);
// Wait for WorkerW to appear
HWND hWorkerW = nullptr;
EnumWindows([](HWND h, LPARAM lp) {
    if (FindWindowExW(h, nullptr, L"SHELLDLL_DefView", nullptr))
        *((HWND*)lp) = FindWindowExW(nullptr, h, L"WorkerW", nullptr);
    return TRUE;
}, (LPARAM)&hWorkerW);`,
              },
              {
                icon: '🎨',
                title: 'DWM Acrylic Effect',
                desc: 'Beyond DwmExtendFrameIntoClientArea, WinFence uses the undocumented SetWindowCompositionAttribute API (available on Win10+) with ACCENT_ENABLE_BLURBEHIND to achieve the frosted-glass Acrylic look with a tinted gradient overlay.',
                code: `struct ACCENTPOLICY {
    DWORD AccentState;    // 3 = BLUR_BEHIND
    DWORD AccentFlags;
    DWORD GradientColor;  // AABBGGRR
    DWORD AnimationId;
};
// WCA_ACCENT_POLICY = attribute 19
WINCOMPATTRDATA d = {19, &policy, sizeof(policy)};
SetWindowCompositionAttribute(hwnd, &d);`,
              },
              {
                icon: '🔒',
                title: 'Click-Through Logic',
                desc: 'When a fence is in "locked" mode, WS_EX_TRANSPARENT makes mouse clicks fall through to desktop icons behind. In interactive mode, WM_NCHITTEST returns HTCLIENT for the icon area and HTCAPTION for the title bar to enable drag.',
                code: `case WM_NCHITTEST: {
    POINT pt = {LOWORD(lParam), HIWORD(lParam)};
    ScreenToClient(hwnd, &pt);
    if (IsInTitleBar(pt))   return HTCAPTION;
    if (IsInResizeCorner(pt)) return HTBOTTOMRIGHT;
    if (m_config.locked)    return HTTRANSPARENT;
    return HTCLIENT;
}`,
              },
              {
                icon: '⚡',
                title: 'VSync & Render Loop',
                desc: 'Each FenceWindow has its own DXGI SwapChain. Rendering only occurs when fences are dirty (moved, resized, or icon captured). Idle fences skip rendering entirely, limiting GPU/CPU to < 0.2% usage at steady state.',
                code: `// Only re-render if dirty
if (!m_dirty) {
    // Sleep until next paint message
    WaitMessage();
    return;
}

// Clear with alpha=0 → DWM composites blur behind
float clear[4] = {0,0,0,0};
m_pContext->ClearRenderTargetView(m_pRTV, clear);
ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());
m_pSwapChain->Present(1, 0);  // VSync
m_dirty = false;`,
              },
            ].map((note, i) => (
              <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
                  <span>{note.icon}</span>
                  <h4 className="text-sm font-semibold text-white">{note.title}</h4>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{note.desc}</p>
                  <pre className="text-[10px] font-mono text-emerald-300/80 bg-[#0a0a14] rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre">
                    {note.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BUILD GUIDE ──────────────────────────────────────────────────── */}
        <section id="build">
          <SectionHeader
            icon={Wrench}
            label="Compilation"
            title="Build Guide — MSVC + CMake"
            description="Step-by-step instructions to compile WinFence from source into a standalone, statically-linked Windows executable. Requires Visual Studio 2022 with the C++ Desktop workload."
            accent="from-amber-500 to-orange-500"
          />
          <BuildGuide />
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-800 pt-10 pb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm">
                🪟
              </div>
              <div>
                <p className="text-white font-bold text-sm">WinFence — Technical Architecture</p>
                <p className="text-slate-500 text-xs">C++20 · Win32 API · Dear ImGui · DX11 · CMake</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Shield size={11} className="text-emerald-500" />
                No telemetry · No runtime deps
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-amber-400" />
                &lt; 8MB RAM · &lt; 0.2% CPU
              </div>
              <div className="flex items-center gap-1.5">
                <ExternalLink size={11} className="text-blue-400" />
                Windows 10 2004+
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-900 text-center text-[10px] text-slate-600 font-mono">
            Architecture designed for educational purposes. WinFence is not affiliated with Stardock or Fences™.
            All Win32 API usage follows publicly documented Microsoft specifications.
          </div>
        </footer>

      </main>
    </div>
  );
}
