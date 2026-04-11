import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toastSuccess, toastApiError } from '@/lib/toast';
import type { Task, TaskStatus } from '@/types';

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await api.get('/tasks');
      return data.data;
    },
  });
}

export function useTodayTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      const { data } = await api.get('/tasks/today');
      return data.data;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Task>) => api.post('/tasks', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toastSuccess('Tarefa criada!');
    },
    onError: (err) => toastApiError(err, 'Erro ao criar tarefa.'),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<Task> & { id: number }) =>
      api.put(`/tasks/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toastSuccess('Tarefa atualizada!');
    },
    onError: (err) => toastApiError(err, 'Erro ao atualizar tarefa.'),
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, position }: { id: number; status: TaskStatus; position: number }) =>
      api.put(`/tasks/${id}/move`, { status, position }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (err) => toastApiError(err, 'Erro ao mover tarefa.'),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toastSuccess('Tarefa removida.');
    },
    onError: (err) => toastApiError(err, 'Erro ao remover tarefa.'),
  });
}
