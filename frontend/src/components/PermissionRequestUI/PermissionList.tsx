import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { AllPermissionsStatus, PermissionStatus } from '@/lib/permissions-manager';
import type { PermissionItem } from './permission-data';

type PermissionListProps = {
  permissions: PermissionItem[];
  statuses: AllPermissionsStatus | null;
};

function getStatusIcon(status: PermissionStatus) {
  if (status.granted) return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (status.denied) return <XCircle className="w-4 h-4 text-red-600" />;
  return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
}

function getStatusText(status: PermissionStatus) {
  if (status.granted) return 'Concedido';
  if (status.denied) return 'Denegado';
  return 'Pendiente';
}

export function PermissionList({ permissions, statuses }: PermissionListProps) {
  return (
    <div className="space-y-2">
      {permissions.map((permission) => (
        <div
          key={permission.key}
          className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <div className="flex-shrink-0 text-blue-600">
            {permission.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {permission.name}
              {permission.essential && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  Esencial
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">{permission.description}</p>
          </div>
          {statuses && (
            <div className="flex items-center gap-2">
              {getStatusIcon(statuses[permission.key])}
              <span className="text-sm font-medium">
                {getStatusText(statuses[permission.key])}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
