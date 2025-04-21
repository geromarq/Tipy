import Image from "next/image"
import Link from "next/link"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  withText?: boolean
  isDashboard?: boolean
}

export function Logo({ size = "md", withText = true, isDashboard = false }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-12", // Aumentado de h-10 a h-12
    lg: "h-16", // Aumentado de h-12 a h-16
    xl: "h-20", // Nuevo tamaño extra grande
  }

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl", // Aumentado de text-xl a text-2xl
    lg: "text-3xl", // Aumentado de text-2xl a text-3xl
    xl: "text-4xl", // Nuevo tamaño extra grande
  }

  // Si estamos en el dashboard, usamos tamaños más pequeños
  const actualSize = isDashboard ? (size === "sm" ? "sm" : "sm") : size

  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="relative">
        <Image
          src="/logo.png"
          alt="Tipy Logo"
          width={actualSize === "sm" ? 32 : actualSize === "md" ? 48 : actualSize === "lg" ? 64 : 80}
          height={actualSize === "sm" ? 32 : actualSize === "md" ? 48 : actualSize === "lg" ? 64 : 80}
          className={sizeClasses[actualSize]}
        />
      </div>
      {withText && <span className={`font-bold ${textSizes[actualSize]}`}>Tipy</span>}
    </Link>
  )
}
