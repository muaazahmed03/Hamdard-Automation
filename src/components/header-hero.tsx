'use client'

import React from 'react'

export default function HeaderHero() {
  return (
    <div className="w-full h-44 md:h-56 lg:h-72 overflow-hidden relative">
      <img
        src="/building.png"
        alt="Campus building"
        className="w-full h-full object-cover object-center"
      />
      {/* subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
    </div>
  )
}
