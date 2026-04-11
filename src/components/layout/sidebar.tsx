'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ListTodo, Kanban, Settings, LogOut, Timer, Zap } from 'lucide-react';
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
  { href: '/dashboard', label: 'Lista de Tarefas', icon: ListTodo },
  { href: '/kanban',    label: 'Kanban',           icon: Kanban },
  { href: '/pomodoro',  label: 'Pomodoro',         icon: Timer },
  { href: '/settings',  label: 'Configurações',    icon: Settings },
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

export function Sidebar({ user }: { user: User }) {
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
    <aside className="flex w-60 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Zap size={14} className="text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">FlowDesk</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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

      {/* Footer: user + theme + logout */}
      <div className="border-t border-border p-3 space-y-1">
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
  );
}
