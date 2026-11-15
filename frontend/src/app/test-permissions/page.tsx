'use client';

import { useState } from 'react';
import { 
  requestAllPermissions, 
  requestEssentialPermissions,
  requestCameraPermission,
  requestMicrophonePermission,
  requestGeolocationPermission,
  requestNotificationPermission,
  requestScreenCapturePermission,
  requestDeviceMotionPermission,
  requestDeviceOrientationPermission,
  requestClipboardPermission,
  requestBluetoothPermission,
  requestUSBPermission,
  requestMIDIPermission,
  requestPersistentStorage,
  AllPermissionsStatus,
} from '@/lib/permissions-manager';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function PermissionsTestPage() {
  const [status, setStatus] = useState<AllPermissionsStatus | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleRequestAll = async () => {
    setLoading('all');
    addLog('🚀 Solicitando TODOS los permisos...');
    try {
      const result = await requestAllPermissions();
      setStatus(result);
      addLog('✅ Solicitud completada');
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
    setLoading(null);
  };

  const handleRequestEssential = async () => {
    setLoading('essential');
    addLog('🎯 Solicitando permisos esenciales...');
    try {
      await requestEssentialPermissions();
      addLog('✅ Permisos esenciales solicitados');
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
    setLoading(null);
  };

  const handleIndividualPermission = async (name: string, fn: () => Promise<any>) => {
    setLoading(name);
    addLog(`🔄 Solicitando ${name}...`);
    try {
      await fn();
      addLog(`✅ ${name} concedido`);
    } catch (error: any) {
      addLog(`❌ ${name} - Error: ${error.message}`);
    }
    setLoading(null);
  };

  const getStatusIcon = (permStatus: any) => {
    if (!permStatus) return <AlertCircle className="h-5 w-5 text-gray-400" />;
    if (permStatus.granted) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (permStatus.denied) return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const permissions = [
    { key: 'camera', label: '📷 Cámara Frontal', fn: () => requestCameraPermission('user') },
    { key: 'cameraRear', label: '📷 Cámara Trasera', fn: () => requestCameraPermission('environment') },
    { key: 'microphone', label: '🎤 Micrófono', fn: requestMicrophonePermission },
    { key: 'geolocation', label: '📍 GPS/Geolocalización', fn: requestGeolocationPermission },
    { key: 'notifications', label: '🔔 Notificaciones Push', fn: requestNotificationPermission },
    { key: 'screenCapture', label: '🖥️ Compartir Pantalla', fn: requestScreenCapturePermission },
    { key: 'deviceMotion', label: '📱 Acelerómetro (Movimiento)', fn: requestDeviceMotionPermission },
    { key: 'deviceOrientation', label: '🧭 Giroscopio (Orientación)', fn: requestDeviceOrientationPermission },
    { key: 'clipboard', label: '📋 Portapapeles/Clipboard', fn: requestClipboardPermission },
    { key: 'bluetooth', label: '🔵 Bluetooth', fn: requestBluetoothPermission },
    { key: 'usb', label: '🔌 USB', fn: requestUSBPermission },
    { key: 'midi', label: '🎹 MIDI', fn: requestMIDIPermission },
    { key: 'persistentStorage', label: '💾 Almacenamiento Persistente', fn: requestPersistentStorage },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            🔐 Sistema de Permisos Kids4Safe
          </h1>
          <p className="text-base md:text-lg text-neutral-600">
            Prueba y gestiona todos los permisos del navegador
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleRequestAll}
            disabled={loading !== null}
            className="bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(0,0,0,0.10)]"
          >
            {loading === 'all' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Solicitando...
              </>
            ) : (
              <>🚀 Solicitar TODOS los Permisos</>
            )}
          </button>

          <button
            onClick={handleRequestEssential}
            disabled={loading !== null}
            className="bg-white text-neutral-900 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ring-1 ring-black/10 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
          >
            {loading === 'essential' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Solicitando...
              </>
            ) : (
              <>🎯 Solicitar Permisos Esenciales</>
            )}
          </button>
        </div>

        {/* Individual Permissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {permissions.map(({ key, label, fn }) => {
            const permStatus = status?.[key as keyof AllPermissionsStatus];
            return (
              <button
                key={key}
                onClick={() => handleIndividualPermission(label, fn)}
                disabled={loading !== null}
                className="bg-white ring-1 ring-black/5 hover:ring-black/10 disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-xl transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {loading === label ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  ) : (
                    getStatusIcon(permStatus)
                  )}
                  <span className="font-medium text-left">{label}</span>
                </div>
                {permStatus && (
                  <span className="text-xs text-neutral-500">
                    {permStatus.granted ? 'OK' : permStatus.denied ? 'Denegado' : 'Pendiente'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Status Summary */}
        {status && (
          <div className="bg-white ring-1 ring-black/5 rounded-2xl p-6 mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <h2 className="text-xl font-semibold mb-4">📊 Estado de Permisos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 ring-1 ring-green-200/70 rounded-xl p-4">
                <div className="text-3xl font-semibold text-green-700">
                  {Object.values(status).filter(s => s.granted).length}
                </div>
                <div className="text-sm text-neutral-600">Concedidos</div>
              </div>
              <div className="bg-red-50 ring-1 ring-red-200/70 rounded-xl p-4">
                <div className="text-3xl font-semibold text-red-700">
                  {Object.values(status).filter(s => s.denied).length}
                </div>
                <div className="text-sm text-neutral-600">Denegados</div>
              </div>
              <div className="bg-yellow-50 ring-1 ring-yellow-200/70 rounded-xl p-4">
                <div className="text-3xl font-semibold text-yellow-700">
                  {Object.values(status).filter(s => s.prompt).length}
                </div>
                <div className="text-sm text-neutral-600">Pendientes</div>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-white ring-1 ring-black/5 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-semibold mb-4">📝 Registro de Actividad</h2>
          <div className="bg-neutral-50 ring-1 ring-black/5 rounded-xl p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-neutral-500 text-center py-8">
                No hay registros aún. Solicita algunos permisos para comenzar.
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-neutral-700 mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-white ring-1 ring-black/5 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <h3 className="text-lg font-semibold mb-3">ℹ️ Información</h3>
          <ul className="space-y-2 text-neutral-700">
            <li>• <strong>Permisos Esenciales:</strong> Cámara, Micrófono, GPS, Notificaciones y Pantalla</li>
            <li>• <strong>Compatibilidad:</strong> Algunos permisos pueden no estar disponibles en todos los navegadores</li>
            <li>• <strong>Seguridad:</strong> Los permisos son manejados de forma segura por el navegador</li>
            <li>• <strong>Revocación:</strong> Puedes revocar permisos en la configuración del navegador</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
