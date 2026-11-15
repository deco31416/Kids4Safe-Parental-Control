/**
 * PermissionFlow Component
 * State shown while requesting user permissions (camera, mic, screen, etc.)
 */

import { Loader2, AlertTriangle } from 'lucide-react';

interface PermissionFlowProps {
  permissionStep: string;
  unsupportedFeatures: string[];
}

export default function PermissionFlow({ 
  permissionStep, 
  unsupportedFeatures 
}: PermissionFlowProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 space-y-6 ring-1 ring-black/5 dark:ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Activando Permisos</h2>
            <p className="text-sm text-muted-foreground">{permissionStep}</p>
          </div>
        </div>
        
        {unsupportedFeatures.length > 0 && (
          <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
            <div className="flex gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-orange-900 mb-1">
                  Funciones no disponibles:
                </p>
                <ul className="space-y-1 text-orange-800">
                  {unsupportedFeatures.map((feature, idx) => (
                    <li key={idx}>• {feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
