/**
 * PolicyDisplay Component
 * Shows session policy and requirements
 */

'use client';

import { Shield, CheckCircle2, Info } from 'lucide-react';
import { QRPolicy } from '@/features/session/types/session.types';

interface PolicyDisplayProps {
  policy: QRPolicy | null;
}

export function PolicyDisplay({ policy }: PolicyDisplayProps) {
  if (!policy) {
    return (
      <div className="rounded-2xl bg-card ring-1 ring-black/5 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Política de Sesión</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No se ha configurado una política específica
        </p>
      </div>
    );
  }

  const getPolicyTypeLabel = (type: string) => {
    switch (type) {
      case 'STRICT':
        return { label: 'Estricta', color: 'text-red-600' };
      case 'STANDARD':
        return { label: 'Estándar', color: 'text-blue-600' };
      case 'MINIMAL':
        return { label: 'Mínima', color: 'text-green-600' };
      default:
        return { label: type, color: 'text-gray-600' };
    }
  };

  const policyType = getPolicyTypeLabel(policy.policyType);

  return (
    <div className="rounded-2xl bg-card ring-1 ring-black/5 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.06)] p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Política de Sesión</h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Tipo de Política</div>
          <div className={`font-medium ${policyType.color}`}>
            {policyType.label}
          </div>
        </div>

        {policy.permissionsRequired.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Permisos Requeridos
            </div>
            <div className="space-y-2">
              {policy.permissionsRequired.map((permission, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="capitalize">{permission}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {policy.permissionsOptional.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Permisos Opcionales
            </div>
            <div className="space-y-2">
              {policy.permissionsOptional.map((permission, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="capitalize">{permission}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(policy.maxUses || policy.ttlSeconds) && (
          <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2">
            {policy.maxUses && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Usos máximos</span>
                <span className="font-medium">{policy.maxUses}</span>
              </div>
            )}
            {policy.ttlSeconds && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Validez</span>
                <span className="font-medium">
                  {Math.floor(policy.ttlSeconds / 60)} minutos
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
