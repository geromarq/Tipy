"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function Register() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    username: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Función para generar un hash simple usando la API Web Crypto
  const generateSimpleHash = async (text: string): Promise<string> => {
    // Convertir la cadena a un ArrayBuffer
    const encoder = new TextEncoder()
    const data = encoder.encode(text)

    // Generar el hash usando SHA-256
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)

    // Convertir el ArrayBuffer a una cadena hexadecimal
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    return hashHex
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validar formulario
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Error",
          description: "Las contraseñas no coinciden",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (formData.password.length < 6) {
        toast({
          title: "Error",
          description: "La contraseña debe tener al menos 6 caracteres",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Verificar si el nombre de usuario está disponible
      const { data: existingUser, error: usernameError } = await supabase
        .from("djs")
        .select("username")
        .eq("username", formData.username)
        .single()

      if (existingUser) {
        toast({
          title: "Error",
          description: "El nombre de usuario ya está en uso",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Registrar usuario con Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dj/dashboard`,
          data: {
            display_name: formData.displayName,
            username: formData.username,
          },
        },
      })

      if (error) {
        toast({
          title: "Error al registrarse",
          description: error.message,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (data.user) {
        // Generar un hash de la contraseña para almacenar en la tabla djs
        const passwordHash = await generateSimpleHash(formData.password)

        // Crear perfil de DJ
        const { error: profileError } = await supabase.from("djs").insert({
          id: data.user.id,
          email: formData.email,
          username: formData.username,
          display_name: formData.displayName,
          min_tip_amount: 100, // Monto mínimo de propina predeterminado (100 ARS)
          password_hash: passwordHash,
        })

        if (profileError) {
          console.error("Error al crear perfil:", profileError)

          // Intentar crear el perfil nuevamente con un enfoque diferente
          const { error: retryError } = await supabase.from("djs").upsert({
            id: data.user.id,
            email: formData.email,
            username: formData.username,
            display_name: formData.displayName,
            min_tip_amount: 100,
            password_hash: passwordHash,
          })

          if (retryError) {
            console.error("Error al reintentar crear perfil:", retryError)
            toast({
              title: "Error al crear perfil",
              description: "Hubo un problema al crear tu perfil. Por favor, contacta al soporte.",
              variant: "destructive",
            })
            setLoading(false)
            return
          }
        }

        toast({
          title: "Registro exitoso",
          description: "Te has registrado correctamente. Revisa tu correo para confirmar tu cuenta.",
        })

        // Iniciar sesión automáticamente
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (signInError) {
          console.error("Error al iniciar sesión automáticamente:", signInError)
        }

        // Redirigir al dashboard
        router.push("/dj/dashboard")
      }
    } catch (error) {
      console.error("Error de registro:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error durante el registro",
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
          <h1 className="text-2xl font-semibold tracking-tight">Crear una cuenta</h1>
          <p className="text-sm text-muted-foreground">Ingresa tus datos para registrarte como DJ</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Nombre artístico</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    placeholder="DJ Nombre"
                    required
                    value={formData.displayName}
                    onChange={handleChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <div className="flex items-center">
                    <span className="mr-1">@</span>
                    <Input
                      id="username"
                      name="username"
                      placeholder="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </div>
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
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Registrarse"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <p className="px-8 text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/dj/login" className="underline underline-offset-4 hover:text-primary">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

