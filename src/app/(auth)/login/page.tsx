'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import api from '@/lib/api';
import { setTokens } from '@/lib/auth';
import { toastPromise, extractApiError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const promise = api.post('/auth/login', form).then(({ data }) => {
      setTokens(data.data.accessToken, data.data.refreshToken);
    });

    toastPromise(promise, {
      loading: 'Autenticando...',
      success: 'Login realizado! Redirecionando...',
      error: (err) => extractApiError(err, 'E-mail ou senha incorretos.'),
    });

    try {
      await promise;
      router.push('/dashboard');
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
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtividade</h1>
            <p className="mt-1 text-primary-foreground/70 text-sm">
              Gestão de produtividade profissional e pessoal
            </p>
          </div>
        </div>
        <div className="w-full max-w-xs text-center space-y-1">
          <p className="text-xs uppercase tracking-wider text-primary-foreground/60">
            Trabalho de Conclusão de Curso
          </p>
          <p className="text-sm font-medium text-primary-foreground/90">
            Eduardo Colissi Wiceskoski
          </p>
          <p className="text-xs text-primary-foreground/70">
            Ciência da Computação
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <GraduationCap size={22} className="text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Boas-vindas</h2>
            <p className="text-sm text-muted-foreground">Faça login para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="h-9"
              />
            </div>

            <Button type="submit" className="w-full h-9" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline underline-offset-4">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
