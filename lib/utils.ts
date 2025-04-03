import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { customAlphabet } from "nanoid"
import { v4 as uuidv4 } from "uuid"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a short, readable ID for QR codes
export function generateQrCode() {
  // Usar solo letras mayúsculas y números para mayor legibilidad
  const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8)
  return nanoid()
}

// Generate a UUID compatible with Supabase
export function generateUUID() {
  return uuidv4()
}

// Format currency in UYU (Uruguayan Peso)
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
  }).format(amount)
}

// Validate Spotify URL
export function isValidSpotifyUrl(url: string) {
  return url.startsWith("https://open.spotify.com/") || url.startsWith("spotify:") || url.includes("spotify.com")
}

// Format phone number
export function formatPhoneNumber(phoneNumber: string) {
  // Remove non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, "")

  // Format as (XXX) XXX-XXXX if it's a 10-digit number
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  return phoneNumber
}

