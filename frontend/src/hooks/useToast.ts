import { toast as sonnerToast } from 'sonner';

/**
 * 🔔 Toast Hook
 * Unified interface for toast notifications
 */
export function useToast() {
  return {
    /**
     * Success toast
     */
    success: (message: string, description?: string) => {
      sonnerToast.success(message, {
        description,
      });
    },
    
    /**
     * Error toast
     */
    error: (message: string, description?: string) => {
      sonnerToast.error(message, {
        description,
      });
    },
    
    /**
     * Info toast
     */
    info: (message: string, description?: string) => {
      sonnerToast.info(message, {
        description,
      });
    },
    
    /**
     * Warning toast
     */
    warning: (message: string, description?: string) => {
      sonnerToast.warning(message, {
        description,
      });
    },
    
    /**
     * Loading toast (returns ID for dismissal)
     */
    loading: (message: string, description?: string) => {
      return sonnerToast.loading(message, {
        description,
      });
    },
    
    /**
     * Dismiss a toast
     */
    dismiss: (toastId?: string | number) => {
      sonnerToast.dismiss(toastId);
    },
    
    /**
     * Promise-based toast
     */
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      return sonnerToast.promise(promise, messages);
    },
  };
}
