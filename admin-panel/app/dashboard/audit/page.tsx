"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, FileText, AlertCircle } from "lucide-react";
import { AdminAPI } from "@/lib/admin-api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ForensicDisclaimerBanner } from "@/components/ForensicDisclaimerBanner";

type AuditLog = {
  _id: string;
  timestamp: string;
  eventType: string;
  actorType: "user" | "admin" | "system";
  actorUsername?: string;
  qrId?: string;
  sessionId?: string;
  metadata?: any;
  ip?: string;
  severity?: "info" | "warning" | "critical";
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    qrId: "",
    sessionId: "",
    eventType: "",
  });

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters.qrId) queryParams.set("qrId", filters.qrId);
      if (filters.sessionId) queryParams.set("sessionId", filters.sessionId);
      if (filters.eventType) queryParams.set("eventType", filters.eventType);
      queryParams.set("limit", "100");

      const res = await AdminAPI.getAuditLogs(queryParams.toString());
      setLogs(res.logs || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar logs");
    } finally {
      setLoading(false);
    }
  }

  function getSeverityColor(severity?: string) {
    if (severity === "critical") return "destructive";
    if (severity === "warning") return "secondary";
    return "default";
  }

  function getActorColor(actorType: string) {
    if (actorType === "admin") return "default";
    if (actorType === "system") return "secondary";
    return "outline";
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Logs de eventos del sistema (compliance legal)
        </p>
      </div>

      {/* Disclaimer legal forense - CRÍTICO para gov */}
      <ForensicDisclaimerBanner />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="QR ID"
              value={filters.qrId}
              onChange={(e) => setFilters({ ...filters, qrId: e.target.value })}
            />
            <Input
              placeholder="Session ID"
              value={filters.sessionId}
              onChange={(e) => setFilters({ ...filters, sessionId: e.target.value })}
            />
            <Input
              placeholder="Tipo de evento"
              value={filters.eventType}
              onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={loadLogs}>
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ qrId: "", sessionId: "", eventType: "" });
                loadLogs();
              }}
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Cargando logs...</span>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No hay logs con estos filtros</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {logs.length} eventos encontrados
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-xs font-medium">Fecha/Hora</th>
                        <th className="text-left p-3 text-xs font-medium">Evento</th>
                        <th className="text-left p-3 text-xs font-medium">Actor</th>
                        <th className="text-left p-3 text-xs font-medium">QR</th>
                        <th className="text-left p-3 text-xs font-medium">Sesión</th>
                        <th className="text-left p-3 text-xs font-medium">IP</th>
                        <th className="text-left p-3 text-xs font-medium">Severidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log._id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-xs">
                            {new Date(log.timestamp).toLocaleString("es-ES", {
                              dateStyle: "short",
                              timeStyle: "medium",
                            })}
                          </td>
                          <td className="p-3 text-xs font-mono">{log.eventType}</td>
                          <td className="p-3 text-xs">
                            <Badge variant={getActorColor(log.actorType)}>
                              {log.actorUsername || log.actorType}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs font-mono">
                            {log.qrId?.substring(0, 8) || "—"}
                          </td>
                          <td className="p-3 text-xs font-mono">
                            {log.sessionId?.substring(0, 8) || "—"}
                          </td>
                          <td className="p-3 text-xs">{log.ip || "—"}</td>
                          <td className="p-3 text-xs">
                            {log.severity && (
                              <Badge variant={getSeverityColor(log.severity)}>
                                {log.severity}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <Card key={log._id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-mono">{log.eventType}</p>
                    {log.severity && (
                      <Badge variant={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString("es-ES", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Badge variant={getActorColor(log.actorType)}>
                      {log.actorUsername || log.actorType}
                    </Badge>
                    {log.qrId && (
                      <Badge variant="outline">QR: {log.qrId.substring(0, 8)}</Badge>
                    )}
                  </div>

                  {log.ip && (
                    <div className="text-xs text-muted-foreground">IP: {log.ip}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
