import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para formatear moneda
export function formatCurrency(amount: number, currency = "UYU"): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Función para generar UUID
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Función para generar código QR único
export function generateQrCode(): string {
  // Generar un código único usando timestamp y caracteres aleatorios
  const timestamp = Date.now().toString(36) // Convertir timestamp a base36
  const randomPart = Math.random().toString(36).substring(2, 8) // 6 caracteres aleatorios
  const extraRandom = Math.random().toString(36).substring(2, 4) // 2 caracteres extra

  // Combinar para crear un código único de aproximadamente 12-14 caracteres
  return `${timestamp}${randomPart}${extraRandom}`.toUpperCase()
}

// Función para formatear número de teléfono
export function formatPhoneNumber(phone: string): string {
  // Remover todos los caracteres que no sean números
  const cleaned = phone.replace(/\D/g, "")

  // Si el número tiene código de país (+598), formatearlo apropiadamente
  if (cleaned.startsWith("598") && cleaned.length === 11) {
    return `+598 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }

  // Si es un número local uruguayo (8 dígitos)
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`
  }

  // Si es un número con 9 dígitos (con 0 al inicio)
  if (cleaned.length === 9 && cleaned.startsWith("0")) {
    return `0${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }

  // Retornar el número original si no coincide con ningún formato conocido
  return phone
}
