'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ListTodo, Kanban, Settings, LogOut, Timer, GraduationCap, History, ClipboardPen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearTokens } from '@/lib/auth';
import api from '@/lib/api';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { toastSuccess } from '@/lib/toast';
import { usePomodoro } from '@/lib/pomodoro-store';

const navItems = [
  { href: '/dashboard',     label: 'Lista de Tarefas',  icon: ListTodo },
  { href: '/kanban',        label: 'Kanban',            icon: Kanban },
  { href: '/pomodoro',      label: 'Pomodoro',          icon: Timer },
  { href: '/focus-history', label: 'Histórico de Foco', icon: History },
  { href: '/settings',      label: 'Configurações',     icon: Settings },
];

function MiniTimerBadge() {
  const { state, remaining, isRunning } = usePomodoro();
  if (state.phase === 'idle') return null;

  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');

  return (
    <span
      className={cn(
        'ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-mono tabular-nums',
        isRunning ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {isRunning && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
      )}
      {m}:{s}
    </span>
  );
}

interface SidebarProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    clearTokens();
    router.push('/login');
    toastSuccess('Sessão encerrada.', 'Até logo!');
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar transition-transform duration-200 ease-out',
          'md:static md:z-auto md:w-60 md:translate-x-0 md:transition-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <GraduationCap size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Produtividade</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 md:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    'shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                {label}
                {href === '/pomodoro' && <MiniTimerBadge />}
              </Link>
            );
          })}
        </nav>

        {/* Survey CTA */}
        <div className="shrink-0 px-3 pb-3">
          <a
            href="https://forms.gle/5PCPyRpAfy5xKtRU7"
            target="_blank"
            rel="noopener noreferrer"
            className="survey-cta flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <ClipboardPen size={16} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="leading-tight">Responder pesquisa</p>
              <p className="text-[10px] font-normal text-primary/70 leading-tight mt-0.5">
                Contribua com o TCC
              </p>
            </div>
          </a>
        </div>

        {/* Footer: user + theme + logout */}
        <div className="shrink-0 border-t border-border p-3 space-y-1">
          <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <ThemeToggle />
          </div>
          <Separator />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            Sair
          </Button>
        </div>
      </aside>
    </>
  );
}
