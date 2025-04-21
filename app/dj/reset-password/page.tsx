"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function ResetPassword() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validHash, setValidHash] = useState(false)

  useEffect(() => {
    // Verificar si hay un hash en la URL (indicando que viene de un enlace de recuperación)
    const checkHash = () => {
      const hash = window.location.hash
      console.log("Hash detectado:", hash)

      if (hash && (hash.includes("type=recovery") || hash.includes("type=signup"))) {
        setValidHash(true)
      } else {
        setError("Este enlace de recuperación no es válido o ha expirado")
        toast({
          title: "Enlace inválido",
          description: "Este enlace de recuperación no es válido o ha expirado",
          variant: "destructive",
        })
      }
    }

    // Ejecutar la verificación después de que el componente se monte
    setTimeout(checkHash, 500)
  }, [toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validar que las contraseñas coincidan
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Las contraseñas no coinciden")
      }

      // Validar longitud mínima
      if (formData.password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      // Actualizar la contraseña
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (error) {
        throw error
      }

      setSuccess(true)
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente",
      })

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push("/dj/login")
      }, 3000)
    } catch (err: any) {
      console.error("Error al restablecer la contraseña:", err)
      setError(err.message || "No se pudo restablecer la contraseña")
      toast({
        title: "Error",
        description: err.message || "No se pudo restablecer la contraseña",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Logo size="lg" />
          <h1 className="text-2xl font-semibold tracking-tight">Restablecer contraseña</h1>
          <p className="text-sm text-muted-foreground">Ingresa tu nueva contraseña para continuar</p>
        </div>

        <Card>
          {success ? (
            <>
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-center">Contraseña actualizada</CardTitle>
                <CardDescription className="text-center">
                  Tu contraseña ha sido actualizada correctamente. Serás redirigido al inicio de sesión.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button className="w-full" onClick={() => router.push("/dj/login")}>
                  Ir al inicio de sesión
                </Button>
              </CardFooter>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader>
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-destructive/10 text-destructive rounded-md">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                {!validHash && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-destructive/10 text-destructive rounded-md">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm">
                      Este enlace no es válido o ha expirado. Por favor solicita un nuevo enlace de recuperación.
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password">Nueva contraseña</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={!validHash}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={!validHash}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading || !validHash}>
                  {loading ? "Actualizando..." : "Restablecer contraseña"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        {!validHash && (
          <div className="text-center">
            <Button variant="link" onClick={() => router.push("/dj/forgot-password")}>
              Solicitar un nuevo enlace de recuperación
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
