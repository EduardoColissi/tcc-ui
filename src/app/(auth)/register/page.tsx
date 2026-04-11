'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import api from '@/lib/api';
import { toastPromise, extractApiError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', birthDate: '' });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const promise = api.post('/auth/register', form);

    toastPromise(promise, {
      loading: 'Criando sua conta...',
      success: 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.',
      error: (err) => extractApiError(err, 'Erro ao criar conta. Tente novamente.'),
    });

    try {
      await promise;
      router.push('/login');
    } catch {
      // handled by toastPromise
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col items-center justify-center gap-6 bg-primary px-12 text-primary-foreground">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
            <Zap size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FlowDesk</h1>
            <p className="mt-1 text-primary-foreground/70 text-sm">
              Produtividade para home office
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
          {['Organize com Kanban', 'Foque com Pomodoro', 'Acompanhe seu progresso'].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Zap size={22} className="text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Criar conta</h2>
            <p className="text-sm text-muted-foreground">Preencha os dados para começar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                className="h-9"
              />
            </div>

            <Button type="submit" className="w-full h-9" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
