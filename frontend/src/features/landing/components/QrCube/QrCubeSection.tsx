'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import qrcode from 'qrcode-generator';

function makeQrCanvas(value: string, size = 256) {
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();

  const count = qr.getModuleCount();
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const cellSize = size / count;
  ctx.fillStyle = '#000000';

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(Math.round(c * cellSize), Math.round(r * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }

  return canvas;
}

export function QrCubeSection() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const qrValue = useMemo(() => {
    // Simple demo value for now; we can wire this to a real QR ID later.
    return 'https://kids4safe.local/demo';
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();

    // Cámara (luego se auto-ajusta para encuadrar el cubo)
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    mount.appendChild(renderer.domElement);
    // Ensure the canvas always fills the responsive mount container.
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.65;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.22;
    controls.enableZoom = false;
    controls.enablePan = false;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(4, 6, 4);
    scene.add(dir);

    // QR texture
    const canvas = makeQrCanvas(qrValue, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // Materials
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.4,
      roughness: 0.35,
    });

    // A cube where all faces show the QR
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 1.35), [
      mat,
      mat,
      mat,
      mat,
      mat,
      mat,
    ]);
    cube.position.set(0, 0, 0);
    scene.add(cube);

    // Centrar el target y auto-encuadrar cámara para que el cubo quede bien centrado
    const box = new THREE.Box3().setFromObject(cube);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    controls.target.copy(sphere.center);

    const direction = new THREE.Vector3(1, 0.55, 1).normalize();

    const frameCamera = () => {
      // Ajusta la distancia considerando FOV vertical y horizontal.
      // En pantallas portrait, el FOV horizontal se achica y puede recortar el cubo.
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const minFov = Math.max(0.0001, Math.min(vFov, hFov));

      const pad = camera.aspect < 1 ? 1.34 : 1.22;
      const distance = (sphere.radius / Math.tan(minFov / 2)) * pad;
      camera.position.copy(sphere.center).addScaledVector(direction, distance);
      camera.near = Math.max(0.01, distance / 50);
      camera.far = distance * 50;
      camera.updateProjectionMatrix();
      controls.update();
    };

    frameCamera();

    // Interacción: al arrastrar pausa auto-rotate, al soltar vuelve
    const onPointerDown = () => {
      controls.autoRotate = false;
    };
    const onPointerUp = () => {
      controls.autoRotate = true;
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    let raf = 0;

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      const w = Math.max(1, width);
      const h = Math.max(1, height);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frameCamera();
      renderer.setSize(w, h, false);
    };

    const onVisibility = () => {
      // Pause auto-rotate when hidden (helps perf)
      controls.autoRotate = document.visibilityState === 'visible';
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(mount);

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    const animate = () => {
      raf = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      ro.disconnect();

      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);

      controls.dispose();

      texture.dispose();
      mat.dispose();
      cube.geometry.dispose();

      renderer.dispose();
      rendererRef.current = null;

      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [qrValue]);

  return (
    <section id="qr-cube" className="container px-4 py-16 lg:py-24">
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="relative h-[420px] sm:h-[520px] lg:h-[620px] overflow-hidden">
          {/* Label grande (arriba-izquierda) */}
          <div
            className="pointer-events-none absolute left-0 top-0 z-10 select-none text-white/95 opacity-85 tracking-tight font-black text-6xl sm:text-7xl lg:text-8xl drop-shadow-[0_10px_40px_rgba(0,0,0,0.65)]"
            aria-hidden="true"
          >
            Kids4Safe
          </div>

          {/* Cuadrado grande translúcido centrado */}
          <div className="group absolute left-1/2 top-1/2 w-[clamp(260px,72vmin,640px)] -translate-x-1/2 -translate-y-1/2 aspect-square">
            <div className="pointer-events-none absolute inset-0 rounded-3xl backdrop-blur-[2px] ring-1 ring-white/10" />
            <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.14),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-3xl transition-all duration-300 group-hover:ring-1 group-hover:ring-blue-600/25 group-hover:shadow-[0_24px_90px_rgba(37,99,235,0.20)]" />

            {/* Canvas (cubo centrado) */}
            <div
              ref={mountRef}
              className="absolute inset-0 rounded-3xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.01] cursor-grab active:cursor-grabbing"
              aria-label="Cubo QR 3D"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
