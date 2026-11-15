'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';

type Props = {
  disabled?: boolean;
  hasPhoto: boolean;
  onRemove: () => Promise<void>;
};

export function RemoveStoredPhotoButton({ disabled, hasPhoto, onRemove }: Props) {
  const remove = async () => {
    if (!confirm('¿Quitar esta foto y eliminar el archivo almacenado?')) return;
    await onRemove();
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={disabled || !hasPhoto}
      onClick={() => void remove()}
    >
      {disabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
      Quitar foto
    </Button>
  );
}
