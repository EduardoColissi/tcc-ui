'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { toastSuccess, toastError } from '@/lib/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ConfirmEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const notified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      if (!notified.current) {
        notified.current = true;
        toastError('Link inválido', 'Nenhum token de confirmação encontrado.');
      }
      return;
    }

    api.get(`/auth/confirm/${token}`)
      .then(() => {
        setStatus('success');
        if (!notified.current) {
          notified.current = true;
          toastSuccess('E-mail confirmado!', 'Sua conta está ativa. Faça login para continuar.');
        }
      })
      .catch(() => {
        setStatus('error');
        if (!notified.current) {
          notified.current = true;
          toastError('Token inválido ou expirado', 'Solicite um novo link de confirmação.');
        }
      });
  }, [token]);

  return (
    <CardContent className="space-y-4">
      {status === 'loading' && <p className="text-muted-foreground">Verificando...</p>}
      {status === 'success' && (
        <>
          <p className="text-green-500">E-mail confirmado com sucesso!</p>
          <Button onClick={() => router.push('/login')} className="w-full">Fazer login</Button>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-destructive">Token inválido ou expirado.</p>
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center')}>
            Voltar ao login
          </Link>
        </>
      )}
    </CardContent>
  );
}

export default function ConfirmEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Confirmação de E-mail</CardTitle>
        </CardHeader>
        <Suspense fallback={<CardContent><p className="text-muted-foreground">Carregando...</p></CardContent>}>
          <ConfirmEmailContent />
        </Suspense>
      </Card>
    </div>
  );
}
