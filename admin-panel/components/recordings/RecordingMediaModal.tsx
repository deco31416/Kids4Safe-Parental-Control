'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ActiveSession } from '@/lib/admin-api';
import { AlertTriangle, Download, Loader2, Music, RefreshCw, Trash2, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { recordingUrl, type SessionRecording } from './recording-media.types';
import { useSessionRecordings } from './useSessionRecordings';

type Props = { session: ActiveSession | null; open: boolean; onClose: () => void };

function fileSize(bytes?: number) {
  if (!bytes) return 'Tamaño desconocido';
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

function label(recording: SessionRecording) {
  return `${recording.format || recording.mimeType || 'video'} · ${fileSize(recording.sizeBytes)}`;
}

function isAudio(recording: SessionRecording) {
  return recording.mimeType?.startsWith('audio/') || recording.metadata?.tracks?.includes('audio');
}

export function RecordingMediaModal({ session, open, onClose }: Props) {
  const media = useSessionRecordings(session?.sessionId, open);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { setSelected(new Set()); }, [open, media.recordings.length]);

  const removeOne = async (id: string) => {
    if (confirm('¿Eliminar definitivamente esta grabación?')) await media.removeOne(id);
  };

  const removeSelected = async () => {
    if (!selected.size || !confirm(`¿Eliminar definitivamente ${selected.size} grabaciones?`)) return;
    if (await media.removeMany(Array.from(selected))) setSelected(new Set());
  };

  const removeAll = async () => {
    if (!media.recordings.length || !confirm('¿Eliminar TODAS las grabaciones de esta sesión?')) return;
    if (await media.removeAll()) setSelected(new Set());
  };

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Video className="h-5 w-5" />Grabaciones</DialogTitle>
          <DialogDescription className="sr-only">
            Reproduce, descarga o elimina las grabaciones almacenadas de esta sesión.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className="bg-muted text-foreground">{media.recordings.length} archivos</Badge>
          <div className="flex flex-wrap gap-2">
            {selected.size > 0 && <Button variant="destructive" size="sm" disabled={media.deleting} onClick={removeSelected}><Trash2 className="mr-2 h-4 w-4" />Eliminar ({selected.size})</Button>}
            <Button variant="destructive" size="sm" disabled={media.deleting || !media.recordings.length} onClick={removeAll}>Eliminar todos</Button>
            <Button variant="outline" size="sm" disabled={media.loading} onClick={media.load}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
          </div>
        </div>
        {media.error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{media.error}</AlertDescription></Alert>}
        {media.loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        {!media.loading && !media.recordings.length && <div className="py-12 text-center text-foreground/60"><Video className="mx-auto mb-3 h-12 w-12 opacity-30" /><p>No hay grabaciones registradas para esta sesión.</p></div>}
        <div className="grid gap-4 md:grid-cols-2">
          {media.recordings.map((recording) => {
            const url = recordingUrl(recording);
            return (
              <article key={recording._id} className="space-y-3 rounded-lg border border-border bg-card p-3">
                {url && isAudio(recording)
                  ? <div className="flex aspect-video flex-col items-center justify-center gap-4 rounded bg-background px-4"><Music className="h-12 w-12 text-blue-700" /><audio controls preload="metadata" src={url} className="w-full" /></div>
                  : url
                  ? <video controls preload="metadata" src={url} className="aspect-video w-full rounded bg-background" />
                  : <div className="flex aspect-video items-center justify-center rounded bg-background text-sm text-foreground/50">Archivo sin URL disponible</div>}
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 items-start gap-2 text-sm">
                    <input type="checkbox" checked={selected.has(recording._id)} onChange={() => toggle(recording._id)} className="mt-1 accent-blue-500" />
                    <span className="min-w-0"><span className="block truncate">{label(recording)}</span><span className="text-xs text-foreground/50">{new Date(recording.uploadedAt).toLocaleString('es-ES')}</span></span>
                  </label>
                  <div className="flex shrink-0 gap-1">
                    {url && <Button asChild size="icon" variant="ghost"><a href={url} download><Download className="h-4 w-4" /></a></Button>}
                    <Button size="icon" variant="ghost" disabled={media.deleting} onClick={() => void removeOne(recording._id)}><Trash2 className="h-4 w-4 text-red-700" /></Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
