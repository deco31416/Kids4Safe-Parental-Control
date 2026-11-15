"use client";

import { ClipboardList as ClipboardListIcon, Download, Eye, Pause, Play, QrCode, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QRCode {
  id: string;
  name: string;
  createdAt: number;
  createdBy: string;
  isActive: boolean;
  totalScans: number;
  activeSessions: number;
  config?: any;
  policies?: any;
}

interface QRTableProps {
  qrs: QRCode[];
  onView: (qr: QRCode) => void;
  onToggle: (qr: QRCode) => void;
  onDelete: (qr: QRCode) => void;
  onDownload: (qr: QRCode) => void;
}

export function QRTable({
  qrs,
  onView,
  onToggle,
  onDelete,
  onDownload,
}: QRTableProps) {
  const { toast } = useToast();

  if (qrs.length === 0) {
    return (
      <div className="text-center py-10 text-foreground">
        <QrCode className="mx-auto h-12 w-12 mb-3 opacity-20" />
        <p>No hay QRs creados aún</p>
        <p className="text-sm">Crea tu primer QR para empezar</p>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: <> <ClipboardListIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Copiado </>,
      description: "Link copiado al portapapeles",
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-foreground">Nombre</TableHead>
            <TableHead className="text-foreground">URL del QR</TableHead>
            <TableHead className="text-foreground">ID</TableHead>
            <TableHead className="text-foreground">Estado</TableHead>
            <TableHead className="text-foreground hidden md:table-cell">
              Escaneos
            </TableHead>
            <TableHead className="text-foreground hidden md:table-cell">
              Sesiones Activas
            </TableHead>
            <TableHead className="text-foreground text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {qrs.map((qr) => {
            const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

            if (!frontendUrl) {
              console.error("NEXT_PUBLIC_FRONTEND_URL no configurado");
              return null;
            }

            const qrFullUrl = `${frontendUrl}/s/${qr.id}`;

            return (
              <TableRow key={qr.id}>
                <TableCell className="font-medium text-foreground/80">
                  {qr.name}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-md font-medium px-2 py-1 bg-card border-border text-blue-600 rounded-md border  max-w-[300px] truncate">
                      {qrFullUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs font-medium rounded-md bg-blue-600 text-primary-foreground hover:bg-blue-700 hover:text-primary-foreground"
                      onClick={() => copyToClipboard(qrFullUrl)}
                      title="Copiar link"
                    >
                      Copiar
                    </Button>
                  </div>
                </TableCell>

                <TableCell>
                  <code className="text-sm font-medium bg-card border border-border px-2 py-1 text-foreground rounded">
                    {qr.id.substring(0, 8)}...
                  </code>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={qr.isActive ? "default" : "secondary"}
                    className={
                      qr.isActive
                        ? "h-7 bg-green-600 hover:bg-green-500 text-primary-foreground"
                        : "h-7 bg-red-600 hover:bg-red-500 text-primary-foreground"
                    }
                  >
                    {qr.isActive ? "Activo" : "Pausado"}
                  </Badge>
                </TableCell>

                <TableCell className="hidden md:table-cell text-foreground/80">
                  {qr.totalScans}
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <Badge
                    variant="outline"
                    className="border-border h-7 text-sm text-foreground"
                  >
                    {qr.activeSessions}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex justify-end gap-2 text-foreground">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(qr)}
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      className="border-border"
                      size="icon"
                      onClick={() => onToggle(qr)}
                      title={qr.isActive ? "Pausar" : "Activar"}
                    >
                      {qr.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(qr)}
                      title="Descargar QR"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border text-foreground">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">¿Eliminar QR?</AlertDialogTitle>
                          <AlertDialogDescription className="text-foreground opacity-70">
                            Esta acción no se puede deshacer. El QR{" "}
                            <strong>{qr.name}</strong> será eliminado
                            permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(qr)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Sí, Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
