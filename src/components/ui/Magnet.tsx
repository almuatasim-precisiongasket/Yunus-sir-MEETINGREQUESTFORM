import { useRef, useState, useEffect } from 'react';

interface MagnetProps {
  children: React.ReactElement;
  range?: number;
  strength?: number;
}

export function Magnet({ children, range = 80, strength = 0.35 }: MagnetProps) {
  const magnetRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent) => {
    const magnet = magnetRef.current;
    if (!magnet) return;

    const rect = magnet.getBoundingClientRect();
    const magnetX = rect.left + rect.width / 2;
    const magnetY = rect.top + rect.height / 2;

    const distanceX = e.clientX - magnetX;
    const distanceY = e.clientY - magnetY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance < range) {
      setPosition({
        x: distanceX * strength,
        y: distanceY * strength
      });
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={magnetRef}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
      }}
      className="inline-block"
    >
      {children}
    </div>
  );
}
