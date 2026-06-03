'use client'

import React from 'react'

export default function BackgroundMotif() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {/* Left decorative photo removed (was referencing removed JPG) */}

      {/* Left outline (inline SVG so we can use currentColor) */}
      <svg
        className="hidden md:block absolute left-6 top-4 w-48 md:w-64 text-emerald-300 opacity-85"
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <path d="M4 20c0 0 24-12 56-4 32 8 48 4 48 4v64c0 0-20 8-48 0-28-8-56-8-56-8V20z" />
          <path d="M18 24c18-6 34-6 50 0" />
          <path d="M18 48c18-6 34-6 50 0" />
          <path d="M18 72c18-6 34-6 50 0" />
          <path d="M64 20v64" />
        </g>
      </svg>

      {/* Right decorative photo removed (was referencing removed JPG) */}

      {/* Right outline (inline SVG) */}
      <svg
        className="hidden md:block absolute right-6 bottom-4 w-48 md:w-64 text-emerald-300 opacity-85"
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <path d="M8 96h144V44L88 8 8 44v52z" />
          <path d="M28 68h24v20H28z" />
          <path d="M64 52h18v36H64z" />
          <path d="M92 68h24v20H92z" />
          <path d="M8 56h144" />
        </g>
      </svg>

      {/* Accent outlines on larger screens */}
      <svg
        className="hidden lg:block absolute left-24 top-28 w-48 opacity-40 text-emerald-200"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 20h36a8 8 0 0 1 8 8v44a2 2 0 0 1-2 2H10z" />
          <path d="M54 20h36a8 8 0 0 1 8 8v44a2 2 0 0 1-2 2H54z" />
        </g>
      </svg>

      <svg
        className="hidden lg:block absolute right-24 bottom-28 w-48 opacity-40 text-emerald-200"
        viewBox="0 0 140 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 100h120V36L70 8 10 36v64z" />
          <path d="M28 72h24v20H28z" />
        </g>
      </svg>
    </div>
  )
}
