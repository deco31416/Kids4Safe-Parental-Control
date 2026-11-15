import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";

type ToastType = "success" | "error" | "info";

type ToastOptions = {
  message: string;
  type?: ToastType;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = ({ message, type = "info" }: ToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, type });

    Animated.timing(opacity, {
      duration: 180,
      toValue: 1,
      useNativeDriver: Platform.OS !== "web"
    }).start();

    timeoutRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        duration: 180,
        toValue: 0,
        useNativeDriver: Platform.OS !== "web"
      }).start(({ finished }) => {
        if (finished) setToast(null);
      });
    }, 2400);
  };

  const value = useMemo(() => ({ showToast }), []);
  const variant = toast?.type ?? "info";

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View style={styles.portal}>
          <Animated.View style={[styles.toast, styles[variant], { opacity }]}>
            <Text style={styles.message}>{toast.message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  portal: {
    alignItems: "center",
    bottom: 86,
    left: 0,
    paddingHorizontal: spacing.md,
    pointerEvents: "none",
    position: "absolute",
    right: 0
  },
  toast: {
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 360,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: "#1265C8",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24
  },
  success: {
    backgroundColor: colors.gpsActiveSoft,
    borderColor: colors.gpsActive
  },
  error: {
    backgroundColor: colors.gpsInactiveSoft,
    borderColor: colors.gpsInactive
  },
  info: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.secondary
  },
  message: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  }
});
