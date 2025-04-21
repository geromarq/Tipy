"use client"

import { useState, useEffect } from "react"
import {
  Music,
  Headphones,
  DollarSign,
  Users,
  ArrowUp,
  Disc,
  QrCode,
  LayoutDashboard,
  Mic,
  Zap,
  Clock,
  Play,
} from "lucide-react"

interface AnimatedIconProps {
  className?: string
}

// Componente para el ecualizador
const Equalizer = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="4" width="3" height="16" rx="1" />
    <rect x="10.5" y="8" width="3" height="12" rx="1" />
    <rect x="17" y="2" width="3" height="18" rx="1" />
  </svg>
)

// Componente para la onda de sonido
const SoundWave = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12h2a2 2 0 0 0 2-2V8a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-2a2 2 0 0 1 2-2h4" />
  </svg>
)

// Componente para el cóctel
const Cocktail = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 21h8m-4-9v9M3 3h18l-9 9z" />
  </svg>
)

// Componente para el ticket
const Ticket = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
    <path d="M13 5v2M13 17v2M13 11v2" />
  </svg>
)

export function AnimatedIcon({ className }: AnimatedIconProps) {
  const [currentIcon, setCurrentIcon] = useState(0)

  const icons = [
    <Music key="music" className={className} />,
    <Disc key="disc" className={className} />,
    <DollarSign key="dollar" className={className} />,
    <Users key="users" className={className} />,
    <ArrowUp key="arrow" className={className} />,
    <Headphones key="headphones" className={className} />,
    <Equalizer key="equalizer" className={className} />,
    <SoundWave key="soundwave" className={className} />,
    <Mic key="mic" className={className} />,
    <Zap key="zap" className={className} />,
    <Cocktail key="cocktail" className={className} />,
    <Ticket key="ticket" className={className} />,
    <Clock key="clock" className={className} />,
    <Play key="play" className={className} />,
    <QrCode key="qrcode" className={className} />,
    <LayoutDashboard key="dashboard" className={className} />,
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % icons.length)
    }, 700) // Cambiado a 700ms (0.7s)

    return () => clearInterval(interval)
  }, [icons.length])

  return <div className="flex items-center justify-center">{icons[currentIcon]}</div>
}
