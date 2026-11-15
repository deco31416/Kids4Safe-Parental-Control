'use client';

import { useParams, useRouter } from 'next/navigation';
import { Camera, Monitor, Mic, MapPin } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ConsentFlowContainer, PermissionCard, TrustSection } from '@/features/session/components/ConsentFlow';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useToast } from '@/hooks/useToast';
import { getBrowserDeviceId } from '@/lib/browser-identity';

type PageState = 'loading' | 'consent' | 'joining' | 'invalid' | 'expired' | 'error';

/**
 * 🔐 QR Entry Page - Enterprise Consent Flow
 * 
 * Redesigned for trust, elegance, and professionalism
 * NO aggressive surveillance feel
 * YES enterprise-grade UX
 */
export default function QREntryPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const qrId = params.sessionId as string;
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const verifyQR = useCallback(async () => {
    try {
      setPageState('loading');
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/qr/${qrId}`);
      
      if (!res.ok) {
        setPageState('invalid');
        setErrorMessage('QR no válido o no encontrado');
        return;
      }

      const response = await res.json();
      const qr = response.qr || response;
      
      if (!qr.isActive) {
        setPageState('expired');
        setErrorMessage('Este QR ha sido desactivado');
        return;
      }

      if (qr.expiresAt && new Date(qr.expiresAt).getTime() < Date.now()) {
        setPageState('expired');
        setErrorMessage('Este QR ha expirado');
        return;
      }

      setPageState('consent');
    } catch (error) {
      console.error('Error verificando QR:', error);
      setPageState('error');
      setErrorMessage('Error de conexión con el servidor');
    }
  }, [qrId]);

  // Verify QR on mount
  useEffect(() => {
    verifyQR();
  }, [verifyQR]);

  const handleAccept = async () => {
    try {
      setPageState('joining');
      
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/session/qr/${qrId}/join`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browserDeviceId: getBrowserDeviceId(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Error response:', error);
        setPageState('error');
        setErrorMessage(error.message || 'No se pudo crear la sesión');
        toast.error('Error al crear sesión', error.message);
        return;
      }

      const { sessionId, publisherToken, destinationUrl, policy, browserDeviceId } = await res.json();
      
      // Save session info
      localStorage.setItem(`session_${sessionId}`, JSON.stringify({
        sessionId,
        publisherToken,
        qrId,
        destinationUrl,
        policy,
        browserDeviceId,
        joinedAt: Date.now(),
      }));

      // Success toast
      toast.success('Sesión iniciada', 'Redirigiendo...');
      
      // Redirect to session content
      router.push(`/s/${sessionId}/content`);
    } catch (error) {
      console.error('Error al unirse a la sesión:', error);
      setPageState('error');
      setErrorMessage('Error al crear la sesión');
      toast.error('Error de conexión');
    }
  };

  const handleDecline = () => {
    toast.info('Sesión cancelada');
    window.location.href = 'https://google.com';
  };

  // Loading state - Verifying QR
  if (pageState === 'loading') {
    return <LoadingScreen message="Verificando QR..." />;
  }

  // Error states - Invalid/Expired/Error
  if (pageState === 'invalid' || pageState === 'expired' || pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-md w-full">
          <div className="rounded-2xl p-8 bg-card text-center space-y-6 ring-1 ring-black/5 dark:ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="inline-flex p-4 rounded-2xl bg-destructive/10">
              <MapPin className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {pageState === 'invalid' && 'QR Inválido'}
                {pageState === 'expired' && 'QR Expirado'}
                {pageState === 'error' && 'Error de Conexión'}
              </h2>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
            <Button onClick={handleDecline} variant="outline" className="w-full">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Permissions to display
  const permissions = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: 'Cámara',
      description: 'Para verificar tu identidad de forma visual y segura.',
      granted: false,
      required: true,
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: 'Micrófono',
      description: 'Para captura de audio durante la verificación.',
      granted: false,
      required: true,
    },
    {
      icon: <Monitor className="w-6 h-6" />,
      title: 'Compartir Pantalla',
      description: 'Para mostrar información adicional si es necesario.',
      granted: false,
      required: true,
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Ubicación',
      description: 'Para verificar tu localización geográfica de forma precisa.',
      granted: false,
      required: true,
    },
  ];

  // Consent/Joining state - Show consent form or joining loading
  // pageState can be 'consent' or 'joining' at this point
  return (
    <ConsentFlowContainer
      onAccept={handleAccept}
      onDecline={handleDecline}
      isLoading={pageState === 'joining'}
      qrId={qrId}
    >
      {/* Permission cards */}
      {permissions.map((permission, index) => (
        <PermissionCard
          key={index}
          {...permission}
        />
      ))}
      
      {/* Trust signals */}
      <TrustSection />
    </ConsentFlowContainer>
  );
}
