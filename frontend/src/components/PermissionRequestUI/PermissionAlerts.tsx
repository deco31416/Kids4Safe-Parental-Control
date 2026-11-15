import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type PermissionAlertsProps = {
  essentialOnly: boolean;
  hasPermissions: boolean;
};

export function PermissionAlerts({ essentialOnly, hasPermissions }: PermissionAlertsProps) {
  return (
    <>
      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900 ml-2">
          <strong>Importante:</strong> Algunos permisos pueden no estar disponibles en tu navegador o dispositivo.
          {essentialOnly && ' Los permisos esenciales son necesarios para el funcionamiento básico.'}
        </AlertDescription>
      </Alert>

      {hasPermissions && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm text-green-900 ml-2">
            Solicitud de permisos completada. Revisa el estado de cada permiso arriba.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
