import React from 'react';

interface AshinagaLogoProps {
  className?: string;
  size?: number;
}

export default function AshinagaLogo({ className = '', size = 120 }: AshinagaLogoProps) {
  const width = size;
  const height = Math.round(size * (240 / 340));

  return (
    <svg
      id="ashinaga_rainbow_house_logo"
      width={width}
      height={height}
      viewBox="0 0 340 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none`}
    >
      <defs>
        {/* Soft fading gradient for the rainbow towards top-right */}
        <linearGradient id="rainbow-fade" x1="0.1" y1="0.9" x2="0.85" y2="0.15">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="90%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <mask id="rainbow-mask">
          <rect x="0" y="0" width="340" height="240" fill="url(#rainbow-fade)" />
        </mask>
      </defs>

      {/* Rainbow Arcs - 4 Bands: Sky Blue, Soft Green, Warm Yellow, Vibrant Red */}
      <g mask="url(#rainbow-mask)">
        {/* Sky Blue / Light Cyan (Outer Band) */}
        <path
          d="M 12 235 C 12 110, 105 18, 235 18"
          stroke="#68C5F7"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        {/* Soft Green Band */}
        <path
          d="M 23 235 C 23 120, 112 29, 232 29"
          stroke="#9BD843"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        {/* Warm Yellow Band */}
        <path
          d="M 34 235 C 34 130, 119 40, 229 40"
          stroke="#F8D41A"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        {/* Bright Red Band (Innermost) */}
        <path
          d="M 45 235 C 45 140, 126 51, 226 51"
          stroke="#E63928"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* HOUSE STRUCTURE */}
      {/* House Color: Official Ashinaga Blue #008AD8 */}

      {/* Roof: Distinctive wide trapezoid with rounded eave corners */}
      <path
        d="M 100 115 
           L 240 115 
           C 245 115 248 117 250 121
           L 295 146
           C 301 150 298 158 290 158
           L 50 158
           C 42 158 39 150 45 146
           L 90 121
           C 92 117 95 115 100 115 Z"
        fill="#008AD8"
      />

      {/* House Body: Sits under the roof with rounded bottom corners */}
      <rect
        x="68"
        y="155"
        width="204"
        height="76"
        rx="22"
        fill="#008AD8"
      />

      {/* Left White Square Window */}
      <rect
        x="92"
        y="170"
        width="24"
        height="24"
        rx="3"
        fill="#FFFFFF"
      />

      {/* Right White Square Window */}
      <rect
        x="224"
        y="170"
        width="24"
        height="24"
        rx="3"
        fill="#FFFFFF"
      />

      {/* Center White Heart */}
      <path
        d="M 170 216
           C 170 216, 155 201, 148 193
           C 140 184, 140 173, 149 166
           C 157 159, 166 161, 170 169
           C 174 161, 183 159, 191 166
           C 200 173, 200 184, 192 193
           C 185 201, 170 216, 170 216 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

