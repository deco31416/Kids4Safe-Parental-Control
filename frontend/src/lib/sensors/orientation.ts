/**
 * Brújula/Orientación del dispositivo (móvil principalmente)
 * 
 * iOS: Requiere permiso explícito por gesto del usuario
 * Android: Suele funcionar tras interacción
 * PC: NO funciona (no tiene sensores)
 */

export type OrientationPayload = {
  alpha?: number; // 0-360° (brújula, norte = 0)
  beta?: number; // -180..180° (inclinación adelante/atrás)
  gamma?: number; // -90..90° (inclinación izq/der)
  absolute?: boolean;
  timestampMs: number;
};

/**
 * Solicita permiso de orientación (SOLO iOS)
 * En Android/PC no hace nada
 * 
 * DEBE llamarse desde un evento de usuario (click, touch)
 * 
 * @throws Error si el permiso es denegado
 */
export async function requestOrientationPermission(): Promise<void> {
  // iOS requiere permiso explícito desde iOS 13+
  const anyDeviceOrientation: any = DeviceOrientationEvent;

  if (
    typeof anyDeviceOrientation?.requestPermission === "function"
  ) {
    const permission = await anyDeviceOrientation.requestPermission();
    if (permission !== "granted") {
      throw new Error("Orientation permission denied");
    }
  }
  // En Android/PC no hay requestPermission, se permite automáticamente
}

/**
 * Inicia listener de orientación
 * 
 * IMPORTANTE: En iOS debes llamar primero requestOrientationPermission()
 * desde un evento de usuario (click)
 * 
 * @param onData - Callback que recibe cada update
 * @returns Función para detener el listener
 * 
 * @example
 * ```ts
 * // En iOS:
 * button.onclick = async () => {
 *   await requestOrientationPermission();
 *   const stop = startOrientationListener((o) => {
 *     console.log("Brújula:", o.alpha);
 *   });
 * };
 * ```
 */
export function startOrientationListener(
  onData: (data: OrientationPayload) => void
): () => void {
  const handler = (event: DeviceOrientationEvent) => {
    onData({
      alpha: event.alpha ?? undefined,
      beta: event.beta ?? undefined,
      gamma: event.gamma ?? undefined,
      absolute: event.absolute ?? undefined,
      timestampMs: Date.now(),
    });
  };

  window.addEventListener("deviceorientation", handler, { passive: true });

  return () => {
    window.removeEventListener("deviceorientation", handler as any);
  };
}

/**
 * Verifica si el dispositivo soporta orientación
 */
export function isOrientationSupported(): boolean {
  return "DeviceOrientationEvent" in window;
}
