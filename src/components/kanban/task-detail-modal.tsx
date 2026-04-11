'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PomodoroTimer } from '@/components/pomodoro/pomodoro-timer';
import { TaskPomodoroStats } from '@/components/pomodoro/task-pomodoro-stats';
import type { Task } from '@/types';

const priorityLabel: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};
const priorityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'secondary', HIGH: 'default', URGENT: 'destructive',
};
const statusLabel: Record<string, string> = {
  TODO: 'A Fazer', IN_PROGRESS: 'Em Andamento', DONE: 'Concluído',
};

interface Props {
  task: Task | null;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: Props) {
  if (!task) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={priorityVariant[task.priority]}>
              {priorityLabel[task.priority]}
            </Badge>
            <Badge variant="outline">
              {task.type === 'PROFESSIONAL' ? 'Profissional' : 'Pessoal'}
            </Badge>
            <Badge variant="outline">
              {statusLabel[task.status]}
            </Badge>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {task.dueDate && (
              <>
                <span className="text-muted-foreground">Vencimento</span>
                <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
              </>
            )}
            <span className="text-muted-foreground">Criada em</span>
            <span>{new Date(task.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>

          <Separator />

          {/* Pomodoro Timer */}
          <div>
            <p className="text-sm font-medium mb-3">Timer Pomodoro</p>
            <div className="flex justify-center">
              <PomodoroTimer task={task} />
            </div>
          </div>

          <Separator />

          {/* Stats + History */}
          <div>
            <p className="text-sm font-medium mb-3">Estatísticas</p>
            <TaskPomodoroStats taskId={task.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
