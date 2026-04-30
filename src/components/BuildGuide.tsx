import React, { useState } from 'react';
import { Terminal, Package, Cpu, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

interface BuildStep {
  id: number;
  title: string;
  command?: string;
  commands?: string[];
  note: string;
  icon: React.ReactNode;
  type: 'install' | 'config' | 'build' | 'verify';
}

const BUILD_STEPS: BuildStep[] = [
  {
    id: 1,
    title: 'Install Prerequisites',
    commands: [
      '# Visual Studio 2022 (MSVC v143 toolchain)',
      '# Required components:',
      '#   Desktop development with C++',
      '#   C++ CMake tools for Windows',
      '#   Windows 10 SDK (10.0.22621.0)',
      '',
      '# Or via winget:',
      'winget install Microsoft.VisualStudio.2022.Community',
      'winget install Kitware.CMake',
      'winget install Git.Git',
    ],
    note: 'MSVC is required (MSYS2/MinGW lacks full DWM/DX11 toolchain support).',
    icon: <Package size={14} />,
    type: 'install',
  },
  {
    id: 2,
    title: 'Clone & Vendor Dependencies',
    commands: [
      'git clone https://github.com/you/WinFence.git',
      'cd WinFence',
      '',
      '# ImGui (vendored, not a submodule — pin to a known-good commit)',
      'git clone https://github.com/ocornut/imgui.git vendor/imgui',
      'cd vendor/imgui && git checkout v1.90.4 && cd ../..',
      '',
      '# nlohmann/json (single header)',
      'mkdir -p vendor/nlohmann',
      'curl -L https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp',
      '     -o vendor/nlohmann/json.hpp',
    ],
    note: 'Vendoring ImGui ensures reproducible builds. nlohmann/json is header-only.',
    icon: <Package size={14} />,
    type: 'install',
  },
  {
    id: 3,
    title: 'Configure with CMake',
    commands: [
      '# From project root — Developer PowerShell for VS 2022',
      'cmake -S . -B build ^',
      '      -G "Visual Studio 17 2022" ^',
      '      -A x64 ^',
      '      -DCMAKE_BUILD_TYPE=Release',
      '',
      '# For Debug build (no optimizations, symbols):',
      'cmake -S . -B build-debug ^',
      '      -G "Visual Studio 17 2022" ^',
      '      -A x64 ^',
      '      -DCMAKE_BUILD_TYPE=Debug',
    ],
    note: 'Use "Developer PowerShell for VS 2022" so MSVC is on PATH. The -A x64 flag ensures 64-bit output.',
    icon: <Cpu size={14} />,
    type: 'config',
  },
  {
    id: 4,
    title: 'Build the Project',
    commands: [
      '# Release build (optimized, ~2MB stripped .exe)',
      'cmake --build build --config Release --parallel',
      '',
      '# Output location:',
      '#   build/bin/WinFence.exe',
      '',
      '# Or open in Visual Studio:',
      'start build/WinFence.sln',
    ],
    note: '/GL (link-time code gen) + /O2 typically reduces size by 15-20% vs Debug.',
    icon: <Terminal size={14} />,
    type: 'build',
  },
  {
    id: 5,
    title: 'Verify Standalone Binary',
    commands: [
      '# Check no external DLL dependencies (beyond system DLLs):',
      'dumpbin /dependents build\\bin\\WinFence.exe',
      '',
      '# Expected output (system DLLs only):',
      '#   KERNEL32.dll',
      '#   USER32.dll',
      '#   dwmapi.dll',
      '#   d3d11.dll',
      '#   dxgi.dll',
      '#   SHELL32.dll',
      '',
      '# No MSVCP*.dll, VCRUNTIME*.dll (static runtime)',
      '# No ImGui*.dll (statically compiled in)',
    ],
    note: 'Static runtime (/MT) eliminates the VC++ redistributable requirement.',
    icon: <Shield size={14} />,
    type: 'verify',
  },
];

const TYPE_COLORS: Record<string, string> = {
  install: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  config:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  build:   'text-violet-400 bg-violet-500/10 border-violet-500/20',
  verify:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export const BuildGuide: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Step list */}
      <div className="space-y-2">
        {BUILD_STEPS.map((step, i) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(i)}
            className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
              activeStep === i
                ? `${TYPE_COLORS[step.type]} shadow-md`
                : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                              ${activeStep === i ? '' : 'bg-slate-800 text-slate-500'}`}>
                {activeStep > i
                  ? <CheckCircle2 size={14} className="text-emerald-400" />
                  : step.id}
              </div>
              <span className="text-xs font-medium">{step.title}</span>
            </div>
          </button>
        ))}

        {/* Requirements callout */}
        <div className="mt-4 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Requirements</span>
          </div>
          {[
            'Windows 10 2004+ (Build 19041)',
            'Visual Studio 2022 (MSVC 14.3)',
            'CMake 3.20+',
            'Windows 10 SDK 22621+',
            'DX11-capable GPU',
            '~50MB disk space',
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-500 py-0.5">
              <div className="w-1 h-1 rounded-full bg-red-500/50" />
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* Active step detail */}
      <div className="lg:col-span-2">
        <div className={`rounded-xl border overflow-hidden ${TYPE_COLORS[BUILD_STEPS[activeStep].type]}`}>
          {/* Header */}
          <div className="px-4 py-3 bg-black/20 border-b border-current/20 flex items-center gap-2">
            {BUILD_STEPS[activeStep].icon}
            <span className="text-sm font-semibold">
              Step {BUILD_STEPS[activeStep].id}: {BUILD_STEPS[activeStep].title}
            </span>
          </div>

          {/* Commands */}
          <div className="bg-[#0a0a14] p-4">
            <pre className="text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
              {BUILD_STEPS[activeStep].commands?.join('\n')}
            </pre>
          </div>

          {/* Note */}
          <div className="px-4 py-3 bg-black/10 flex items-start gap-2">
            <span className="text-sm mt-0.5">📝</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {BUILD_STEPS[activeStep].note}
            </p>
          </div>
        </div>

        {/* Performance targets */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'RAM Usage',    value: '< 8 MB',  note: 'Idle', color: '#10b981' },
            { label: 'CPU (Idle)',   value: '< 0.2%',  note: 'VSync + WM_PAINT only', color: '#3b82f6' },
            { label: 'Binary Size',  value: '~1.8 MB', note: 'Release + LTCG', color: '#8b5cf6' },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3 text-center">
              <div className="text-xl font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
              <div className="text-[10px] text-white mt-1">{m.label}</div>
              <div className="text-[9px] text-slate-500">{m.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
