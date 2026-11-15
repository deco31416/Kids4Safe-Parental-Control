import { useModalStore } from '@/providers/ModalProvider';
import type { ModalConfig } from '@/providers/ModalProvider';

/**
 * 🪟 Modal Hook
 * Simplified interface for opening/closing modals
 */
export function useModal() {
  const { open, close, closeAll, update } = useModalStore();
  
  return {
    /**
     * Open a modal
     * @returns Modal ID for tracking
     */
    open: (config: Omit<ModalConfig, 'id'> & { id?: string }) => open(config),
    
    /**
     * Close a specific modal
     */
    close,
    
    /**
     * Close all modals
     */
    closeAll,
    
    /**
     * Update modal props dynamically
     */
    update,
  };
}
