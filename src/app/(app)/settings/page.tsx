'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useMe } from '@/hooks/use-me';
import { toastPromise, extractApiError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { data: user } = useMe();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '' });

  useEffect(() => {
    if (user) {
      setForm({ name: user.name });
    }
  }, [user]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const promise = api.put('/users/me', form).then(() => {
      qc.invalidateQueries({ queryKey: ['me'] });
    });

    toastPromise(promise, {
      loading: 'Salvando alterações...',
      success: 'Perfil atualizado!',
      error: (err) => extractApiError(err, 'Erro ao atualizar perfil.'),
    });

    try {
      await promise;
    } catch {
      // error already shown by toastPromise
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie seu perfil e preferências</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais e profissionais</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Nome</Label>
              <Input className="h-9" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="pt-1">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">E-mail</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Membro desde</span>
            <span className="font-medium">{user ? new Date(user.createdAt).toLocaleDateString('pt-BR') : ''}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
