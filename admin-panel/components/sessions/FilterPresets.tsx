'use client';

import { AlertCircle as AlertCircleIcon, AlertTriangle as AlertTriangleIcon, Ban as BanIcon, CheckCircle2 as CheckCircle2Icon, Filter, MapPin as MapPinIcon, Save, Star, Trash2, X, XCircle as XCircleIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'BloomProtect-filter-presets';
const MAX_CUSTOM_PRESETS = 10;

// Presets predefinidos (no editables)
const PREDEFINED_PRESETS = [
  {
    id: 'last-24h-active',
    name: 'Últimas 24h - Activas',
    filters: {
      timeRange: '24h',
      status: 'active',
    },
    icon: <CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" />,
  },
  {
    id: 'risk-critical-week',
    name: 'Riesgo CRITICAL - Última semana',
    filters: {
      timeRange: '7d',
      riskLevel: 'critical',
    },
    icon: <AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" />,
  },
  {
    id: 'rejected-month',
    name: 'Sesiones rechazadas - Último mes',
    filters: {
      timeRange: '30d',
      status: 'rejected',
    },
    icon: <BanIcon className="inline-block h-4 w-4 shrink-0 align-middle text-rose-600" aria-hidden="true" />,
  },
  {
    id: 'gps-alerts-today',
    name: 'Alertas GPS - Hoy',
    filters: {
      timeRange: 'today',
      hasGpsAlert: true,
    },
    icon: <MapPinIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
  },
];

interface CustomPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: number;
}

interface FilterPresetsProps {
  currentFilters: Record<string, any>;
  onApplyPreset: (filters: Record<string, any>) => void;
  onClearFilters: () => void;
}

/**
 * Componente para gestionar presets de filtros en SessionsTable
 * 
 * Features:
 * - 4 presets predefinidos (no editables)
 * - Custom presets guardados en localStorage (max 10)
 * - Guardar filtro actual como preset
 * - Eliminar custom presets
 * - Badge contador de filtros activos
 */
export function FilterPresets({
  currentFilters,
  onApplyPreset,
  onClearFilters,
}: FilterPresetsProps) {
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const { toast } = useToast();

  // Cargar custom presets desde localStorage
  useEffect(() => {
    loadCustomPresets();
  }, []);

  const loadCustomPresets = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const presets = JSON.parse(stored);
        setCustomPresets(presets);
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const saveCustomPresets = (presets: CustomPreset[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      setCustomPresets(presets);
    } catch (error) {
      console.error('Error saving presets:', error);
      toast({
        title: <> <XCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Error </>,
        description: 'No se pudo guardar el preset',
        variant: 'destructive',
      });
    }
  };

  const handleSaveCurrentFilters = () => {
    if (!newPresetName.trim()) {
      toast({
        title: <> <AlertTriangleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Nombre requerido </>,
        description: 'Ingresa un nombre para el preset',
        variant: 'destructive',
      });
      return;
    }

    if (customPresets.length >= MAX_CUSTOM_PRESETS) {
      toast({
        title: <> <AlertTriangleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Límite alcanzado </>,
        description: `Máximo ${MAX_CUSTOM_PRESETS} presets custom. Elimina uno primero.`,
        variant: 'destructive',
      });
      return;
    }

    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      filters: { ...currentFilters },
      createdAt: Date.now(),
    };

    const updatedPresets = [...customPresets, newPreset];
    saveCustomPresets(updatedPresets);

    toast({
      title: <> <CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Preset guardado </>,
      description: `"${newPresetName}" guardado exitosamente`,
    });

    setNewPresetName('');
    setSaveDialogOpen(false);
  };

  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = customPresets.filter((p) => p.id !== presetId);
    saveCustomPresets(updatedPresets);

    toast({
      title: <> <Trash2 className="inline-block h-4 w-4 shrink-0 align-middle text-muted-foreground" aria-hidden="true" /> Preset eliminado </>,
      description: 'Preset eliminado correctamente',
    });
  };

  const handleApplyPreset = (filters: Record<string, any>) => {
    onApplyPreset(filters);
    toast({
      title: <> <CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Filtro aplicado </>,
      description: 'Preset aplicado a la tabla',
    });
  };

  // Contar filtros activos
  const activeFiltersCount = Object.keys(currentFilters).filter(
    (key) => currentFilters[key] !== null && currentFilters[key] !== undefined && currentFilters[key] !== ''
  ).length;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {/* Dropdown Presets */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className='w-full border-border bg-card sm:w-auto'>
            <Filter className="mr-2 h-4 w-4" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-2rem)] bg-card border border-border text-foreground">
          {/* Presets predefinidos */}
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">
            Presets predefinidos
          </DropdownMenuLabel>
          {PREDEFINED_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => handleApplyPreset(preset.filters)}
              className="cursor-pointer gap-2 py-2"
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">{preset.icon}</span>
              <span className="flex-1">{preset.name}</span>
            </DropdownMenuItem>
          ))}

          {/* Custom presets */}
          {customPresets.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase flex items-center justify-between">
                <span>Mis Presets</span>
                <Badge variant="outline" className="text-xs">
                  {customPresets.length}/{MAX_CUSTOM_PRESETS}
                </Badge>
              </DropdownMenuLabel>
              {customPresets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  className="cursor-pointer flex items-center justify-between"
                  onSelect={(e) => e.preventDefault()}
                >
                  <button
                    onClick={() => handleApplyPreset(preset.filters)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="flex-1">{preset.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePreset(preset.id)}
                    className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />

          {/* Acciones */}
          <DropdownMenuItem
            onClick={() => setSaveDialogOpen(true)}
            className="cursor-pointer text-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar filtro actual
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onClearFilters}
            className="cursor-pointer text-foreground/70"
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Badge de filtros activos */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="gap-2 text-foreground/70 hover:text-foreground"
        >
          <X className="h-3 w-3" />
          <span className="text-xs">Limpiar ({activeFiltersCount})</span>
        </Button>
      )}

      {/* Dialog para guardar preset */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border text-foreground">
          <DialogHeader>
            <DialogTitle><Save className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Guardar Preset</DialogTitle>
            <DialogDescription>
              Guarda tu filtro actual como preset para usarlo después
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del preset</label>
              <Input
                placeholder="Ej: Sesiones críticas última semana"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCurrentFilters();
                  }
                }}
                maxLength={50}
              />
            </div>

            {/* Preview de filtros actuales */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/60">
                Filtros que se guardarán:
              </label>
              <div className="bg-muted/60 border border-border rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(currentFilters).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono">
                      {key}
                    </Badge>
                    <span className="text-foreground/50">=</span>
                    <span className="text-foreground/90 font-medium">
                      {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setNewPresetName('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCurrentFilters}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
