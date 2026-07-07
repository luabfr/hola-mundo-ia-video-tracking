'use client';

import { useRef,useState } from 'react';
import { HandLandmarkerResult } from '@mediapipe/tasks-vision';

export function useTouchGame() {
	const [score,setScore] = useState(0);
	const targetRef = useRef({ x: 320,y: 240,radius: 25 });
	const lastVideoTimeRef = useRef(-1);

	// Procesa la lógica de colisión y el dibujo en el canvas
	const updateGameWindow = (
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
		videoTime: number,
		trackingResults: HandLandmarkerResult
	) => {
		if (videoTime === lastVideoTimeRef.current) return;
		lastVideoTimeRef.current = videoTime;

		// 1. Dibujar escenario del juego (Pelota)
		ctx.clearRect(0,0,canvas.width,canvas.height);
		ctx.beginPath();
		ctx.arc(targetRef.current.x,targetRef.current.y,targetRef.current.radius,0,2 * Math.PI);
		ctx.fillStyle = '#ffaa00';
		ctx.shadowBlur = 15;
		ctx.shadowColor = '#ffaa00';
		ctx.fill();
		ctx.shadowBlur = 0; // Reset

		// 2. Procesar interacciones si la IA detectó una mano
		if (trackingResults.landmarks && trackingResults.landmarks.length > 0) {
			const hand = trackingResults.landmarks[0];
			const indexFinger = hand[8]; // Punta del índice
			const indexX = indexFinger.x * canvas.width;
			const indexY = indexFinger.y * canvas.height;

			// Dibujar puntero del jugador
			ctx.beginPath();
			ctx.arc(indexX,indexY,10,0,2 * Math.PI);
			ctx.fillStyle = '#00ffcc';
			ctx.fill();

			// Detección matemática de colisión
			const dx = indexX - targetRef.current.x;
			const dy = indexY - targetRef.current.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < targetRef.current.radius + 10) {
				// Teletransportar pelota
				targetRef.current.x = Math.floor(Math.random() * (canvas.width - 60)) + 30;
				targetRef.current.y = Math.floor(Math.random() * (canvas.height - 60)) + 30;
				setScore((prev) => prev + 1);
			}

			// Dibujar esqueleto sutil de la mano
			for (const point of hand) {
				ctx.beginPath();
				ctx.arc(point.x * canvas.width,point.y * canvas.height,4,0,2 * Math.PI);
				ctx.fillStyle = 'rgba(0, 255, 204, 0.3)';
				ctx.fill();
			}
		}
	};

	return { score,updateGameWindow };
}