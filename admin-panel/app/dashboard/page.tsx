"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, QrCode, Activity, Users, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { QRTable } from "@/components/QRTable";
import type { QRConfig } from "@/components/QRConfigDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ENABLE_QR_LINK_MODULE } from "@/lib/branch-features";

const QRConfigDialog = dynamic(() => import("@/components/QRConfigDialog"), {
  ssr: false,
});

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

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [qrs, setQrs] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadQRs = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const res = await fetch("/api/qr/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setQrs(data.qrs || []);
      }
    } catch (error) {
      console.error("Error loading QRs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Verificar autenticación
    const isAuthenticated = sessionStorage.getItem("admin_authenticated");
    if (isAuthenticated !== "true") {
      router.push("/login");
      return;
    }

    if (!ENABLE_QR_LINK_MODULE) {
      router.push("/dashboard/sessions");
      return;
    }

    loadQRs();
    const interval = setInterval(loadQRs, 5000);
    return () => clearInterval(interval);
  }, [router, loadQRs]);

  const handleCreateQR = async (config: QRConfig) => {
    try {
      if (!config.redirect_url) {
        toast({
          title: "URL destino requerida",
          description: "Agrega el link al que debe entrar el usuario después de aceptar.",
          variant: "destructive",
        });
        return;
      }

      const token = sessionStorage.getItem("auth_token");
      const res = await fetch("/api/qr/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: config.name,
          config: {
            redirect_url: config.redirect_url,
            session_duration_max: config.session_duration_max,
            auto_redirect: config.auto_redirect,
            allowed_countries: config.allowed_countries,
            require_camera: config.require_camera,
            require_microphone: config.require_microphone,
            require_screen: config.require_screen,
            require_location: config.require_location,
          },
          policies: config.policies,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowConfigDialog(false);
        loadQRs();
        toast({
          title: "QR creado exitosamente",
          description: `El QR "${config.name}" ha sido creado.`,
        });
        return;
      }

      toast({
        title: "No se pudo crear el QR",
        description: data.message || data.error || "El backend rechazó la creación del QR.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error creating QR:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el QR. Intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleToggleQR = async (qr: QRCode) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      await fetch(`/api/qr/${qr.id}/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadQRs();
      toast({
        title: qr.isActive ? "QR pausado" : "QR activado",
        description: `El QR "${qr.name}" ha sido ${qr.isActive ? "pausado" : "activado"}.`,
      });
    } catch (error) {
      console.error("Error toggling QR:", error);
    }
  };

  const handleDeleteQR = async (qr: QRCode) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const res = await fetch(`/api/qr/${qr.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        loadQRs();
        toast({
          title: "QR eliminado",
          description: `El QR "${qr.name}" ha sido eliminado.`,
        });
      }
    } catch (error) {
      console.error("Error deleting QR:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el QR.",
        variant: "destructive",
      });
    }
  };

  const handleViewQR = async (qr: QRCode) => {
    setSelectedQR(qr);
    setShowQRDialog(true);

    // Generar QR code
    setTimeout(async () => {
      if (canvasRef.current) {
        const QRCodeLib = await import("qrcode");
        const frontendUrl =
          process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
        const qrUrl = `${frontendUrl}/s/${qr.id}`;
        await QRCodeLib.toCanvas(canvasRef.current, qrUrl, {
          width: 300,
          margin: 2,
        });
      }
    }, 100);
  };

  const handleDownloadQR = async (qr: QRCode) => {
    try {
      const QRCodeLib = await import("qrcode");
      const canvas = document.createElement("canvas");
      const frontendUrl =
        process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
      const qrUrl = `${frontendUrl}/s/${qr.id}`;

      await QRCodeLib.toCanvas(canvas, qrUrl, {
        width: 512,
        margin: 2,
      });

      const link = document.createElement("a");
      link.download = `qr-${qr.name}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "QR descargado",
        description: `El código QR ha sido descargado.`,
      });
    } catch (error) {
      console.error("Error downloading QR:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            QRs
          </h1>
          <p className="text-md text-foreground/80 mt-1">
            Gestión de códigos QR activos
          </p>
        </div>

        <Button
          onClick={() => setShowConfigDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-lg font-bold"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear QR
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-background border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-foreground">Total QRs</p>
                <p className="text-2xl font-bold text-foreground">{qrs.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-card border border-border flex items-center justify-center">
                <QrCode className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-foreground">QRs Activos</p>
                <p className="text-2xl font-bold text-foreground">
                  {qrs.filter((q) => q.isActive).length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-card border border-border flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-foreground">Sesiones Activas</p>
                <p className="text-2xl font-bold text-foreground">
                  {qrs.reduce((sum, qr) => sum + qr.activeSessions, 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-card border border-border flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* QR Table */}
      <Card className="bg-background border shadow-sm">
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <QRTable
              qrs={qrs}
              onView={handleViewQR}
              onToggle={handleToggleQR}
              onDelete={handleDeleteQR}
              onDownload={handleDownloadQR}
            />
          )}
        </CardContent>
      </Card>

      {/* Create QR Dialog */}
      <QRConfigDialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
        onSave={handleCreateQR}
      />

      {/* View QR Dialog */}
      {selectedQR && (
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {selectedQR.name}
              </DialogTitle>
              <DialogDescription className="text-foreground/80">
                Código QR - ID: {selectedQR.id}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <canvas ref={canvasRef} />
            </div>
            <DialogFooter>
              <Button
                className="bg-blue-600"
                onClick={() => handleDownloadQR(selectedQR)}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
