'use client';

import { create } from 'zustand';
import { ReactNode } from 'react';

/**
 * 🪟 Modal Configuration
 */
export interface ModalConfig {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  options?: {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnEscape?: boolean;
    closeOnBackdrop?: boolean;
    persistent?: boolean;
    showClose?: boolean;
  };
}

/**
 * 🗄️ Modal Store
 */
interface ModalStore {
  modals: ModalConfig[];
  open: (config: Omit<ModalConfig, 'id'> & { id?: string }) => string;
  close: (id: string) => void;
  closeAll: () => void;
  update: (id: string, props: Record<string, any>) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  modals: [],
  
  open: (config) => {
    const id = config.id || `modal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const modalConfig: ModalConfig = {
      ...config,
      id,
      options: {
        size: 'md',
        closeOnEscape: true,
        closeOnBackdrop: true,
        persistent: false,
        showClose: true,
        ...config.options,
      },
    };
    
    set((state) => ({
      modals: [...state.modals, modalConfig],
    }));
    
    return id;
  },
  
  close: (id) => {
    set((state) => ({
      modals: state.modals.filter((modal) => modal.id !== id),
    }));
  },
  
  closeAll: () => {
    set({ modals: [] });
  },
  
  update: (id, props) => {
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id
          ? { ...modal, props: { ...modal.props, ...props } }
          : modal
      ),
    }));
  },
}));

/**
 * 🪟 Modal Provider Component
 * Renders all active modals
 */
export function ModalProvider({ children }: { children: ReactNode }) {
  const modals = useModalStore((state) => state.modals);
  const close = useModalStore((state) => state.close);
  
  return (
    <>
      {children}
      
      {/* Render active modals */}
      {modals.map((modal) => {
        const Component = modal.component;
        const handleClose = () => {
          if (!modal.options?.persistent) {
            close(modal.id);
          }
        };
        
        return (
          <Component
            key={modal.id}
            {...modal.props}
            onClose={handleClose}
            modalId={modal.id}
          />
        );
      })}
    </>
  );
}
