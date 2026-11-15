/**
 * ConsentPrompt Component
 * Premium UI para solicitar consentimiento del usuario
 * Aplica glass morphism, shadows, NO borders duros
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, Info } from "lucide-react";
import type { JoinResponse } from "../../types/publisher.types";

interface ConsentPromptProps {
  session: JoinResponse;
  onAccept: () => void;
}

export function ConsentPrompt({ session, onAccept }: ConsentPromptProps) {
  const { policy, qrName } = session;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-background">
      {/* Contenedor principal - limpio */}
      <div className="w-full max-w-xl">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 space-y-6">
          {/* Header con icono */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <Shield className="h-7 w-7 text-neutral-900 dark:text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Consent required
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {qrName}
              </p>
            </div>
          </div>

          {/* Purpose card - limpio */}
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">Session purpose</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {policy.purposeText}
                </p>
              </div>
            </div>
          </div>

          {/* Permisos requeridos */}
          {policy.permissionsRequired && policy.permissionsRequired.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                Required permissions
              </p>
              <div className="flex flex-wrap gap-2">
                {policy.permissionsRequired.map((permission) => (
                  <div
                    key={permission}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm font-medium"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permisos opcionales */}
          {policy.permissionsOptional && policy.permissionsOptional.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permisos opcionales
              </p>
              <div className="flex flex-wrap gap-2">
                {policy.permissionsOptional.map((permission) => (
                  <Badge
                    key={permission}
                    variant="outline"
                    className="px-3 py-1 rounded-lg shadow-sm"
                  >
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Version info */}
          <div className="pt-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground text-center">
              Versión de consentimiento: {policy.consentVersion}
            </p>
          </div>

          {/* CTA Button - limpio */}
          <Button
            onClick={onAccept}
            size="lg"
            className="w-full h-12 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 font-semibold"
          >
            Accept and continue
          </Button>
        </div>
      </div>
    </div>
  );
}
