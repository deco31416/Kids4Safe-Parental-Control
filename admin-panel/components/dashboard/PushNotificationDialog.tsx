'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PushNotificationForm } from '@/components/PushNotificationForm';
export function PushNotificationDialog({ open, targetSessions, onClose }: { open: boolean; targetSessions: string[]; onClose: () => void }) {
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="max-w-2xl border-border bg-card p-0 sm:p-0 [&>button]:hidden">
      <DialogHeader className="sr-only"><DialogTitle>Notificación push</DialogTitle><DialogDescription>Selecciona el tipo de aviso y sus destinatarios antes de enviarlo.</DialogDescription></DialogHeader>
      <PushNotificationForm targetSessions={targetSessions} onClose={onClose} />
    </DialogContent>
  </Dialog>;
}
