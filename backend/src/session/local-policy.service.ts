import { Injectable, Logger } from '@nestjs/common';
import { PolicyDecision, QRPolicy, DeviceContext, EvaluatePolicyPayload } from './policy-engine.client';

/**
 * Policy Engine local (fallback cuando microservicio no responde)
 * 
 * Implementa las mismas reglas que el microservicio policy-engine
 * pero sin dependencia externa. SIEMPRE disponible.
 */
@Injectable()
export class LocalPolicyService {
  private readonly logger = new Logger(LocalPolicyService.name);

  /**
   * Evalúa policy localmente (fallback)
   */
  evaluate(payload: EvaluatePolicyPayload): PolicyDecision {
    const policy = payload.qr_policy;
    const device = payload.device_context;
    const session = payload.session_state || {};
    const geo = payload.geo || {};

    // Defaults permisivos
    const decision: PolicyDecision = {
      allow_camera: true,
      allow_mic: true,
      allow_screen: false,
      require_screen: false,
      allow_location: true,
      allow_continue: true,
      required_permissions: policy.permissionsRequired || [],
      reason: 'ok',
    };

    const policyType = policy.policyType || 'STANDARD';

    // 1. Policy Type Logic
    switch (policyType) {
      case 'KYC_STRICT':
        decision.allow_camera = true;
        decision.allow_mic = true;
        decision.allow_location = true;
        
        if (policy.permissionsRequired?.includes('location') && geo.lat == null) {
          decision.allow_continue = false;
          decision.reason = 'Location required but not provided';
        }
        break;

      case 'SCREEN_ONLY':
        decision.require_screen = true;
        
        if (device) {
          const canScreenShare = device.capabilities?.screenShare ?? false;
          if (!canScreenShare) {
            decision.allow_continue = false;
            decision.reason = 'Screen share required but device doesn\'t support it';
          } else {
            decision.allow_screen = true;
          }
        } else {
          decision.allow_continue = false;
          decision.reason = 'Device context required for SCREEN_ONLY policy';
        }
        break;

      case 'ONE_TIME':
        const maxUses = policy.maxUses || 1;
        const currentUses = session.uses || 0;
        
        if (currentUses >= maxUses) {
          decision.allow_continue = false;
          decision.reason = `Max uses reached (${maxUses})`;
        }
        break;

      case 'LOCATION_REQUIRED':
        if (!geo.isInsideFence) {
          decision.allow_continue = false;
          decision.reason = 'Location outside allowed geofence';
        }
        break;

      case 'STANDARD':
      default:
        // Standard policy - permisivo
        break;
    }

    // 2. Device Capabilities Check
    if (device && decision.allow_continue) {
      const caps = device.capabilities || {};
      const required = policy.permissionsRequired || [];

      if (required.includes('camera') && !caps.camera) {
        decision.allow_camera = false;
        decision.allow_continue = false;
        decision.reason = 'Camera permission required but not available';
      }

      if (required.includes('mic') && !caps.microphone) {
        decision.allow_mic = false;
        decision.allow_continue = false;
        decision.reason = 'Microphone permission required but not available';
      }

      if (required.includes('screen')) {
        if (device.device_type === 'mobile') {
          decision.allow_screen = false;
          decision.allow_continue = false;
          decision.reason = 'Screen share required but device is mobile (not supported)';
        } else if (!caps.screenShare) {
          decision.allow_screen = false;
          decision.allow_continue = false;
          decision.reason = 'Screen share permission required but not available';
        } else {
          decision.allow_screen = true;
        }
      }
    }

    // 3. Session State Check
    if (session.status && ['stopped', 'expired'].includes(session.status)) {
      decision.allow_continue = false;
      decision.reason = `Session status is ${session.status}`;
    }

    this.logger.log(
      `🔧 [LocalPolicy] Evaluado: ${policyType} → ` +
      `${decision.allow_continue ? 'ALLOW' : 'DENY'} (${decision.reason})`
    );

    return decision;
  }

  /**
   * Valida permisos (sin llamada externa)
   */
  validatePermissions(required: string[], granted: string[]): { valid: boolean; missing: string[] } {
    const requiredSet = new Set(required);
    const grantedSet = new Set(granted);
    
    const missing = required.filter(perm => !grantedSet.has(perm));
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
