'use client';

import { useEffect,useRef,useState } from 'react';
import { FilesetResolver,HandLandmarker } from '@mediapipe/tasks-vision';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const [status,setStatus] = useState('Cargando interacción...');
  const [score,setScore] = useState(0);

  // Estado de la pelota virtual en el espacio del Canvas (640x480)
  const targetRef = useRef({ x: 320,y: 240,radius: 25 });
  let lastVideoTime = -1;

  useEffect(() => {
    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision,{
          baseOptions: {
            modelAssetPath: '/models/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1, // Con una mano para este juego alcanza
        });

        landmarkerRef.current = handLandmarker;
        setStatus('¡Esquivá o tocá la pelota con tu dedo índice!');
        startCamera();
      } catch (error) {
        console.error(error);
        setStatus('Error al iniciar.');
      }
    }

    initMediaPipe();
    return () => { landmarkerRef.current?.close(); };
  },[]);

  async function startCamera() {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640,height: 480 },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata',() => {
        requestAnimationFrame(predictLoop);
      });
    } catch (err) {
      setStatus('Error con la webcam.');
    }
  }

  function predictLoop() {
    if (!videoRef.current || !canvasRef.current || !landmarkerRef.current) {
      requestAnimationFrame(predictLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      ctx.clearRect(0,0,canvas.width,canvas.height);

      // 1. Dibujar el objetivo virtual (Pelota)
      ctx.beginPath();
      ctx.arc(targetRef.current.x,targetRef.current.y,targetRef.current.radius,0,2 * Math.PI);
      ctx.fillStyle = '#ffaa00'; // Naranja brillante
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffaa00';
      ctx.fill();
      ctx.shadowBlur = 0; // Reset de sombra para no ralentizar

      const startTimeMs = performance.now();
      const results = landmarkerRef.current.detectForVideo(video,startTimeMs);

      if (results.landmarks && results.landmarks.length > 0) {
        const hand = results.landmarks[0];

        // 2. Obtener el punto del dedo índice (Landmark index 8)
        const indexFinger = hand[8];
        const indexX = indexFinger.x * canvas.width;
        const indexY = indexFinger.y * canvas.height;

        // Dibujamos un puntero especial en tu índice
        ctx.beginPath();
        ctx.arc(indexX,indexY,10,0,2 * Math.PI);
        ctx.fillStyle = '#00ffcc';
        ctx.fill();

        // 3. DETECCIÓN DE COLISIÓN (Pitágoras / Distancia Euclídea)
        const dx = indexX - targetRef.current.x;
        const dy = indexY - targetRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Si la distancia es menor al radio de la pelota + el radio de tu dedo, ¡hay toque!
        if (distance < targetRef.current.radius + 10) {
          // Teletransportamos la pelota a una posición aleatoria
          targetRef.current.x = Math.floor(Math.random() * (canvas.width - 60)) + 30;
          targetRef.current.y = Math.floor(Math.random() * (canvas.height - 60)) + 30;

          // Actualizamos el puntaje usando el estado funcional de React
          setScore((prev) => prev + 1);
        }

        // Dibujamos el resto de la mano de forma sutil
        for (const point of hand) {
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x,y,4,0,2 * Math.PI);
          ctx.fillStyle = 'rgba(0, 255, 204, 0.4)';
          ctx.fill();
        }
      }
    }

    requestAnimationFrame(predictLoop);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-4">
      <h1 className="text-3xl font-extrabold mb-1 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
        Mini-Juego: Touch the Ball 🎮
      </h1>

      <div className="flex gap-4 my-4">
        <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-center">
          <p className="text-xs text-slate-400 uppercase font-semibold">Puntaje</p>
          <p className="text-2xl font-bold text-emerald-400">{score}</p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 flex items-center">
          <p className="text-sm text-slate-300">{status}</p>
        </div>
      </div>

      <div className="relative w-[640px] h-[480px] bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1]"
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute top-0 left-0 w-full h-full object-cover z-20 scale-x-[-1] pointer-events-none"
        />
      </div>
    </main>
  );
}