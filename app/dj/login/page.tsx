"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default function Login() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    identifier: "", // Ahora usamos un campo genérico para email o username
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Determinar si el identificador es un email o un nombre de usuario
      const isEmail = formData.identifier.includes("@")
      let userData = {}

      if (isEmail) {
        // Si es un email, usamos el método normal de inicio de sesión
        userData = {
          email: formData.identifier,
          password: formData.password,
        }
      } else {
        // Si es un nombre de usuario (arroba), buscamos primero el email asociado
        const { data: djData, error: djError } = await supabase
          .from("djs")
          .select("email")
          .eq("username", formData.identifier)
          .single()

        if (djError || !djData) {
          throw new Error("Nombre de usuario no encontrado")
        }

        userData = {
          email: djData.email,
          password: formData.password,
        }
      }

      // Iniciar sesión con el email (ya sea proporcionado directamente o encontrado por username)
      const { data, error } = await supabase.auth.signInWithPassword(userData as any)

      if (error) {
        throw error
      }

      if (data.user) {
        // Verificar si existe el perfil de DJ
        const { data: djProfile, error: profileError } = await supabase
          .from("djs")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle() // Usamos maybeSingle para evitar errores si no hay resultados

        if (profileError) {
          console.error("Error al verificar perfil de DJ:", profileError)
        }

        // Si no existe el perfil, lo creamos
        if (!djProfile) {
          console.log("Creando perfil de DJ para usuario existente")

          // Generar un hash simple para la contraseña
          const encoder = new TextEncoder()
          const passwordData = encoder.encode(formData.password)
          const hashBuffer = await crypto.subtle.digest("SHA-256", passwordData)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

          // Crear perfil de DJ
          const { error: createError } = await supabase.from("djs").insert({
            id: data.user.id,
            email: data.user.email || "",
            username: data.user.email?.split("@")[0] || "user_" + Date.now(),
            display_name: data.user.email?.split("@")[0] || "Usuario",
            min_tip_amount: 10, // Actualizado a 10 pesos mínimo
            password_hash: passwordHash,
          })

          if (createError) {
            console.error("Error al crear perfil de DJ:", createError)
          }
        }

        toast({
          title: "Inicio de sesión exitoso",
          description: "Has iniciado sesión correctamente",
        })

        // Forzar una actualización de la sesión en el cliente
        await supabase.auth.getSession()

        // Redirigir al dashboard
        router.push("/dj/dashboard")
      }
    } catch (err: any) {
      console.error("Error de inicio de sesión:", err)
      setError(err.message || "Ocurrió un error durante el inicio de sesión")
      toast({
        title: "Error",
        description: err.message || "Ocurrió un error durante el inicio de sesión",
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
          <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">Ingresa tus credenciales para acceder a tu cuenta</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-destructive/10 text-destructive rounded-md">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
              <CardDescription>Ingresa tu email o nombre de usuario</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="identifier">Email o nombre de usuario</Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    type="text"
                    placeholder="tu@email.com o tu-username"
                    required
                    value={formData.identifier}
                    onChange={handleChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
              <Link
                href="/dj/forgot-password"
                className="mt-2 text-sm text-center text-muted-foreground hover:text-primary"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </CardFooter>
          </form>
        </Card>
        <p className="px-8 text-center text-sm text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <Link href="/dj/register" className="underline underline-offset-4 hover:text-primary">
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  )
}
