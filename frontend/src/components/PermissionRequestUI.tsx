/**
 * 🔐 Componente de Solicitud de Permisos
 * 
 * Interfaz visual para solicitar todos los permisos del navegador
 * de manera clara y amigable para el usuario.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { requestAllPermissions, requestEssentialPermissions } from '@/lib/permissions-manager';
import type { AllPermissionsStatus } from '@/lib/permissions-manager';
import { PermissionAlerts } from './PermissionRequestUI/PermissionAlerts';
import { PermissionList } from './PermissionRequestUI/PermissionList';
import { permissionsList } from './PermissionRequestUI/permission-data';
import { essentialPermissionsToStatus } from './PermissionRequestUI/permission-results';

interface PermissionRequestUIProps {
  onComplete?: (permissions: AllPermissionsStatus) => void;
  essentialOnly?: boolean;
}

export function PermissionRequestUI({ onComplete, essentialOnly = false }: PermissionRequestUIProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissions, setPermissions] = useState<AllPermissionsStatus | null>(null);
  const [currentStep, setCurrentStep] = useState('');

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    setCurrentStep('Solicitando permisos...');

    try {
      let result: AllPermissionsStatus;

      if (essentialOnly) {
        // Solicitar solo permisos esenciales
        setCurrentStep('Solicitando permisos esenciales...');
        const essential = await requestEssentialPermissions();
        result = essentialPermissionsToStatus(essential);
      } else {
        // Solicitar TODOS los permisos
        setCurrentStep('Solicitando todos los permisos disponibles...');
        result = await requestAllPermissions();
      }

      setPermissions(result);
      setCurrentStep('Permisos procesados');
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (error: any) {
      console.error('❌ Error solicitando permisos:', error);
      setCurrentStep(`Error: ${error.message}`);
    } finally {
      setIsRequesting(false);
    }
  };

  const filteredPermissions = essentialOnly 
    ? permissionsList.filter(p => p.essential)
    : permissionsList;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔐 Permisos del Sistema
        </h2>
        <p className="text-gray-600">
          {essentialOnly 
            ? 'Necesitamos los siguientes permisos esenciales para funcionar correctamente'
            : 'Esta aplicación puede solicitar los siguientes permisos del navegador'}
        </p>
      </div>

      <PermissionList permissions={filteredPermissions} statuses={permissions} />

      {/* Botón de solicitud */}
      {!permissions && (
        <Button
          onClick={handleRequestPermissions}
          disabled={isRequesting}
          className="w-full h-12 text-lg"
          size="lg"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {currentStep}
            </>
          ) : (
            <>
              Solicitar Permisos {essentialOnly ? 'Esenciales' : 'Completos'}
            </>
          )}
        </Button>
      )}

      <PermissionAlerts essentialOnly={essentialOnly} hasPermissions={!!permissions} />
    </div>
  );
}
