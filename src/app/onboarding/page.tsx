'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Zap, Briefcase, Building2, Laptop } from 'lucide-react';
import api from '@/lib/api';
import { toastSuccess, toastError, toastWarning } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ jobTitle: '', workModel: '', company: '' });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.workModel) { toastWarning('Campo obrigatório', 'Selecione o modelo de trabalho.'); return; }
    setLoading(true);
    try {
      await api.put('/users/me', form);
      await qc.refetchQueries({ queryKey: ['me'] });
      toastSuccess('Perfil configurado!', 'Bem-vindo ao FlowDesk.');
      router.replace('/dashboard');
    } catch {
      toastError('Erro ao salvar perfil.', 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Zap size={26} className="text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quase lá!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure seu perfil para personalizar a experiência
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-primary" />
          <div className="h-1.5 flex-1 rounded-full bg-primary" />
          <div className="h-1.5 flex-1 rounded-full bg-primary/30" />
          <span className="text-xs text-muted-foreground ml-1">2/3</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle" className="flex items-center gap-1.5">
              <Briefcase size={13} className="text-muted-foreground" />
              Cargo
            </Label>
            <Input
              id="jobTitle"
              placeholder="Ex: Desenvolvedor, Designer..."
              value={form.jobTitle}
              onChange={(e) => set('jobTitle', e.target.value)}
              required
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company" className="flex items-center gap-1.5">
              <Building2 size={13} className="text-muted-foreground" />
              Empresa
            </Label>
            <Input
              id="company"
              placeholder="Ex: UFRGS, Empresa LTDA..."
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              required
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Laptop size={13} className="text-muted-foreground" />
              Modelo de trabalho
            </Label>
            <Select onValueChange={(v) => set('workModel', v as string)} required>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione seu modelo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOME_OFFICE">🏠 Home Office</SelectItem>
                <SelectItem value="HYBRID">🔀 Híbrido</SelectItem>
                <SelectItem value="ONSITE">🏢 Presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full h-9" disabled={loading}>
            {loading ? 'Salvando...' : 'Finalizar configuração'}
          </Button>
        </form>
      </div>
    </div>
  );
}
