'use client';

import { useEffect,useRef,useState } from 'react';
import { FilesetResolver,HandLandmarker,HandLandmarkerResult } from '@mediapipe/tasks-vision';

export function useHandTracker(onResults: (results: HandLandmarkerResult) => void) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const landmarkerRef = useRef<HandLandmarker | null>(null);
	const [status,setStatus] = useState('Cargando modelo de IA...');
	const [isReady,setIsReady] = useState(false);

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
					numHands: 1,
				});

				landmarkerRef.current = handLandmarker;
				setStatus('Modelo de IA listo. Iniciando cámara...');
				startCamera();
			} catch (error) {
				console.error(error);
				setStatus('Error al inicializar el tracking.');
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
				setStatus('¡Tracking Activo!');
				setIsReady(true);
			});
		} catch (err) {
			setStatus('Error al acceder a la webcam.');
		}
	}

	// Ejecuta la detección para un frame específico
	const detectFrame = () => {
		if (!videoRef.current || !landmarkerRef.current) return null;
		const video = videoRef.current;

		if (video.currentTime > 0) {
			const startTimeMs = performance.now();
			const results = landmarkerRef.current.detectForVideo(video,startTimeMs);
			onResults(results);
		}
	};

	return { videoRef,canvasRef,status,isReady,detectFrame };
}