'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database } from 'lucide-react';

interface ConnectionsCardProps {
  redisLabel: string;
  mongodbLabel: string;
}

export function ConnectionsCard({ redisLabel, mongodbLabel }: ConnectionsCardProps) {
  return (
    <Card className="bg-card border-border text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Database className="w-5 h-5" />
          Conexiones
        </CardTitle>
        <CardDescription className="text-foreground opacity-60">
          Estado de las conexiones a servicios externos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-foreground opacity-80">Redis</Label>
          <Input value={redisLabel} disabled />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground opacity-80">MongoDB</Label>
          <Input value={mongodbLabel} disabled />
        </div>
      </CardContent>
    </Card>
  );
}
