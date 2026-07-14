'use client';

import { useEffect,useState } from 'react';
import { useHandTracker } from '@/hooks/useHandTracker';
import { useFruitNinja } from '@/hooks/useFruitNinja';
import { HandLandmarkerResult } from '@mediapipe/tasks-vision';

export default function Home() {
  const { score,updateGameWindow } = useFruitNinja();
  const [showModal,setShowModal] = useState(true);
  const [trackingResults,setTrackingResults] = useState<HandLandmarkerResult | null>(null);

  // Guardamos los resultados del tracking en un estado para no mutar los refs en render
  // const [trackingResults,setTrackingResults] = useState<any>(null);

  // Inicializamos el hand tracker pasando el actualizador de estado
  const { videoRef,canvasRef,status,isReady,detectFrame } = useHandTracker((results) => {
    setTrackingResults(results);
  });

  // Ejecutamos el bucle del juego y el renderizado en el Canvas de forma segura en useEffect
  useEffect(() => {
    if (!isReady) return;

    let animationFrameId: number;

    const loop = () => {
      detectFrame();

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas && video && trackingResults) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Ajuste dinámico de resolución de pantalla completa
          if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
          }

          // Renderizamos el frame del juego de forma segura
          updateGameWindow(ctx,canvas,video.currentTime,trackingResults);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  },[isReady,trackingResults,detectFrame,updateGameWindow,canvasRef,videoRef]);

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden select-none">

      {/* 1. MODAL INFORMATIVO DE INICIO */}
      {showModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl text-center space-y-6">

            {/* Título de la experiencia */}
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500">
                FRUIT NINJA IA
              </h2>
              <p className="text-xs text-zinc-500 uppercase font-black tracking-widest">
                Videojuego con captura de movimiento
              </p>
            </div>

            {/* Instrucciones paso a paso */}
            <div className="text-left space-y-4 py-2">

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-xl">
                  📷
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">1. Permitir la cámara</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Al cerrar este cartel, el navegador te pedirá acceso a la webcam para detectar tus movimientos localmente.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-xl">
                  ☝️
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">2. Controlá la espada</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    La IA va a rastrear tu mano. El sable de luz se proyecta y se controla usando tu <strong>dedo índice</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-xl">
                  🍉
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">3. Cortá frutas</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Mové el sable rápido por la pantalla para rebanar los cítricos y manzanas que van saltando desde abajo.
                  </p>
                </div>
              </div>

            </div>

            {/* Botón de acción */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20"
            >
              Comenzar a Jugar
            </button>

          </div>
        </div>
      )}

      {/* 2. CAPA DE VIDEO (Fondo completo) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1] opacity-30 z-0 pointer-events-none"
      />

      {/* 3. CAPA DE CANVAS (Interactiva, encima del video) */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1] z-10 pointer-events-none"
      />

      {/* 4. CAPA DE INTERFAZ DE USUARIO (UI flotando arriba de todo) */}
      <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none flex flex-col justify-between p-6 m-0">

        {/* Header: Título y Estado */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            FRUIT NINJA IA 🍓⚔️
          </h1>

          <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg pointer-events-auto">
            <p className="text-xs font-medium text-slate-300 tracking-wide">
              {status}
            </p>
          </div>
        </header>

        {/* Tablero de Puntaje (Flotando abajo a la izquierda) */}
        <footer className="w-full flex justify-between items-end">
          <div className="bg-black/70 backdrop-blur-lg px-6 py-3 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto text-left min-w-[140px]">
            <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Score</p>
            <p className="text-4xl font-black text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {score}
            </p>
          </div>

          {/* Un indicador visual sutil para recordarle al usuario qué mano usar */}
          <div className="hidden md:block bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/5 text-right">
            <p className="text-xs text-slate-400">Control: Punta del dedo índice</p>
          </div>
        </footer>

      </div>
    </main>
  );
}