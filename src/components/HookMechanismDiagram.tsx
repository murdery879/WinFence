import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LAYERS = [
  {
    id: 'winevent',
    title: 'Layer 1 — WinEventHook',
    subtitle: 'EVENT_OBJECT_LOCATIONCHANGE',
    color: '#059669',
    bg: 'rgba(5,150,105,0.15)',
    border: '#065f46',
    icon: '📡',
    latency: '< 5ms',
    reliability: '92%',
    steps: [
      {
        code: `// Install out-of-context hook targeting explorer.exe PID
m_hEventHook = SetWinEventHook(
    EVENT_OBJECT_LOCATIONCHANGE,   // event to monitor
    EVENT_OBJECT_LOCATIONCHANGE,
    nullptr,                        // no DLL injection (out-of-context)
    WinEventProc,                   // static callback in OUR process
    explorerPid,                    // filter: only explorer.exe
    0,                              // all threads
    WINEVENT_OUTOFCONTEXT |
    WINEVENT_SKIPOWNPROCESS
);`,
        note: 'No DLL injection required. Runs in our process via message pump.',
      },
      {
        code: `void CALLBACK ShellHook::WinEventProc(
    HWINEVENTHOOK, DWORD event,
    HWND hwnd, LONG idObject, LONG idChild, ...)
{
    // Only care about ListView child items (icons)
    if (idObject != OBJID_CLIENT || idChild <= 0) return;
    
    HWND hLV = FindDesktopListView();
    if (hwnd != hLV) return;
    
    int iconIndex = idChild - 1;  // 1-based → 0-based
    Point newPos = GetIconPositionByIndex(hLV, iconIndex);
    // → triggers icon move callback
}`,
        note: 'Callback fires on our message queue (WINEVENT_OUTOFCONTEXT).',
      },
    ],
  },
  {
    id: 'remotevm',
    title: 'Layer 2 — Cross-Process Memory',
    subtitle: 'ReadProcessMemory + LVM_GETITEMPOSITION',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.15)',
    border: '#1e3a8a',
    icon: '🔬',
    latency: '< 2ms',
    reliability: '99%',
    steps: [
      {
        code: `// The ListView is in explorer.exe's address space.
// LVM_GETITEMPOSITION writes a POINT into a REMOTE buffer.

HANDLE hProcess = OpenProcess(
    PROCESS_VM_READ   |
    PROCESS_VM_WRITE  |
    PROCESS_VM_OPERATION, FALSE, explorerPid);

// Allocate POINT in explorer.exe's virtual memory
LPVOID remotePoint = VirtualAllocEx(
    hProcess, nullptr, sizeof(POINT),
    MEM_COMMIT, PAGE_READWRITE);`,
        note: 'Required because Win32 messages pass pointers — they must be valid in the target process address space.',
      },
      {
        code: `// Ask the ListView to write icon position into remotePoint
SendMessageW(hLV,
    LVM_GETITEMPOSITION,
    (WPARAM)iconIndex,
    (LPARAM)remotePoint);   // ← pointer valid in explorer.exe

// Read it back into our local POINT
POINT localPt{};
ReadProcessMemory(hProcess, remotePoint,
    &localPt, sizeof(POINT), nullptr);

VirtualFreeEx(hProcess, remotePoint, 0, MEM_RELEASE);
CloseHandle(hProcess);
return { (int)localPt.x, (int)localPt.y };`,
        note: 'VirtualAllocEx / ReadProcessMemory require PROCESS_VM_* access rights.',
      },
    ],
  },
  {
    id: 'polling',
    title: 'Layer 3 — Polling Fallback',
    subtitle: 'Background thread, 250ms interval',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    border: '#92400e',
    icon: '🔄',
    latency: '≤ 250ms',
    reliability: '100%',
    steps: [
      {
        code: `void ShellHook::PollingThreadProc() {
    using namespace std::chrono_literals;
    
    while (!m_stopPolling.load()) {
        std::this_thread::sleep_for(250ms);  // low CPU
        
        // Full snapshot of all desktop icon positions
        auto current = SnapshotDesktopIcons();
        
        std::lock_guard lock(m_snapshotMutex);
        for (auto& cur : current) {
            auto prev = FindInSnapshot(cur.name);
            if (prev && PositionChanged(*prev, cur)) {
                m_onIconMove(cur.name,
                             prev->position, cur.position);
            }
        }
        m_lastSnapshot = std::move(current);
    }
}`,
        note: 'Catches edge cases: icon auto-arrange, shell restarts, missed WinEvents.',
      },
      {
        code: `// Full desktop snapshot using cross-process ListView read
std::vector<DesktopIcon> ShellHook::SnapshotDesktopIcons() {
    HWND hLV    = FindDesktopListView();
    int  count  = SendMessageW(hLV, LVM_GETITEMCOUNT, 0, 0);
    
    std::vector<DesktopIcon> result;
    result.reserve(count);
    
    for (int i = 0; i < count; ++i) {
        DesktopIcon icon;
        icon.name     = GetIconNameByIndex(hLV, i);
        icon.position = GetIconPositionByIndex(hLV, i);
        result.push_back(std::move(icon));
    }
    return result;  // O(n) cross-process reads
}`,
        note: 'Amortized cost: ~50μs per icon. For 50 icons @ 250ms = <0.01% CPU.',
      },
    ],
  },
];

export const HookMechanismDiagram: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState(0);
  const [activeStep, setActiveStep]   = useState(0);

  const layer = LAYERS[activeLayer];
  const step  = layer.steps[activeStep];

  return (
    <div className="space-y-4">
      {/* Layer selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {LAYERS.map((l, i) => (
          <button
            key={l.id}
            onClick={() => { setActiveLayer(i); setActiveStep(0); }}
            className={`p-4 rounded-xl border text-left transition-all duration-200 ${
              activeLayer === i
                ? 'border-opacity-100 shadow-lg scale-[1.02]'
                : 'border-slate-700/50 bg-slate-900/50 hover:bg-slate-800/50'
            }`}
            style={activeLayer === i ? { borderColor: l.color, background: l.bg } : {}}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xl">{l.icon}</span>
              <div className="text-right">
                <div className="text-[9px] font-mono text-slate-500">LATENCY</div>
                <div className="text-xs font-bold" style={{ color: l.color }}>{l.latency}</div>
              </div>
            </div>
            <div className="text-xs font-bold text-white mb-0.5">{l.title}</div>
            <div className="text-[10px] font-mono text-slate-500">{l.subtitle}</div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1 rounded-full bg-slate-800">
                <div className="h-1 rounded-full" style={{ width: l.reliability, background: l.color }} />
              </div>
              <span className="text-[9px] text-slate-500">{l.reliability}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Step navigator + code */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLayer}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: layer.border, background: layer.bg }}
        >
          {/* Step tabs */}
          <div className="flex border-b" style={{ borderColor: layer.border }}>
            {layer.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex-1 py-2.5 text-xs font-mono transition-colors ${
                  activeStep === i ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={activeStep === i ? { background: `${layer.color}25`, borderBottom: `2px solid ${layer.color}` } : {}}
              >
                Step {i + 1}
              </button>
            ))}
          </div>

          {/* Code */}
          <div className="p-4">
            <pre className="text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
              <code>{step.code}</code>
            </pre>
          </div>

          {/* Note */}
          <div className="px-4 pb-4">
            <div className="flex items-start gap-2 bg-black/20 rounded-lg p-3">
              <span className="text-sm mt-0.5">💡</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">{step.note}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Flow diagram */}
      <div className="rounded-xl border border-slate-700/50 bg-[#0a0a14] p-4">
        <p className="text-[10px] font-mono text-slate-500 mb-3 uppercase tracking-wider">Detection Flow</p>
        <div className="flex items-center gap-1 flex-wrap text-[10px] font-mono">
          {[
            { label: 'Icon Moved', color: '#6b7280', bg: '#1f2937' },
            { label: '→', color: '#4b5563', bg: 'transparent' },
            { label: 'WinEvent fires', color: '#10b981', bg: '#064e3b' },
            { label: '||', color: '#4b5563', bg: 'transparent' },
            { label: 'Poll diff (250ms)', color: '#f59e0b', bg: '#451a03' },
            { label: '→', color: '#4b5563', bg: 'transparent' },
            { label: 'OnLocationChange()', color: '#60a5fa', bg: '#1e3a8a' },
            { label: '→', color: '#4b5563', bg: 'transparent' },
            { label: 'ReadProcessMem', color: '#a78bfa', bg: '#2e1065' },
            { label: '→', color: '#4b5563', bg: 'transparent' },
            { label: 'IconMoveCallback', color: '#f87171', bg: '#450a0a' },
            { label: '→', color: '#4b5563', bg: 'transparent' },
            { label: 'FenceManager.Capture()', color: '#34d399', bg: '#064e3b' },
          ].map((item, i) => (
            item.bg === 'transparent'
              ? <span key={i} style={{ color: item.color }}>{item.label}</span>
              : (
                <span key={i} className="px-1.5 py-0.5 rounded" style={{ color: item.color, background: item.bg }}>
                  {item.label}
                </span>
              )
          ))}
        </div>
      </div>
    </div>
  );
};
