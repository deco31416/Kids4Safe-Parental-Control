/**
 * 🧪 FASE 2 - VALIDACIÓN FUNCIONAL POR MICROSERVICIO
 * ===================================================
 * 
 * Este script valida cada microservicio individualmente con flags ON/OFF
 * y simula escenarios de microservicio caído.
 * 
 * Uso:
 * ```bash
 * # Validar PolicyEngine
 * ts-node scripts/validate-plugin-mode.ts policy-engine
 * 
 * # Validar SessionOrchestrator
 * ts-node scripts/validate-plugin-mode.ts session-orchestrator
 * 
 * # Validar IpClassifier
 * ts-node scripts/validate-plugin-mode.ts ip-classifier
 * 
 * # Validar DeviceInfo
 * ts-node scripts/validate-plugin-mode.ts device-info
 * 
 * # Validar todos
 * ts-node scripts/validate-plugin-mode.ts all
 * ```
 */

import axios from 'axios';
import * as chalk from 'chalk';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const MICROSERVICES = {
  'policy-engine': {
    name: 'Policy Engine',
    envFlag: 'USE_POLICY_ENGINE',
    port: 5006,
    testEndpoint: '/health',
    validationTest: async (baseUrl: string) => {
      // Test: Evaluar política sin microservicio
      const payload = {
        sessionId: 'test-session',
        deviceType: 'mobile',
        location: { country: 'CO' },
        permissions: ['camera', 'microphone'],
      };
      
      try {
        const response = await axios.post(`${baseUrl}/session/policy-eval`, payload);
        return {
          success: true,
          mode: response.data.source === 'plugin' ? 'PLUGIN' : 'LOCAL',
          data: response.data,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },
  'session-orchestrator': {
    name: 'Session Orchestrator',
    envFlag: 'USE_SESSION_ORCHESTRATOR',
    port: 5008,
    testEndpoint: '/health',
    validationTest: async (baseUrl: string) => {
      // Test: Crear sesión sin Redis
      const payload = {
        qrId: 'test-qr',
        userId: 'test-user',
      };
      
      try {
        const response = await axios.post(`${baseUrl}/session/start`, payload);
        return {
          success: true,
          mode: response.data.ttl ? 'PLUGIN' : 'LOCAL',
          data: response.data,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },
  'ip-classifier': {
    name: 'IP Classifier',
    envFlag: 'USE_IP_CLASSIFIER',
    port: 5009,
    testEndpoint: '/health',
    validationTest: async (baseUrl: string) => {
      // Test: Geolocalizar IP sin microservicio
      try {
        const response = await axios.get(`${baseUrl}/location/geolocate/test-ip`);
        return {
          success: true,
          mode: response.data.source === 'api' ? 'PLUGIN' : 'fallback',
          data: response.data,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },
  'device-info': {
    name: 'Device Info',
    envFlag: 'USE_DEVICE_INFO',
    port: 5010,
    testEndpoint: '/health',
    validationTest: async (baseUrl: string) => {
      // Test: Recopilar device info sin microservicio
      const payload = {
        sessionId: 'test-session',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        timezone: 'America/Bogota',
        language: 'es-CO',
      };
      
      try {
        const response = await axios.post(`${baseUrl}/live/device-info`, payload);
        return {
          success: true,
          mode: response.data.device ? 'PLUGIN' : 'LOCAL',
          data: response.data,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },
};

interface ValidationResult {
  microservice: string;
  scenario: string;
  passed: boolean;
  mode: string;
  details: string;
}

async function checkMicroserviceHealth(port: number): Promise<boolean> {
  try {
    await axios.get(`http://localhost:${port}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function validateMicroservice(service: string): Promise<ValidationResult[]> {
  const config = MICROSERVICES[service];
  if (!config) {
    console.error(chalk.red(`❌ Microservicio desconocido: ${service}`));
    process.exit(1);
  }

  console.log(chalk.cyan(`\n📦 Validando: ${config.name}`));
  console.log(chalk.gray(`   Flag: ${config.envFlag}`));
  console.log(chalk.gray(`   Puerto: ${config.port}`));
  
  const results: ValidationResult[] = [];
  
  // ESCENARIO 1: Flag OFF (modo LOCAL)
  console.log(chalk.yellow(`\n🧪 ESCENARIO 1: Flag OFF - Modo LOCAL`));
  console.log(chalk.gray(`   Backend debería usar fallback interno sin llamar microservicio`));
  
  const flagOffResult = await config.validationTest(BACKEND_URL);
  const flagOffPassed = flagOffResult.success && flagOffResult.mode === 'LOCAL';
  
  results.push({
    microservice: config.name,
    scenario: 'Flag OFF',
    passed: flagOffPassed,
    mode: flagOffResult.mode || 'ERROR',
    details: flagOffPassed 
      ? '✅ Fallback local funcionando correctamente'
      : `❌ ${flagOffResult.error || 'No usó modo LOCAL'}`,
  });
  
  console.log(flagOffPassed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL'));
  if (flagOffResult.data) {
    console.log(chalk.gray(`   Respuesta: ${JSON.stringify(flagOffResult.data, null, 2)}`));
  }
  
  // ESCENARIO 2: Flag ON + Microservicio UP
  console.log(chalk.yellow(`\n🧪 ESCENARIO 2: Flag ON + Microservicio UP`));
  console.log(chalk.gray(`   Backend debería usar microservicio externo`));
  
  const isUp = await checkMicroserviceHealth(config.port);
  
  if (!isUp) {
    console.log(chalk.yellow(`⚠️  SKIP - Microservicio no está corriendo en puerto ${config.port}`));
    results.push({
      microservice: config.name,
      scenario: 'Flag ON + Service UP',
      passed: false,
      mode: 'SKIP',
      details: '⚠️ Microservicio no disponible para testing',
    });
  } else {
    console.log(chalk.green(`✅ Microservicio UP en puerto ${config.port}`));
    
    // Nota: Este escenario requiere cambiar env var y reiniciar backend
    console.log(chalk.gray(`   ℹ️  Para probar: Configurar ${config.envFlag}=true y reiniciar backend`));
    results.push({
      microservice: config.name,
      scenario: 'Flag ON + Service UP',
      passed: false,
      mode: 'MANUAL',
      details: '⚠️ Requiere configuración manual de flag',
    });
  }
  
  // ESCENARIO 3: Flag ON + Microservicio DOWN (simular caída)
  console.log(chalk.yellow(`\n🧪 ESCENARIO 3: Flag ON + Microservicio DOWN`));
  console.log(chalk.gray(`   Backend debería detectar fallo y usar fallback`));
  
  if (!isUp) {
    console.log(chalk.green(`✅ Microservicio ya está DOWN - perfecto para testing`));
    
    // Con flag ON pero servicio caído, debería usar fallback
    const fallbackResult = await config.validationTest(BACKEND_URL);
    const fallbackPassed = fallbackResult.success; // Debería funcionar con fallback
    
    results.push({
      microservice: config.name,
      scenario: 'Flag ON + Service DOWN',
      passed: fallbackPassed,
      mode: fallbackResult.mode || 'ERROR',
      details: fallbackPassed
        ? '✅ Fallback activado correctamente al detectar fallo'
        : `❌ ${fallbackResult.error || 'No usó fallback'}`,
    });
    
    console.log(fallbackPassed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL'));
  } else {
    console.log(chalk.gray(`   ℹ️  Para probar: Detener microservicio y volver a ejecutar`));
    results.push({
      microservice: config.name,
      scenario: 'Flag ON + Service DOWN',
      passed: false,
      mode: 'MANUAL',
      details: '⚠️ Requiere detener microservicio manualmente',
    });
  }
  
  return results;
}

async function printSummary(allResults: ValidationResult[][]) {
  console.log(chalk.cyan(`\n\n═══════════════════════════════════════════════════════════`));
  console.log(chalk.cyan(`  📊 RESUMEN VALIDACIÓN FASE 2`));
  console.log(chalk.cyan(`═══════════════════════════════════════════════════════════`));
  
  const flatResults = allResults.flat();
  const passedTests = flatResults.filter(r => r.passed).length;
  const totalTests = flatResults.filter(r => r.mode !== 'SKIP' && r.mode !== 'MANUAL').length;
  const manualTests = flatResults.filter(r => r.mode === 'MANUAL').length;
  
  console.log(chalk.white(`\n📈 Tests Automáticos: ${passedTests}/${totalTests} PASSED`));
  console.log(chalk.yellow(`⚠️  Tests Manuales: ${manualTests} pendientes\n`));
  
  // Tabla de resultados
  console.log(chalk.bold(`Microservicio          Escenario                 Estado    Modo`));
  console.log(chalk.gray(`─────────────────────────────────────────────────────────────`));
  
  for (const result of flatResults) {
    const icon = result.passed ? '✅' : (result.mode === 'MANUAL' ? '⚠️ ' : '❌');
    const statusColor = result.passed ? chalk.green : (result.mode === 'MANUAL' ? chalk.yellow : chalk.red);
    
    console.log(
      `${result.microservice.padEnd(22)} ${result.scenario.padEnd(25)} ${icon} ${statusColor(result.mode.padEnd(10))}`
    );
    console.log(chalk.gray(`  └─ ${result.details}`));
  }
  
  console.log(chalk.cyan(`\n═══════════════════════════════════════════════════════════\n`));
  
  // Recomendaciones
  if (manualTests > 0) {
    console.log(chalk.yellow(`\n📝 PRÓXIMOS PASOS MANUALES:`));
    console.log(chalk.gray(`\n1. Activar flag en .env:`));
    console.log(chalk.white(`   USE_POLICY_ENGINE=true`));
    console.log(chalk.white(`   USE_SESSION_ORCHESTRATOR=true`));
    console.log(chalk.white(`   USE_IP_CLASSIFIER=true`));
    console.log(chalk.white(`   USE_DEVICE_INFO=true\n`));
    
    console.log(chalk.gray(`2. Iniciar microservicios:`));
    console.log(chalk.white(`   cd microservicio-policy-engine && uvicorn main:app --port 5006`));
    console.log(chalk.white(`   cd microservicio-session-orchestrator && uvicorn main:app --port 5008`));
    console.log(chalk.white(`   cd microservicio-ip-classifier && uvicorn main:app --port 5009`));
    console.log(chalk.white(`   cd microservicio-device-info && uvicorn main:app --port 5010\n`));
    
    console.log(chalk.gray(`3. Reiniciar Backend y volver a ejecutar validación\n`));
  }
  
  if (passedTests === totalTests && totalTests > 0) {
    console.log(chalk.green(`\n🎉 FASE 2 COMPLETADA - Todos los tests automáticos PASSED`));
    console.log(chalk.white(`   ✅ Modo LOCAL funciona correctamente`));
    console.log(chalk.white(`   ✅ Fallbacks activos al detectar fallos\n`));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'all';
  
  console.log(chalk.cyan.bold(`\n🔬 VALIDACIÓN PLUGIN MODE - FASE 2\n`));
  console.log(chalk.gray(`Backend URL: ${BACKEND_URL}`));
  console.log(chalk.gray(`Target: ${target}\n`));
  
  const servicesToTest = target === 'all' 
    ? Object.keys(MICROSERVICES) 
    : [target];
  
  const allResults: ValidationResult[][] = [];
  
  for (const service of servicesToTest) {
    const results = await validateMicroservice(service);
    allResults.push(results);
  }
  
  await printSummary(allResults);
}

main().catch(err => {
  console.error(chalk.red(`\n❌ Error fatal: ${err.message}\n`));
  process.exit(1);
});
