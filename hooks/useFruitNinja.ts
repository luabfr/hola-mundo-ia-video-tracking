'use client';

import { useRef,useState } from 'react';
import { HandLandmarkerResult } from '@mediapipe/tasks-vision';

interface Fruit {
	id: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	color: string;
	innerColor: string; // Color de la pulpa interna al cortarse
	isPiece: boolean;
	direction?: number;
	angle: number;
	rotationSpeed: number;
	type: 'citric' | 'apple' | 'dotted'; // Tipos de texturas
}

interface JuiceParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	color: string;
	alpha: number;
}

export function useFruitNinja() {
	const [score,setScore] = useState(0);
	const fruitsRef = useRef<Fruit[]>([]);
	const particlesRef = useRef<JuiceParticle[]>([]);
	const lastVideoTimeRef = useRef(-1);
	const gravity = 0.3;

	const spawnFruit = (canvasWidth: number,canvasHeight: number) => {
		// Configuraciones de frutas con sus colores de cáscara y de pulpa interna
		const fruitConfigs = [
			{ color: '#ff3366',innerColor: '#ff99bb',type: 'apple' },  // Tipo manzana rosa
			{ color: '#ffcc00',innerColor: '#fff5cc',type: 'citric' }, // Cítrico amarillo (poros)
			{ color: '#ff6600',innerColor: '#ffcc99',type: 'citric' }, // Cítrico naranja
			{ color: '#9933ff',innerColor: '#e6ccff',type: 'dotted' } // Fruta exótica/fantástica morada
		];

		const config = fruitConfigs[Math.floor(Math.random() * fruitConfigs.length)];
		const radius = Math.floor(Math.random() * 10) + 28; // Un toque más grandes para lucir los detalles

		fruitsRef.current.push({
			id: Math.random(),
			x: Math.floor(Math.random() * (canvasWidth - 300)) + 150,
			y: canvasHeight + 30,
			vx: (Math.random() - 0.5) * 7,
			vy: -(Math.random() * 4 + 13),
			radius,
			color: config.color,
			innerColor: config.innerColor,
			isPiece: false,
			angle: 0,
			rotationSpeed: (Math.random() - 0.5) * 0.04,
			type: config.type as 'citric' | 'apple' | 'dotted'
		});
	};

	const createSplash = (x: number,y: number,color: string) => {
		const particleCount = 15;
		for (let i = 0; i < particleCount; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = Math.random() * 6 + 4;
			particlesRef.current.push({
				x,y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				radius: Math.random() * 3 + 1.5,
				color,
				alpha: 1,
			});
		}
	};

	const updateGameWindow = (
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
		videoTime: number,
		trackingResults: HandLandmarkerResult
	) => {
		if (videoTime === lastVideoTimeRef.current) return;
		lastVideoTimeRef.current = videoTime;

		ctx.clearRect(0,0,canvas.width,canvas.height);

		if (Math.random() < 0.025 && fruitsRef.current.filter(f => !f.isPiece).length < 4) {
			spawnFruit(canvas.width,canvas.height);
		}

		let isSwordPresent = false;
		let swordBaseX = 0,swordBaseY = 0,swordTipX = 0,swordTipY = 0;

		if (trackingResults.landmarks && trackingResults.landmarks.length > 0) {
			const hand = trackingResults.landmarks[0];
			swordBaseX = hand[8].x * canvas.width;
			swordBaseY = hand[8].y * canvas.height;
			const wX = hand[0].x * canvas.width;
			const wY = hand[0].y * canvas.height;
			const swordAngle = Math.atan2(swordBaseY - wY,swordBaseX - wX);
			swordTipX = swordBaseX + Math.cos(swordAngle) * 280;
			swordTipY = swordBaseY + Math.sin(swordAngle) * 280;
			isSwordPresent = true;

			// Render Espada Láser
			ctx.save();
			ctx.lineCap = 'round';
			ctx.beginPath(); ctx.moveTo(swordBaseX,swordBaseY); ctx.lineTo(swordTipX,swordTipY);
			ctx.strokeStyle = 'rgba(0, 100, 255, 0.3)'; ctx.lineWidth = 20; ctx.shadowBlur = 20; ctx.shadowColor = '#0055ff'; ctx.stroke();
			ctx.beginPath(); ctx.moveTo(swordBaseX,swordBaseY); ctx.lineTo(swordTipX,swordTipY);
			ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 10; ctx.stroke();
			ctx.beginPath(); ctx.moveTo(swordBaseX,swordBaseY); ctx.lineTo(swordTipX,swordTipY);
			ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.shadowBlur = 0; ctx.stroke();
			ctx.restore();
		}

		// Dibujar Partículas de Jugo
		particlesRef.current = particlesRef.current.filter((p) => {
			p.vy += gravity * 0.4; p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
			if (p.alpha <= 0) return false;
			ctx.save(); ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,2 * Math.PI); ctx.fillStyle = p.color; ctx.fill(); ctx.restore();
			return true;
		});

		const nextFramesFruits: Fruit[] = [];

		// --- BUCLE DE FRUTAS ---
		for (const fruit of fruitsRef.current) {
			fruit.vy += gravity;
			fruit.x += fruit.vx;
			fruit.y += fruit.vy;
			fruit.angle += fruit.rotationSpeed;

			let fruitWasCut = false;

			if (isSwordPresent && !fruit.isPiece) {
				// Colisión segmento-punto
				const A = fruit.x - swordBaseX; const B = fruit.y - swordBaseY; const C = swordTipX - swordBaseX; const D = swordTipY - swordBaseY;
				const dot = A * C + B * D; const lenSq = C * C + D * D;
				let param = -1; if (lenSq !== 0) param = dot / lenSq;
				let xx,yy;
				if (param < 0) { xx = swordBaseX; yy = swordBaseY; } else if (param > 1) { xx = swordTipX; yy = swordTipY; }
				else { xx = swordBaseX + param * C; yy = swordBaseY + param * D; }

				const distX = fruit.x - xx; const distY = fruit.y - yy;
				if (Math.sqrt(distX * distX + distY * distY) < fruit.radius + 10) {
					fruitWasCut = true;
					setScore((prev) => prev + 1);
					createSplash(fruit.x,fruit.y,fruit.color);

					// Spawnear las dos mitades conservando sus propiedades estéticas
					nextFramesFruits.push({ ...fruit,id: Math.random(),isPiece: true,direction: -1,vx: fruit.vx - 3 - Math.random() * 2,vy: fruit.vy - 1,rotationSpeed: -0.07 });
					nextFramesFruits.push({ ...fruit,id: Math.random(),isPiece: true,direction: 1,vx: fruit.vx + 3 + Math.random() * 2,vy: fruit.vy - 1,rotationSpeed: 0.07 });
				}
			}

			if (!fruitWasCut) {
				ctx.save();
				ctx.translate(fruit.x,fruit.y);
				ctx.rotate(fruit.angle);

				if (fruit.isPiece) {
					// --- DETALLE RENDER: MITAD CORTADA (Se ve la pulpa) ---
					const startAngle = fruit.direction === -1 ? Math.PI * 0.5 : Math.PI * 1.5;
					const endAngle = fruit.direction === -1 ? Math.PI * 1.5 : Math.PI * 0.5;

					// 1. Capa de la cáscara exterior
					ctx.beginPath();
					ctx.arc(0,0,fruit.radius * 0.9,startAngle,endAngle);
					ctx.fillStyle = fruit.color;
					ctx.fill();

					// 2. Capa de la pulpa interna (un círculo plano un toque más chico)
					ctx.beginPath();
					ctx.arc(0,0,fruit.radius * 0.78,startAngle,endAngle);
					ctx.fillStyle = fruit.innerColor;
					ctx.fill();

					// 3. Línea del tajo plano de corte (el borde recto del semicírculo)
					ctx.beginPath();
					ctx.lineWidth = 3;
					ctx.strokeStyle = '#ffffff';
					if (fruit.direction === -1) {
						ctx.moveTo(0,-fruit.radius * 0.78); ctx.lineTo(0,fruit.radius * 0.78);
					} else {
						ctx.moveTo(0,fruit.radius * 0.78); ctx.lineTo(0,-fruit.radius * 0.78);
					}
					ctx.stroke();

					// 4. Detalles de pepitas/líneas internas de la pulpa
					ctx.lineWidth = 1.5;
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
					for (let i = 0; i < 3; i++) {
						const linesAngle = startAngle + (i + 1) * (Math.PI * 0.25);
						ctx.beginPath();
						ctx.moveTo(0,0);
						ctx.lineTo(Math.cos(linesAngle) * fruit.radius * 0.6,Math.sin(linesAngle) * fruit.radius * 0.6);
						ctx.stroke();
					}

					// Conservar el tallo solo en una de las mitades (la izquierda por ej)
					if (fruit.direction === -1 && fruit.type === 'apple') {
						ctx.beginPath();
						ctx.lineWidth = 3; ctx.strokeStyle = '#5c4033';
						ctx.quadraticCurveTo(-5,-fruit.radius - 2,-8,-fruit.radius - 12); ctx.stroke();
					}

				} else {
					// --- DETALLE RENDER: FRUTA ENTERA CON VOLUMEN Y LUZ DE CONTORNO ---

					// 1. Tallo y Hoja (Se dibujan detrás)
					if (fruit.type === 'apple' || fruit.type === 'citric') {
						ctx.beginPath();
						ctx.lineWidth = 4;
						ctx.strokeStyle = '#5c4033';
						ctx.moveTo(0,-fruit.radius + 3);
						ctx.quadraticCurveTo(5,-fruit.radius - 5,8,-fruit.radius - 14);
						ctx.stroke();

						ctx.beginPath();
						ctx.ellipse(8,-fruit.radius - 12,4,8,Math.PI / 4,0,2 * Math.PI);
						ctx.fillStyle = '#22c55e';
						ctx.fill();
					}

					// 2. NUEVO GRADIENTE: Menos oscuro en la base para que no quede apagada
					const gradient = ctx.createRadialGradient(
						-fruit.radius * 0.3,-fruit.radius * 0.3,fruit.radius * 0.1, // Punto de luz
						0,0,fruit.radius // Base
					);
					gradient.addColorStop(0,'#ffffff'); // Brillo máximo
					gradient.addColorStop(0.2,fruit.color);
					gradient.addColorStop(0.85,fruit.color); // Extendemos el color vivo más hacia el borde
					gradient.addColorStop(1,'rgba(0, 0, 0, 0.25)'); // Reducimos la sombra de 0.35 a 0.25 (más clara)

					ctx.beginPath();
					ctx.arc(0,0,fruit.radius,0,2 * Math.PI);
					ctx.fillStyle = gradient;
					ctx.fill();

					// 3. NUEVO: LUZ DE CONTORNO (Rim Light)
					// Dibujamos un anillo exterior brillante para despegar la fruta del fondo negro
					ctx.beginPath();
					ctx.arc(0,0,fruit.radius - 1,0,2 * Math.PI);
					ctx.lineWidth = 2;
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Brillo blanco traslúcido en el borde
					ctx.stroke();

					// 4. Inyección de textura geométrica según el tipo de fruta
					if (fruit.type === 'citric') {
						// Poros un toque más claros para que resalten
						ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
						for (let i = 0; i < 12; i++) {
							const pAngle = (i * Math.PI * 2) / 12;
							const dist = fruit.radius * (0.4 + (i % 3) * 0.15);
							const px = Math.cos(pAngle) * dist;
							const py = Math.sin(pAngle) * dist;
							ctx.beginPath(); ctx.arc(px,py,1.2,0,2 * Math.PI); ctx.fill();
						}
						ctx.beginPath(); ctx.arc(0,fruit.radius * 0.75,2.5,0,2 * Math.PI);
						ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
					}
					else if (fruit.type === 'apple') {
						ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
						ctx.lineWidth = 1.2;
						for (let i = -2; i <= 2; i++) {
							ctx.beginPath();
							ctx.moveTo(i * 6,-fruit.radius + 4);
							ctx.quadraticCurveTo(i * 9,0,i * 6,fruit.radius - 4);
							ctx.stroke();
						}
					}
					else if (fruit.type === 'dotted') {
						ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
						ctx.lineWidth = 2;
						ctx.beginPath(); ctx.arc(0,0,fruit.radius * 0.6,0,2 * Math.PI); ctx.stroke();
					}
				}

				ctx.restore();

				if (fruit.y < canvas.height + 60 && fruit.x > -60 && fruit.x < canvas.width + 60) {
					nextFramesFruits.push(fruit);
				}
			}
		}

		fruitsRef.current = nextFramesFruits;
	};

	return { score,updateGameWindow };
}