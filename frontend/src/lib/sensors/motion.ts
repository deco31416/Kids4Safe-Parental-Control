/**
 * Acelerómetro/Giroscopio (móvil principalmente)
 * 
 * iOS: Requiere permiso explícito
 * Android: Suele funcionar tras interacción
 * PC: NO funciona (no tiene sensores)
 */

export type MotionPayload = {
  // Aceleración (m/s²) incluyendo gravedad
  ax?: number;
  ay?: number;
  az?: number;
  // Rotación (°/s)
  gx?: number; // alpha
  gy?: number; // beta
  gz?: number; // gamma
  interval?: number; // ms entre samples
  timestampMs: number;
};

/**
 * Solicita permiso de movimiento (SOLO iOS)
 * 
 * DEBE llamarse desde un evento de usuario (click, touch)
 * 
 * @throws Error si el permiso es denegado
 */
export async function requestMotionPermission(): Promise<void> {
  const anyMotion: any = DeviceMotionEvent;

  if (typeof anyMotion?.requestPermission === "function") {
    const permission = await anyMotion.requestPermission();
    if (permission !== "granted") {
      throw new Error("Motion permission denied");
    }
  }
}

/**
 * Inicia listener de acelerómetro/giroscopio
 * 
 * IMPORTANTE: En iOS debes llamar primero requestMotionPermission()
 * desde un evento de usuario
 * 
 * @param onData - Callback que recibe cada update
 * @returns Función para detener el listener
 * 
 * @example
 * ```ts
 * button.onclick = async () => {
 *   await requestMotionPermission();
 *   const stop = startMotionListener((m) => {
 *     console.log("Aceleración:", m.ax, m.ay, m.az);
 *   });
 * };
 * ```
 */
export function startMotionListener(
  onData: (data: MotionPayload) => void
): () => void {
  const handler = (event: DeviceMotionEvent) => {
    onData({
      ax: event.accelerationIncludingGravity?.x ?? undefined,
      ay: event.accelerationIncludingGravity?.y ?? undefined,
      az: event.accelerationIncludingGravity?.z ?? undefined,
      gx: event.rotationRate?.alpha ?? undefined,
      gy: event.rotationRate?.beta ?? undefined,
      gz: event.rotationRate?.gamma ?? undefined,
      interval: event.interval ?? undefined,
      timestampMs: Date.now(),
    });
  };

  window.addEventListener("devicemotion", handler, { passive: true });

  return () => {
    window.removeEventListener("devicemotion", handler as any);
  };
}

/**
 * Verifica si el dispositivo soporta motion
 */
export function isMotionSupported(): boolean {
  return "DeviceMotionEvent" in window;
}
