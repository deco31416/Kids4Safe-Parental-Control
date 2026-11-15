'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key } from 'lucide-react';

interface SecuritySystemCardProps {
  jwtSecretLabel: string;
}

export function SecuritySystemCard({ jwtSecretLabel }: SecuritySystemCardProps) {
  return (
    <Card className="bg-card border-border text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Key className="w-5 h-5" />
          Seguridad (Sistema)
        </CardTitle>
        <CardDescription className="text-foreground opacity-60">
          Configuración de autenticación y seguridad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-foreground opacity-80">JWT Secret</Label>
          <Input value={jwtSecretLabel} type="password" disabled />
          <p className="text-sm text-foreground opacity-60">
            El secret se configura en las variables de entorno
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
