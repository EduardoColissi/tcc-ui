'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { useMe } from '@/hooks/use-me';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileTopbar } from '@/components/layout/mobile-topbar';
import { PomodoroProvider } from '@/lib/pomodoro-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useMe();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (isError) {
      router.replace('/login');
    }
  }, [isError, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <PomodoroProvider>
      <div className="flex min-h-screen">
        <Sidebar
          user={user}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </PomodoroProvider>
  );
}
