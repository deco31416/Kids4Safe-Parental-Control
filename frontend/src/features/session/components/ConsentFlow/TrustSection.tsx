'use client';

import { Shield, Lock, Eye, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 🛡️ Trust Section
 * Build confidence with security and privacy signals
 */
export function TrustSection() {
  const trustSignals = [
    {
      icon: <Shield className="w-5 h-5" />,
      text: 'Cifrado de extremo a extremo',
    },
    {
      icon: <Lock className="w-5 h-5" />,
      text: 'Tus datos están protegidos',
    },
    {
      icon: <Eye className="w-5 h-5" />,
      text: 'Control total sobre tus permisos',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      text: 'Sesión temporal y segura',
    },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-8 pt-8 border-t border-border/50"
    >
      <div className="grid grid-cols-2 gap-4">
        {trustSignals.map((signal, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="flex items-center gap-3 text-sm text-muted-foreground"
          >
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
              {signal.icon}
            </div>
            <span>{signal.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
