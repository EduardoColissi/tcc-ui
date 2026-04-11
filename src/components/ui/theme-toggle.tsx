'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      title="Alternar tema"
    >
      <Sun className="scale-100 transition-transform duration-200 dark:scale-0" />
      <Moon className="absolute scale-0 transition-transform duration-200 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
