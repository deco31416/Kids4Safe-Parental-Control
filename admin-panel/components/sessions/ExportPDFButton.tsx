'use client';

import { Activity, AlertCircle, CheckCircle2, FileDown, FileText, FolderOpen, Loader2, MapPin } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdminAPI } from '@/lib/admin-api';
import { isAdminSessionExpiredError } from '@/lib/admin-auth';
import { AdminPermissionError, settingsErrorMessage } from '@/lib/admin-access';

interface ExportPDFButtonProps {
  sessionId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

/** Reset the export state when the administrator opens another session. */
export function ExportPDFButton(props: ExportPDFButtonProps) {
  return <SessionPdfExportControl key={props.sessionId} {...props} />;
}

function SessionPdfExportControl({ sessionId, variant = 'outline', size = 'default', showLabel = true }: ExportPDFButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const requestInProgress = useRef(false);

  const handleExportPDF = async () => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);
    try {
      const report = await AdminAPI.exportSessionPdf(sessionId);
      setPdfUrl(report.pdfUrl);
    } catch (cause) {
      if (isAdminSessionExpiredError(cause)) {
        setOpen(false);
        return;
      }
      if (cause instanceof AdminPermissionError) {
        setPermissionDenied(true);
        setError('Tu cuenta necesita el permiso «Exportar reportes» para generar este PDF.');
      } else {
        setError(settingsErrorMessage(cause, 'No se pudo generar el reporte. Inténtalo de nuevo.'));
      }
    } finally {
      requestInProgress.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="kids-pdf-export-trigger gap-2" aria-label="Exportar reporte PDF">
          <FileDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          {showLabel && <span>Exportar PDF</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="kids-pdf-export-dialog">
        <DialogHeader className="text-left">
          <span className="kids-pdf-export-icon" aria-hidden="true"><FileText /></span>
          <DialogTitle className="pr-6 text-xl font-bold">Exportar reporte</DialogTitle>
          <DialogDescription className="leading-relaxed">Genera un PDF con la información y la actividad registradas en esta sesión.</DialogDescription>
        </DialogHeader>

        <div className="kids-pdf-export-body">
          {pdfUrl ? (
            <div className="kids-pdf-export-ready" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div><h3>Tu reporte está listo</h3><p>Abre el PDF para consultarlo o guardarlo en tu dispositivo.</p></div>
            </div>
          ) : (
            <div className="kids-pdf-export-content">
              <p className="kids-pdf-export-label">Contenido del reporte</p>
              <div className="kids-pdf-export-row"><span aria-hidden="true"><Activity /></span><div><h3>Actividad de la sesión</h3><p>Eventos registrados en orden cronológico.</p></div></div>
              <div className="kids-pdf-export-row"><span aria-hidden="true"><MapPin /></span><div><h3>Ubicación e información del dispositivo</h3><p>Datos de red y ubicaciones disponibles.</p></div></div>
              <div className="kids-pdf-export-row"><span aria-hidden="true"><FolderOpen /></span><div><h3>Evidencias registradas</h3><p>Referencias a capturas y grabaciones, cuando existan.</p></div></div>
            </div>
          )}
  
          <div className="kids-pdf-export-session"><span>Sesión</span><span className="font-mono">{sessionId}</span></div>
        </div>
        {error && <div className="kids-pdf-export-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p></div>}
        {isLoading && <p className="kids-pdf-export-progress" role="status">Generando tu reporte. Esto puede tardar unos segundos.</p>}

        <DialogFooter className="kids-pdf-export-footer">
          <Button variant="outline" onClick={() => setOpen(false)}>{pdfUrl || permissionDenied ? 'Cerrar' : 'Cancelar'}</Button>
          {pdfUrl ? (
            <Button asChild className="gap-2"><a href={pdfUrl} target="_blank" rel="noopener noreferrer"><FileDown className="h-4 w-4" aria-hidden="true" />Abrir PDF</a></Button>
          ) : !permissionDenied ? (
            <Button onClick={handleExportPDF} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
              {isLoading ? 'Generando…' : error ? 'Reintentar' : 'Generar PDF'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
