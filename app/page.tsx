'use client';

import { useEffect } from 'react';
import { useHandTracker } from '@/hooks/useHandTracker';
import { useFruitNinja } from '@/hooks/useFruitNinja';

export default function Home() {
  const { score,updateGameWindow } = useFruitNinja();

  const { videoRef,canvasRef,status,isReady,detectFrame } = useHandTracker((results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Ajustamos dinámicamente el tamaño del canvas interno al tamaño real del navegador
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      updateGameWindow(ctx,canvas,video.currentTime,results);
    }
  });

  useEffect(() => {
    if (!isReady) return;

    let animationFrameId: number;

    const loop = () => {
      detectFrame();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  },[isReady]);

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden select-none">

      {/* 1. CAPA DE VIDEO (Fondo completo) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1] opacity-30 z-0 pointer-events-none"
      />

      {/* 2. CAPA DE CANVAS (Interactiva, encima del video) */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1] z-10 pointer-events-none"
      />

      {/* 3. CAPA DE INTERFAZ DE USUARIO (UI flotando arriba de todo) */}
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