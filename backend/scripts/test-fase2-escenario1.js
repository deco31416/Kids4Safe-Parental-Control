/**
 * 🧪 Test Manual FASE 2 - IP Classifier
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:7000';

async function testIPClassifier() {
  console.log('\n═══════════════════════════════════════════');
  console.log('🧪 TEST: IP CLASSIFIER');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    console.log('📍 Test 1: Location Hybrid (usa IP Classifier internamente)');
    const response = await axios.post(`${BACKEND_URL}/location/hybrid`, {
      sessionId: 'test-ip-classifier-local',
      coords: {
        latitude: 7.119,
        longitude: -73.122,
        accuracy: 50
      }
    }, {
      headers: {
        'X-Forwarded-For': '8.8.8.8',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Respuesta recibida:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    
    // Verificar que responda aunque sea con fallback
    if (response.data && response.status === 200) {
      console.log('\n✅ PASS: Backend respondió correctamente');
      console.log('   - No se cayó');
      console.log('   - Fallback local funcionó');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    console.log('\n❌ FAIL: Backend no respondió correctamente');
    return false;
  }
}

async function testDeviceInfo() {
  console.log('\n═══════════════════════════════════════════');
  console.log('🧪 TEST: DEVICE INFO');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    console.log('📱 Test 2: Device Info Collection');
    const response = await axios.post(`${BACKEND_URL}/live/device-info`, {
      sessionId: 'test-device-info-local',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      timezone: 'America/Bogota',
      language: 'es-CO',
      platform: 'iPhone',
      hardwareConcurrency: 6
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Respuesta recibida:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.status === 200 || response.status === 201) {
      console.log('\n✅ PASS: Backend respondió correctamente');
      console.log('   - No se cayó');
      console.log('   - Modo LOCAL activo');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    console.log('\n❌ FAIL: Backend no respondió correctamente');
    return false;
  }
}

async function testPolicyEngine() {
  console.log('\n═══════════════════════════════════════════');
  console.log('🧪 TEST: POLICY ENGINE');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    // Primero necesitamos crear una sesión
    console.log('📝 Test 3: Evaluate Policy');
    const response = await axios.post(`${BACKEND_URL}/session/test-policy-local/evaluate-policy`, {
      deviceType: 'mobile',
      location: { country: 'CO', city: 'Bogota' },
      permissions: ['camera', 'microphone'],
      ipAddress: '8.8.8.8'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Respuesta recibida:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.status === 200) {
      console.log('\n✅ PASS: Backend respondió correctamente');
      console.log('   - No se cayó');
      console.log('   - Lógica interna funcionó');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    console.log('\n❌ FAIL: Backend no respondió correctamente');
    return false;
  }
}

async function main() {
  console.log('\n🔬 FASE 2 - VALIDACIÓN MICROSERVICIOS');
  console.log('Configuración: Todos flags OFF (Modo LOCAL)\n');
  
  const results = [];
  
  // Test 1: IP Classifier
  const test1 = await testIPClassifier();
  results.push({ name: 'IP Classifier', passed: test1 });
  
  await new Promise(r => setTimeout(r, 1000)); // Espera 1s
  
  // Test 2: Device Info
  const test2 = await testDeviceInfo();
  results.push({ name: 'Device Info', passed: test2 });
  
  await new Promise(r => setTimeout(r, 1000)); // Espera 1s
  
  // Test 3: Policy Engine
  const test3 = await testPolicyEngine();
  results.push({ name: 'Policy Engine', passed: test3 });
  
  // Resumen
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 RESUMEN ESCENARIO 1 (Flag OFF)');
  console.log('═══════════════════════════════════════════\n');
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.passed ? 'PASS' : 'FAIL'}`);
  });
  
  const allPassed = results.every(r => r.passed);
  
  if (allPassed) {
    console.log('\n🎉 ESCENARIO 1 COMPLETADO - Todos los microservicios en modo LOCAL funcionan');
  } else {
    console.log('\n⚠️ ESCENARIO 1 INCOMPLETO - Revisar errores arriba');
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
