'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { TaskCard } from './task-card';
import type { Task, TaskStatus } from '@/types';

const columnMeta: Record<TaskStatus, { label: string; accent: string; dot: string }> = {
  TODO:        { label: 'A Fazer',      accent: 'border-t-slate-400',  dot: 'bg-slate-400' },
  IN_PROGRESS: { label: 'Em Andamento', accent: 'border-t-primary',    dot: 'bg-primary' },
  DONE:        { label: 'Concluído',    accent: 'border-t-green-500',  dot: 'bg-green-500' },
};

interface Props {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onOpen: (task: Task) => void;
}

export function KanbanColumn({ status, tasks, onEdit, onDelete, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = columnMeta[status];

  return (
    <div className={cn('flex flex-col rounded-xl border border-border border-t-4 bg-card/60 backdrop-blur-sm', meta.accent)}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full shrink-0', meta.dot)} />
          <h3 className="font-semibold text-sm">{meta.label}</h3>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[240px] rounded-b-xl p-3 pt-1 transition-colors',
          isOver && 'bg-primary/5',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && !isOver && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 text-xs text-muted-foreground/50">
              Solte aqui
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
