'use client';

import { useState } from 'react';
import { Eye, Play, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

interface StartFocusDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: (monitoringEnabled: boolean) => void;
}

export function StartFocusDialog({
  open,
  task,
  onClose,
  onConfirm,
}: StartFocusDialogProps) {
  const [monitoring, setMonitoring] = useState(true);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar ciclo de foco</DialogTitle>
          <DialogDescription>
            Ciclo de 25 minutos para a tarefa selecionada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Tarefa
            </p>
            <p className="text-sm font-medium mt-0.5 truncate">{task.title}</p>
          </div>

          <button
            type="button"
            onClick={() => setMonitoring((v) => !v)}
            className={cn(
              'w-full text-left rounded-md border p-3 transition-colors',
              monitoring
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:bg-accent/40',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
                  monitoring
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/40',
                )}
              >
                {monitoring && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="text-primary-foreground"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Eye size={14} /> Monitorar meu foco via webcam
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Usa IA local (YOLO + MediaPipe) para detectar distrações como
                  ausência, celular, rosto virado ou olhos fechados.
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  Os frames nunca saem do seu navegador.
                </p>
              </div>
            </div>
          </button>

          <p className="text-xs text-muted-foreground">
            Desative se esta tarefa não exige que você fique no computador.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(monitoring);
            }}
          >
            <Play size={15} className="mr-2" /> Iniciar foco
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
