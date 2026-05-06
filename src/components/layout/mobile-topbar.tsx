'use client';

import { Menu, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileTopbarProps {
  onOpenSidebar: () => void;
}

export function MobileTopbar({ onOpenSidebar }: MobileTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={onOpenSidebar}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </Button>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <GraduationCap size={14} className="text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Produtividade</span>
      </div>
    </header>
  );
}
