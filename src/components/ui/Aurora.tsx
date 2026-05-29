import { useEffect, useRef } from 'react';

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  speed?: number;
  className?: string;
}

export function Aurora({
  colorStops = ['#0B1F33', '#001a33', '#004080', '#008FD5'],
  amplitude = 1.2,
  speed = 0.5,
  className = ''
}: AuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background linear gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      colorStops.forEach((color, i) => {
        grad.addColorStop(i / (colorStops.length - 1), color);
      });
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render flowing light wave distortion overlay
      ctx.fillStyle = 'rgba(0, 143, 213, 0.04)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      
      for (let x = 0; x <= canvas.width; x += 10) {
        const y = canvas.height * 0.5 + Math.sin(x * 0.003 + time) * 40 * amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Second overlay wave for organic depth
      ctx.fillStyle = 'rgba(82, 39, 255, 0.03)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let x = 0; x <= canvas.width; x += 10) {
        const y = canvas.height * 0.45 + Math.cos(x * 0.002 - time * 0.8) * 30 * amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      time += 0.01 * speed;
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colorStops, amplitude, speed]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`absolute inset-0 pointer-events-none w-full h-full opacity-70 ${className}`} 
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
