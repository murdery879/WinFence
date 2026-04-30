import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  label: string;
  title: string;
  description?: string;
  accent?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  label,
  title,
  description,
  accent = 'from-violet-500 to-indigo-500',
}) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-3">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${accent} shadow-lg`}>
        <Icon size={15} className="text-white" />
      </div>
      <span className="text-xs font-mono tracking-widest text-slate-500 uppercase">{label}</span>
    </div>
    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{title}</h2>
    {description && <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{description}</p>}
  </div>
);
