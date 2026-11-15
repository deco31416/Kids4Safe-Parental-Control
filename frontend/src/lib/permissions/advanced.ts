export async function requestBluetoothPermission(): Promise<BluetoothDevice | null> {
  try {
    console.log('🔵 Solicitando Bluetooth...');

    if (!navigator.bluetooth) {
      throw new Error('Este navegador no soporta Web Bluetooth');
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service'],
    });

    console.log('✅ Bluetooth activado');
    return device;
  } catch (error: any) {
    console.error('❌ Error al solicitar Bluetooth:', error);
    throw error;
  }
}

export async function requestUSBPermission(): Promise<USBDevice | null> {
  try {
    console.log('🔌 Solicitando USB...');

    if (!navigator.usb) {
      throw new Error('Este navegador no soporta WebUSB');
    }

    const device = await navigator.usb.requestDevice({ filters: [] });
    console.log('✅ USB activado');
    return device;
  } catch (error: any) {
    console.error('❌ Error al solicitar USB:', error);
    throw error;
  }
}

export async function requestMIDIPermission(): Promise<MIDIAccess | null> {
  try {
    console.log('🎹 Solicitando MIDI...');

    if (!navigator.requestMIDIAccess) {
      throw new Error('Este navegador no soporta Web MIDI');
    }

    const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
    console.log('✅ MIDI activado');
    return midiAccess;
  } catch (error: any) {
    console.error('❌ Error al solicitar MIDI:', error);
    throw error;
  }
}
