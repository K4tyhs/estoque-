import React from 'react';

export default function FarmarcasLogo({ width = 36, height = 36, className = '' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: 10, overflow: 'hidden' }}
    >
      {/* Dark container background */}
      <rect width="500" height="500" rx="90" fill="#000000" />

      {/* Stylized White "A" emblem */}
      <path
        d="M250 72L112 394H214L250 306L286 394H388L250 72ZM250 196L272 250H228L250 196Z"
        fill="#FFFFFF"
      />

      {/* Orange accent base bar */}
      <path
        d="M194 422C194 416.477 198.477 412 204 412H296C301.523 412 306 416.477 306 422V430C306 435.523 301.523 440 296 440H204C198.477 440 194 435.523 194 430V422Z"
        fill="#FF6B00"
      />
    </svg>
  );
}
