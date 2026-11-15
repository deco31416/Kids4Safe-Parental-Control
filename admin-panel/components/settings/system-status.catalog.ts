import {
  Database,
  Globe,
  HardDrive,
  Server,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export type ServiceEntry = {
  key: string;
  label: string;
  description?: string;
  fallbackPort?: number;
  Icon: typeof Server;
};

export const CORE_SERVICES: ServiceEntry[] = [
  { key: 'apiGateway', label: 'API Gateway', description: 'Backend NestJS', Icon: Server },
  { key: 'frontend', label: 'Frontend QR / Link', description: 'Experiencia web del usuario', Icon: Globe },
  { key: 'adminPanel', label: 'Admin Panel', description: 'Consola administrativa', Icon: ShieldCheck },
  { key: 'mobileApp', label: 'App móvil', description: 'App web y nativa', Icon: Smartphone },
];

export const INFRASTRUCTURE_SERVICES: ServiceEntry[] = [
  { key: 'redis', label: 'Redis', description: 'Tiempo real, caché y sesiones', Icon: HardDrive },
  { key: 'mongodb', label: 'MongoDB', description: 'Datos persistentes y auditoría', Icon: Database },
];

export const MICROSERVICES: ServiceEntry[] = [
  { key: 'deviceInfo', label: 'Device Info', fallbackPort: 5001, Icon: Server },
  { key: 'location', label: 'Location & Geofence', fallbackPort: 5002, Icon: Server },
  { key: 'screenRecorder', label: 'Screen Recorder', fallbackPort: 5003, Icon: Server },
  { key: 'sessionOrchestrator', label: 'Session Orchestrator', fallbackPort: 5005, Icon: Server },
  { key: 'auditLog', label: 'Audit Log', fallbackPort: 5006, Icon: Server },
  { key: 'policyEngine', label: 'Policy Engine', fallbackPort: 5007, Icon: Server },
  { key: 'locationTrack', label: 'Location Track', fallbackPort: 5008, Icon: Server },
  { key: 'ipClassifier', label: 'IP Classifier', fallbackPort: 5009, Icon: Server },
];
