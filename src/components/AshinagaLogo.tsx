import React from 'react';

interface AshinagaLogoProps {
  className?: string;
  size?: number;
}

export default function AshinagaLogo({ className = '', size = 120 }: AshinagaLogoProps) {
  return (
    <svg
      id="ashinaga_rainbow_house_logo"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none`}
    >
      {/* Concentric Rainbow Arcs arching over the house */}
      {/* Outer Red Arc */}
      <path
        d="M 35 130 A 65 65 0 0 1 165 130"
        stroke="#FF4D4D"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Orange/Yellow Arc */}
      <path
        d="M 43 130 A 57 57 0 0 1 157 130"
        stroke="#FFC107"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Green Arc */}
      <path
        d="M 51 130 A 49 49 0 0 1 149 130"
        stroke="#4CAF50"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cyan/Blue Arc */}
      <path
        d="M 59 130 A 41 41 0 0 1 141 130"
        stroke="#00BCD4"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Blue Gable Roof with a nice overhang */}
      <polygon
        points="55,100 145,100 135,85 65,85"
        fill="#0091EA"
        stroke="#0091EA"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Triangular top fill of roof if needed, wait, the roof is a standard wide flat triangular shape */}
      {/* Let's construct a beautiful classic triangular roof & house base matching the screenshot */}
      {polygonPointsRoof()}
      
      {/* House Body */}
      <rect
        x="68"
        y="115"
        width="64"
        height="45"
        rx="2"
        fill="#0091EA"
      />

      {/* White window/door container inside the house */}
      <rect
        x="76"
        y="124"
        width="48"
        height="26"
        rx="4"
        fill="#FFFFFF"
      />

      {/* Blue Heart in the center */}
      <path
        d="M 100 141 C 100 141 95.5 137 93 134.5 C 90.5 132 90.5 129 93 127 C 95.5 125 98.5 125.5 100 128 C 101.5 125.5 104.5 125 107 127 C 109.5 129 109.5 132 107 134.5 C 104.5 137 100 141 100 141 Z"
        fill="#0091EA"
      />

      {/* Two vertical blue rectangles/windows on left and right */}
      {/* Left Window */}
      <rect
        x="81"
        y="131"
        width="6"
        height="12"
        rx="1"
        fill="#0091EA"
      />
      {/* Right Window */}
      <rect
        x="113"
        y="131"
        width="6"
        height="12"
        rx="1"
        fill="#0091EA"
      />
    </svg>
  );
}

// Helper to provide nice clean roof lines
function polygonPointsRoof() {
  // Let's draw the gable roof: a simple triangle from (60, 115) to (140, 115) with peak at (100, 80)
  return (
    <polygon
      points="58,115 142,115 100,82"
      fill="#0091EA"
      stroke="#0091EA"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );
}
