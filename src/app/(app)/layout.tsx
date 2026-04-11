'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { useMe } from '@/hooks/use-me';
import { Sidebar } from '@/components/layout/sidebar';
import { PomodoroProvider } from '@/lib/pomodoro-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();

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

  useEffect(() => {
    if (user && !user.onboardingComplete) {
      router.replace('/onboarding');
    }
  }, [user, router]);

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
        <Sidebar user={user} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </PomodoroProvider>
  );
}
