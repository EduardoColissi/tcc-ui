'use client';

import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/use-tasks';
import { sortTasksByPriority } from '@/lib/task-sort';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Timer, CheckSquare } from 'lucide-react';

const priorityLabel: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};
const priorityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'secondary', HIGH: 'default', URGENT: 'destructive',
};
const statusLabel: Record<string, string> = {
  TODO: 'A Fazer', IN_PROGRESS: 'Em Andamento',
};

const PRIORITY_LEGEND = [
  { label: 'Urgente',  type: 'Profissional', dot: 'bg-red-500',    variant: 'destructive' as const },
  { label: 'Urgente',  type: 'Pessoal',      dot: 'bg-red-500',    variant: 'destructive' as const },
  { label: 'Alta',     type: 'Profissional', dot: 'bg-orange-500', variant: 'default' as const },
  { label: 'Média',    type: 'Profissional', dot: 'bg-primary',    variant: 'secondary' as const },
  { label: 'Alta',     type: 'Pessoal',      dot: 'bg-orange-500', variant: 'default' as const },
  { label: 'Média',    type: 'Pessoal',      dot: 'bg-primary',    variant: 'secondary' as const },
  { label: 'Baixa',    type: 'Profissional', dot: 'bg-slate-400',  variant: 'outline' as const },
  { label: 'Baixa',    type: 'Pessoal',      dot: 'bg-slate-400',  variant: 'outline' as const },
];

function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-7 w-24 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TaskListPage() {
  const router = useRouter();
  const { data: tasks = [], isLoading } = useTasks();

  const activeTasks = sortTasksByPriority(tasks.filter((t) => t.status !== 'DONE'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Lista de Tarefas</h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeTasks.length} tarefa{activeTasks.length !== 1 ? 's' : ''} ativa{activeTasks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Task list */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading && <TaskListSkeleton />}

          {!isLoading && activeTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
              <CheckSquare size={36} className="text-muted-foreground/40 mb-3" />
              <p className="font-medium text-sm">Nenhuma tarefa ativa</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie tarefas no Kanban para começar
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/kanban')}
              >
                Ir para o Kanban
              </Button>
            </div>
          )}

          {activeTasks.map((task) => (
            <Card key={task.id} className="group transition-shadow hover:shadow-sm">
              <CardContent className="flex items-center gap-4 py-3">
                {/* Priority color stripe */}
                <div
                  className={`h-8 w-1 rounded-full shrink-0 ${
                    task.priority === 'URGENT' ? 'bg-red-500' :
                    task.priority === 'HIGH'   ? 'bg-orange-500' :
                    task.priority === 'MEDIUM' ? 'bg-primary' : 'bg-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant={priorityVariant[task.priority]} className="text-xs">
                      {priorityLabel[task.priority]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.type === 'PROFESSIONAL' ? 'Profissional' : 'Pessoal'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {statusLabel[task.status]}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity"
                  onClick={() => router.push(`/pomodoro?taskId=${task.id}`)}
                >
                  <Timer size={13} />
                  Focar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Priority legend */}
        <div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ordem de prioridade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Tarefas profissionais têm precedência. Urgentes pessoais superam altas profissionais.
              </p>
              {PRIORITY_LEGEND.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
                  <span className="w-4 text-muted-foreground tabular-nums shrink-0 text-right">{i + 1}.</span>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${item.dot}`} />
                  <Badge variant={item.variant} className="text-xs h-5 px-1.5 shrink-0">
                    {item.label}
                  </Badge>
                  <span className="text-muted-foreground">{item.type}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
