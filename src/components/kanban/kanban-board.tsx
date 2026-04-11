'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';
import { TaskForm } from './task-form';
import { TaskDetailModal } from './task-detail-modal';
import { useTasks, useCreateTask, useUpdateTask, useMoveTask, useDeleteTask } from '@/hooks/use-tasks';
import type { Task, TaskStatus } from '@/types';

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export function KanbanBoard() {
  const { data: tasks = [] } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask();
  const deleteTask = useDeleteTask();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function getColumnTasks(status: TaskStatus) {
    return tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
  }

  function onDragStart(e: DragStartEvent) {
    setActiveTask(e.active.data.current?.task ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Drop over a column (droppable)
    const overStatus = COLUMNS.includes(over.id as TaskStatus) ? (over.id as TaskStatus) : null;
    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus = overStatus ?? overTask?.status ?? activeTask.status;

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== activeTask.id)
      .sort((a, b) => a.position - b.position);

    let newPosition = 0;
    if (overTask && overTask.id !== activeTask.id) {
      const overIndex = columnTasks.findIndex((t) => t.id === overTask.id);
      newPosition = overIndex >= 0 ? overIndex : columnTasks.length;
    } else {
      newPosition = columnTasks.length;
    }

    moveTask.mutate({ id: activeTask.id, status: targetStatus, position: newPosition });
  }

  function handleCreate(data: Partial<Task>) {
    createTask.mutate(data, { onSuccess: () => setFormOpen(false) });
  }

  function handleUpdate(data: Partial<Task>) {
    if (!editTask) return;
    updateTask.mutate({ id: editTask.id, ...data }, { onSuccess: () => setEditTask(null) });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Quadro Kanban</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} no total
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
          <Plus size={14} /> Nova tarefa
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={getColumnTasks(status)}
              onEdit={(t) => setEditTask(t)}
              onDelete={(id) => deleteTask.mutate(id)}
              onOpen={(t) => setDetailTask(t)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} onOpen={() => {}} />
          )}
        </DragOverlay>
      </DndContext>

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        loading={createTask.isPending}
      />
      {editTask && (
        <TaskForm
          open
          onClose={() => setEditTask(null)}
          onSubmit={handleUpdate}
          initial={editTask}
          loading={updateTask.isPending}
        />
      )}
      <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />
    </div>
  );
}
