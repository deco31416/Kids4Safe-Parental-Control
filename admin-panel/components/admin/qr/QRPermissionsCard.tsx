'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Mic, MapPin, Monitor, Shield } from 'lucide-react';

interface QRPermissionsCardProps {
  config?: {
    require_camera?: boolean;
    require_microphone?: boolean;
    require_location?: boolean;
    require_screen?: boolean;
  };
  permissions?: string[];
}

export function QRPermissionsCard({ config, permissions }: QRPermissionsCardProps) {
  const permissionsList = [
    {
      key: 'camera',
      label: 'Cámara',
      icon: Camera,
      enabled: config?.require_camera || permissions?.includes('camera'),
    },
    {
      key: 'microphone',
      label: 'Micrófono',
      icon: Mic,
      enabled: config?.require_microphone || permissions?.includes('microphone'),
    },
    {
      key: 'location',
      label: 'Ubicación',
      icon: MapPin,
      enabled: config?.require_location || permissions?.includes('location'),
    },
    {
      key: 'screen',
      label: 'Pantalla',
      icon: Monitor,
      enabled: config?.require_screen || permissions?.includes('screen'),
    },
  ];

  const enabledPermissions = permissionsList.filter((p) => p.enabled);
  const hasPermissions = enabledPermissions.length > 0;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm text-muted-foreground">Permisos Requeridos</h3>
        </div>

        {hasPermissions ? (
          <div className="flex flex-wrap gap-2">
            {enabledPermissions.map((permission) => {
              const Icon = permission.icon;
              return (
                <Badge
                  key={permission.key}
                  variant="secondary"
                  className="pl-2 pr-3 py-1"
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {permission.label}
                </Badge>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
            Sin permisos requeridos
          </div>
        )}

        {/* Info adicional */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            {hasPermissions
              ? `${enabledPermissions.length} permiso${enabledPermissions.length > 1 ? 's' : ''} activo${enabledPermissions.length > 1 ? 's' : ''}`
              : 'Este QR no requiere permisos especiales'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
