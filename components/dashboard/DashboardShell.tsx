'use client';

import { ArrowRight, AlertCircle, ChevronRight } from 'lucide-react';

export function HeroBar({
  gradient,
  title,
  subtitle,
  statusBadge,
  actions,
}: {
  gradient: string;
  title: string;
  subtitle: string;
  statusBadge?: { label: string; color: string };
  actions?: { label: string; href: string; primary?: boolean }[];
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
      <div>
        <h1 className="text-white text-2xl font-semibold">{title}</h1>
        <p className="text-white/60 text-sm mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {statusBadge && (
          <div className={`flex items-center gap-2 ${statusBadge.color} rounded-full px-4 py-2`}>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse opacity-80" />
            <span className="text-sm font-medium">{statusBadge.label}</span>
          </div>
        )}
        {actions?.map(a => (
          <button
            key={a.label}
            onClick={() => { window.location.href = a.href; }}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition ${
              a.primary
                ? 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                : 'bg-white/10 hover:bg-white/20 text-white/80'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StatCard({
  label, value, sub, icon: Icon,
  bg, iconColor, border, valueColor,
}: {
  label: string; value: string; sub: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any; bg: string; iconColor: string;
  border: string; valueColor: string;
}) {
  return (
    <div className={`bg-white rounded-xl border ${border} p-4 space-y-3`}>
      <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
      <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">{sub}</p>
    </div>
  );
}

export function ActionCard({
  title, desc, icon: Icon, primary, href,
}: {
  title: string; desc: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  primary?: boolean; href: string;
}) {
  return (
    <button
      onClick={() => { window.location.href = href; }}
      className={`rounded-xl p-4 text-left flex items-start gap-3 transition group w-full ${
        primary
          ? 'bg-blue-600 hover:bg-blue-700 border-0'
          : 'bg-white hover:bg-slate-50 border border-slate-200'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        primary ? 'bg-blue-500' : 'bg-slate-100'
      }`}>
        <Icon className={`w-4 h-4 ${primary ? 'text-white' : 'text-slate-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${primary ? 'text-white' : 'text-slate-800'}`}>{title}</p>
        <p className={`text-xs mt-0.5 truncate ${primary ? 'text-blue-200' : 'text-slate-400'}`}>{desc}</p>
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition ${
        primary ? 'text-blue-200' : 'text-slate-400'
      }`} />
    </button>
  );
}

export function ActivityPanel({
  title,
  emptyIcon: EmptyIcon,
  emptyMessage,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emptyIcon: any;
  emptyMessage: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-slate-700">{title}</h2>
        <button className="text-xs text-blue-600 hover:text-blue-700">View all</button>
      </div>
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
          <EmptyIcon className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm text-slate-400 text-center whitespace-pre-line">{emptyMessage}</p>
        <button
          onClick={() => { window.location.href = ctaHref; }}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
        >
          {ctaLabel} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function InfoStrip({
  message, sub, ctaLabel, ctaHref, color,
}: {
  message: string; sub: string;
  ctaLabel: string; ctaHref: string;
  color: 'blue' | 'amber' | 'red' | 'green' | 'violet';
}) {
  const map = {
    blue:   { wrap: 'bg-blue-50 border-blue-100',     icon: 'text-blue-500',   title: 'text-blue-800',   sub: 'text-blue-600',   btn: 'text-blue-700 border-blue-200 hover:bg-blue-100' },
    amber:  { wrap: 'bg-amber-50 border-amber-100',   icon: 'text-amber-500',  title: 'text-amber-800',  sub: 'text-amber-600',  btn: 'text-amber-700 border-amber-200 hover:bg-amber-100' },
    red:    { wrap: 'bg-red-50 border-red-100',       icon: 'text-red-500',    title: 'text-red-800',    sub: 'text-red-600',    btn: 'text-red-700 border-red-200 hover:bg-red-100' },
    green:  { wrap: 'bg-green-50 border-green-100',   icon: 'text-green-500',  title: 'text-green-800',  sub: 'text-green-600',  btn: 'text-green-700 border-green-200 hover:bg-green-100' },
    violet: { wrap: 'bg-violet-50 border-violet-100', icon: 'text-violet-500', title: 'text-violet-800', sub: 'text-violet-600', btn: 'text-violet-700 border-violet-200 hover:bg-violet-100' },
  };
  const c = map[color];
  return (
    <div className={`${c.wrap} border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${c.icon} flex-shrink-0 mt-0.5`} />
        <div>
          <p className={`text-sm font-medium ${c.title}`}>{message}</p>
          <p className={`text-xs mt-0.5 ${c.sub}`}>{sub}</p>
        </div>
      </div>
      <button
        onClick={() => { window.location.href = ctaHref; }}
        className={`text-xs font-medium border bg-white rounded-lg px-3 py-1.5 transition whitespace-nowrap ${c.btn}`}
      >
        {ctaLabel} →
      </button>
    </div>
  );
}
