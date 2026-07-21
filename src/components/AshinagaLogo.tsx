import React from 'react';

interface AshinagaLogoProps {
  className?: string;
  size?: number;
}

export default function AshinagaLogo({ className = '', size = 120 }: AshinagaLogoProps) {
  const width = size;
  const height = Math.round(size * (250 / 350));

  return (
    <svg
      id="ashinaga_rainbow_house_logo"
      width={width}
      height={height}
      viewBox="0 0 350 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none`}
    >
      <defs>
        {/* Soft fading gradient for the rainbow from left (opaque) to right (fully transparent) */}
        <linearGradient id="rainbow-fade" x1="0" y1="1" x2="0.8" y2="0.1">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="55%" stopColor="white" stopOpacity="0.8" />
          <stop offset="90%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        
        {/* Mask applying the fade gradient */}
        <mask id="rainbow-mask">
          <rect x="0" y="0" width="350" height="250" fill="url(#rainbow-fade)" />
        </mask>
      </defs>

      {/* Rainbow arcs with the fade mask applied */}
      <g mask="url(#rainbow-mask)">
        {/* Outer Stripe: Beautiful Blue/Cyan */}
        <path
          d="M 25,230 A 170,170 0 0,1 310,105"
          stroke="#0091EA"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
        {/* Middle Stripe: Warm Yellow */}
        <path
          d="M 37,230 A 158,158 0 0,1 300,117"
          stroke="#FACC15"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner Stripe: Vibrant Red */}
        <path
          d="M 49,230 A 146,146 0 0,1 290,129"
          stroke="#EF4444"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* House structure */}
      {/* Gable Roof: Styled as a solid blue trapezoid with rounded joints */}
      <polygon
        points="130,102 260,102 295,128 95,128"
        fill="#0091EA"
        stroke="#0091EA"
        strokeWidth="8"
        strokeLinejoin="round"
      />

      {/* House Body: Sits right below the roof, top corners are hidden, bottom corners rounded */}
      <rect
        x="110"
        y="132"
        width="170"
        height="90"
        rx="16"
        fill="#0091EA"
      />

      {/* Left White Square Window */}
      <rect
        x="132"
        y="152"
        width="26"
        height="26"
        rx="4"
        fill="#FFFFFF"
      />

      {/* Right White Square Window */}
      <rect
        x="232"
        y="152"
        width="26"
        height="26"
        rx="4"
        fill="#FFFFFF"
      />

      {/* Central White Heart shape */}
      <path
        d="M 195,188 C 195,188 184,177 177,170 C 170,163 170,154 177,148 C 184,142 192,144 195,151 C 198,144 206,142 213,148 C 220,154 220,163 213,170 C 206,177 195,188 195,188 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
