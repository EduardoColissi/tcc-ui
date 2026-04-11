'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2, GripVertical, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Task } from '@/types';

const priorityStripe: Record<string, string> = {
  LOW:    'bg-slate-400',
  MEDIUM: 'bg-primary',
  HIGH:   'bg-orange-500',
  URGENT: 'bg-red-500',
};

const priorityLabel: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onOpen: (task: Task) => void;
}

export function TaskCard({ task, onEdit, onDelete, onOpen }: Props) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex rounded-lg border bg-card shadow-sm select-none transition-shadow hover:shadow-md overflow-hidden',
        isDragging && 'opacity-40 ring-2 ring-primary shadow-lg',
      )}
    >
      {/* Priority color stripe */}
      <div className={cn('w-1 shrink-0', priorityStripe[task.priority])} />

      <div className="flex flex-1 items-start gap-2 p-3 min-w-0">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-muted-foreground/40 hover:text-muted-foreground shrink-0 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onOpen(task)}
        >
          <p className="text-sm font-medium leading-snug truncate">{task.title}</p>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{priorityLabel[task.priority]}</span>
            <span className="text-muted-foreground/30 text-xs">·</span>
            <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">
              {task.type === 'PROFESSIONAL' ? 'Pro' : 'Pessoal'}
            </Badge>
            {task.dueDate && (
              <>
                <span className="text-muted-foreground/30 text-xs">·</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions — visible on hover */}
        <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            title="Iniciar Pomodoro"
            onClick={(e) => { e.stopPropagation(); router.push(`/pomodoro?taskId=${task.id}`); }}
          >
            <Timer size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          >
            <Pencil size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}
