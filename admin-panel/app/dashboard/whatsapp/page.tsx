'use client';

import { AlertCircle, CheckCircle2, Clock, Globe as GlobeIcon, Megaphone as MegaphoneIcon, MessageCircle, MessageSquare as MessageSquareIcon, PartyPopper as PartyPopperIcon, Phone, QrCode as QrIcon, Send, Users } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function WhatsAppPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [selectedQR, setSelectedQR] = useState('');

  // Mock data - reemplazar con datos reales del backend
  const campaigns = [
    {
      id: '1',
      name: 'Campaña Promocional Enero',
      status: 'active',
      sent: 150,
      delivered: 145,
      read: 120,
      createdAt: '2026-01-10',
    },
    {
      id: '2',
      name: 'Recordatorio de Sesiones',
      status: 'completed',
      sent: 85,
      delivered: 82,
      read: 70,
      createdAt: '2026-01-08',
    },
    {
      id: '3',
      name: 'Feedback Post-Sesión',
      status: 'scheduled',
      sent: 0,
      delivered: 0,
      read: 0,
      createdAt: '2026-01-15',
    },
  ];

  const handleSendMessage = () => {
    console.log('Enviando mensaje:', { phoneNumber, message, qrId: selectedQR });
    // Implementar lógica de envío
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Activa</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">Completada</Badge>;
      case 'scheduled':
        return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Programada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageCircle className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Kids4Safe WhatsApp</h1>
          <p className="text-muted-foreground">
            Envía mensajes y gestiona campañas de WhatsApp a usuarios que escanearon QRs
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Enviados</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,284</div>
            <p className="text-xs text-muted-foreground">+18% desde el mes pasado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Entrega</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96.5%</div>
            <p className="text-xs text-muted-foreground">1,239 de 1,284 entregados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Lectura</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82.3%</div>
            <p className="text-xs text-muted-foreground">1,020 mensajes leídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">892</div>
            <p className="text-xs text-muted-foreground">Con sesiones en último mes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Send Message Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Mensaje Individual
            </CardTitle>
            <CardDescription>
              Envía un mensaje de WhatsApp a un número específico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de WhatsApp</Label>
              <div className="flex gap-2">
                <Select defaultValue="+593">
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+593"><GlobeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Ecuador +593</SelectItem>
                    <SelectItem value="+1"><GlobeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Estados Unidos +1</SelectItem>
                    <SelectItem value="+52"><GlobeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> México +52</SelectItem>
                    <SelectItem value="+57"><GlobeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Colombia +57</SelectItem>
                    <SelectItem value="+51"><GlobeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Perú +51</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  placeholder="999999999"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                El número debe estar registrado en WhatsApp
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr">QR Relacionado (Opcional)</Label>
              <Select value={selectedQR} onValueChange={setSelectedQR}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un QR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qr-001">QR Promoción Enero</SelectItem>
                  <SelectItem value="qr-002">QR Evento Principal</SelectItem>
                  <SelectItem value="qr-003">QR Registro VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Escribe tu mensaje aquí..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Máximo 1,000 caracteres
              </p>
            </div>

            <Button
              onClick={handleSendMessage}
              className="w-full"
              disabled={!phoneNumber || !message}
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar Mensaje
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrIcon className="h-5 w-5" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Atajos para enviar mensajes masivos basados en QRs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Enviar a todos los usuarios del QR-001
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Clock className="mr-2 h-4 w-4" />
              Enviar a sesiones activas del último día
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <AlertCircle className="mr-2 h-4 w-4" />
              Enviar recordatorio a usuarios inactivos
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Enviar encuesta post-sesión
            </Button>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Plantillas Predefinidas</h4>
              <div className="space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <MegaphoneIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Promoción especial
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <PartyPopperIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Bienvenida nuevo usuario
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Clock className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Recordatorio de sesión
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <MessageSquareIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Solicitud de feedback
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campañas de WhatsApp</CardTitle>
              <CardDescription>
                Historial y estado de tus campañas de mensajería
              </CardDescription>
            </div>
            <Button>
              <MessageCircle className="mr-2 h-4 w-4" />
              Nueva Campaña
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Enviados</TableHead>
                <TableHead className="text-right">Entregados</TableHead>
                <TableHead className="text-right">Leídos</TableHead>
                <TableHead className="text-right">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell className="text-right">{campaign.sent}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-green-600 font-medium">
                      {campaign.delivered}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-blue-600 font-medium">
                      {campaign.read}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {campaign.createdAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Integration Info */}
      <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-700">
            <AlertCircle className="h-5 w-5" />
            Configuración de API de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800 dark:text-yellow-700">
          <p>
            Para habilitar el envío de mensajes, configura tu API de WhatsApp Business en la sección de{' '}
            <a href="/dashboard/settings" className="underline font-medium">
              Configuración
            </a>
            .
          </p>
          <p className="mt-2">
            Necesitarás: Token de acceso, ID de teléfono verificado y URL del webhook.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
