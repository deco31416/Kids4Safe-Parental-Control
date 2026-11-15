
import { AlertTriangle, Info } from 'lucide-react';
import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { ForensicGuideModal } from '@/components/ForensicGuideModal';

/**
 * Banner de disclaimer legal para vistas forenses
 * Previene conclusiones precipitadas y sesgo de confirmación
 */
export function ForensicDisclaimerBanner() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <>
      <Alert
        variant="default"
        className="bg-amber-500 bg-opacity-10 border-amber-500 border-opacity-30 mb-4"
      >
        <AlertTriangle className="h-5 w-5 text-amber-700" />
        <AlertTitle className="text-foreground font-semibold">
          Interpretación de Eventos Forenses
        </AlertTitle>
        <AlertDescription className="text-foreground opacity-80 text-sm mt-2">
          <p className="mb-3">
            <AlertTriangle className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Los eventos mostrados son señales técnicas. No constituyen prueba de culpabilidad por sí solos
            y deben interpretarse en conjunto con el timeline completo, el contexto operativo y el nivel de 
            confianza de la fuente.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent border-amber-500 border-opacity-40 text-amber-700 hover:bg-amber-500 hover:bg-opacity-10"
              onClick={() => setIsGuideOpen(true)}
              aria-label="Abrir guía de interpretación forense"
            >
              <Info className="h-4 w-4 mr-2" />
              Guía de interpretación
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <ForensicGuideModal 
        open={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
    </>
  );
}
