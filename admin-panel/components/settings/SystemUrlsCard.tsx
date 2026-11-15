'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';

interface SystemUrlsCardProps {
  backendUrl: string;
  frontendUrl: string;
  adminUrl: string;
}

export function SystemUrlsCard({ backendUrl, frontendUrl, adminUrl }: SystemUrlsCardProps) {
  return (
    <Card className="bg-card border-border text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Globe className="w-5 h-5" />
          URLs del Sistema
        </CardTitle>
        <CardDescription className="text-foreground opacity-60">
          Configuración de URLs de los servicios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-foreground opacity-80">Backend URL</Label>
          <Input value={backendUrl} disabled />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground opacity-80">Frontend URL</Label>
          <Input value={frontendUrl} disabled />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground opacity-80">Admin Panel URL</Label>
          <Input value={adminUrl} disabled />
        </div>
        <p className="text-sm text-foreground opacity-60">
          Las URLs se configuran en los archivos .env de cada servicio
        </p>
      </CardContent>
    </Card>
  );
}
