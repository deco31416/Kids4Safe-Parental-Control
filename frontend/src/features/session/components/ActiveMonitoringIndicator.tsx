/**
 * ActiveMonitoringIndicator Component
 * Shows a visual indicator when session is actively being monitored
 */

export default function ActiveMonitoringIndicator() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm ring-1 ring-black/10 dark:ring-white/10 shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span>Monitoreo activo</span>
      </div>
    </div>
  );
}
