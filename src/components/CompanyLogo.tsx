import React from 'react';

interface CompanyLogoProps {
  className?: string;
  hideText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  whiteText?: boolean;
}

export default function CompanyLogo({ className = '', hideText = false, size = 'md', whiteText = false }: CompanyLogoProps) {
  // Sizes mapping for accurate proportions
  const sizeClasses = {
    sm: { icon: 'w-7 h-7', text: 'text-[15px] font-black', subText: 'text-[6.5px] mt-[1px]' },
    md: { icon: 'w-11 h-11', text: 'text-[22px] font-black', subText: 'text-[9.5px] mt-[1.5px]' },
    lg: { icon: 'w-16 h-16', text: 'text-[32px] font-black', subText: 'text-[14px] mt-[2px]' },
    xl: { icon: 'w-24 h-24', text: 'text-[46px] font-black', subText: 'text-[19px] mt-[3px]' },
  };

  const { icon, text, subText } = sizeClasses[size];

  return (
    <div className={`flex items-center gap-3 md:gap-4 select-none ${className}`}>
      {/* 
        High-Fidelity SVG logo representation of Precision Engineering Group "P" symbol.
        Made of precise overlapping smooth spline segments to get the exact modern curves shown in the image:
        - Light sky blue/cyan top loop
        - Deep rich corporate blue lower loop & vertical leg
        - Fluid interlocking rounded joints
      */}
      <svg
        viewBox="0 0 260 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${icon} shrink-0 transition-transform duration-300 hover:scale-[1.03]`}
      >
        <defs>
          {/* Exact Brand Color Gradients */}
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4FC3F7" />
            <stop offset="100%" stopColor="#008FD5" />
          </linearGradient>
          <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#008FD5" />
            <stop offset="100%" stopColor="#005a96" />
          </linearGradient>
          <filter id="subtleShadow" x="-10%" y="-10%" width="125%" height="125%">
            <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#0B1F33" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* 1. Underlying Deep Blue curved leg and loop part */}
        <path
          d="M 50,150 C 50,150 50,220 50,230 C 50,245 62,250 80,250 C 95,250 102,235 102,220 C 102,175 80,150 65,130 C 60,123 52,112 50,105 L 50,130"
          fill="url(#navyGrad)"
        />
        
        {/* 2. Overlapping Sky Blue Outer Loop Ribbon representing the premium top arc */}
        <path
          d="M 50,75 C 50,-10 215,0 215,75 C 215,145 125,160 90,160"
          stroke="url(#skyGrad)"
          strokeWidth="48"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Deep Blue Primary "P" Body Curve overlapping/clipping into the center */}
        <path
          d="M 50,160 C 50,160 50,75 50,75 C 50,55 60,35 75,35 C 150,35 165,115 75,115 C 65,115 50,130 50,160 Z"
          fill="url(#navyGrad)"
        />

        {/* 4. Elegant interlocking inner shadow and curve matching the emblem layout */}
        <path
          d="M 50,205 C 50,205 105,190 105,150 C 105,115 80,95 50,95"
          stroke="url(#skyGrad)"
          strokeWidth="32"
          strokeLinecap="round"
        />
      </svg>

      {!hideText && (
        <div className="flex flex-col min-w-0 font-sans">
          {/* PRECISION - Heavy block uppercase layout */}
          <span 
            className={`font-black tracking-[0.06em] leading-none select-none uppercase ${text} ${
              whiteText ? 'text-white' : 'text-[#0B1F33]'
            }`}
            style={{ fontFamily: '"Inter", sans-serif' }}
          >
            PRECISION
          </span>
          {/* ENGINEERING GROUP - Perfectly letter-spaced smaller subhead */}
          <span 
            className={`font-extrabold tracking-[0.14em] leading-none select-none uppercase ${subText} ${
              whiteText ? 'text-[#4FC3F7]' : 'text-[#008FD5]'
            }`}
            style={{ fontFamily: '"Inter", sans-serif' }}
          >
            ENGINEERING GROUP
          </span>
        </div>
      )}
    </div>
  );
}
