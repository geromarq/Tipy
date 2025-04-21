"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function ForgotPassword() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Obtener la URL base actual para la redirección
      const baseUrl = window.location.origin
      const redirectUrl = `${baseUrl}/dj/reset-password`

      console.log("Enviando solicitud de recuperación con redirección a:", redirectUrl)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        throw error
      }

      setSuccess(true)
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      })
    } catch (err: any) {
      console.error("Error al enviar el correo de recuperación:", err)
      setError(err.message || "No se pudo enviar el correo de recuperación")
      toast({
        title: "Error",
        description: err.message || "No se pudo enviar el correo de recuperación",
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
          <h1 className="text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tu correo electrónico para recibir un enlace de recuperación
          </p>
        </div>

        <Card>
          {success ? (
            <>
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-center">Correo enviado</CardTitle>
                <CardDescription className="text-center">
                  Hemos enviado un correo con instrucciones para restablecer tu contraseña
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button className="w-full" onClick={() => router.push("/dj/login")}>
                  Volver al inicio de sesión
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
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar correo de recuperación"}
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dj/login">Volver al inicio de sesión</Link>
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
