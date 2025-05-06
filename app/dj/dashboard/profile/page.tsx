"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function ProfilePage() {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [djProfile, setDjProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    minTipAmount: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Agregar al estado
  const [expirationConfig, setExpirationConfig] = useState({
    expiration_time: 3600, // 1 hora por defecto
    auto_reject_expired: true,
  })

  const MIN_TIP_AMOUNT = 10 // Mínimo de 10 pesos

  useEffect(() => {
    if (!session) return

    const fetchDjProfile = async () => {
      try {
        setLoading(true)

        // Buscar el perfil del DJ por ID
        const { data, error } = await supabase.from("djs").select("*").eq("id", session.user.id).maybeSingle()

        if (error) {
          console.error("Error al obtener perfil de DJ:", error)
          toast({
            title: "Error",
            description: "No se pudo cargar tu perfil",
            variant: "destructive",
          })
          return
        }

        // Si encontramos el perfil, lo usamos
        if (data) {
          setDjProfile(data)

          // Inicializar el formulario con los datos del perfil
          setFormData({
            ...formData,
            displayName: data.display_name || "",
            username: data.username || "",
            minTipAmount: data.min_tip_amount?.toString() || MIN_TIP_AMOUNT.toString(),
          })
          return
        }

        // Si no hay perfil, verificamos si ya existe un DJ con el mismo email
        const { data: existingDjWithEmail, error: emailCheckError } = await supabase
          .from("djs")
          .select("*")
          .eq("email", session.user.email)
          .maybeSingle()

        if (emailCheckError) {
          console.error("Error al verificar email existente:", emailCheckError)
        }

        // Si ya existe un DJ con ese email, actualizamos su ID para que coincida con el usuario actual
        if (existingDjWithEmail) {
          const { error: updateError } = await supabase
            .from("djs")
            .update({ id: session.user.id })
            .eq("email", session.user.email)

          if (updateError) {
            console.error("Error al actualizar ID de DJ existente:", updateError)
            toast({
              title: "Error",
              description: "No se pudo vincular tu perfil existente",
              variant: "destructive",
            })
            return
          }

          // Obtenemos el perfil actualizado
          const { data: updatedProfile, error: fetchError } = await supabase
            .from("djs")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (fetchError) {
            console.error("Error al obtener perfil actualizado:", fetchError)
            return
          }

          setDjProfile(updatedProfile)
          setFormData({
            ...formData,
            displayName: updatedProfile.display_name || "",
            username: updatedProfile.username || "",
            minTipAmount: updatedProfile.min_tip_amount?.toString() || MIN_TIP_AMOUNT.toString(),
          })
          return
        }

        // Si no existe, creamos un nuevo perfil
        console.log("Creando perfil de DJ para usuario existente")

        // Generar un nombre de usuario único
        const timestamp = Date.now()
        const uniqueUsername = `user_${timestamp}`

        // Crear un perfil básico
        const { data: newProfile, error: createError } = await supabase
          .from("djs")
          .insert({
            id: session.user.id,
            email: session.user.email || "",
            username: uniqueUsername,
            display_name: session.user.email?.split("@")[0] || "Usuario",
            min_tip_amount: MIN_TIP_AMOUNT,
            password_hash: `auto_generated_${timestamp}`,
          })
          .select()
          .single()

        if (createError) {
          console.error("Error al crear perfil de DJ:", createError)
          toast({
            title: "Error",
            description: "No se pudo crear tu perfil",
            variant: "destructive",
          })
          return
        }

        setDjProfile(newProfile)

        // Inicializar el formulario con los datos del nuevo perfil
        setFormData({
          ...formData,
          displayName: newProfile.display_name || "",
          username: newProfile.username || "",
          minTipAmount: newProfile.min_tip_amount?.toString() || MIN_TIP_AMOUNT.toString(),
        })

        // Cargar configuración de expiración
        const { data: configData, error: configError } = await supabase
          .from("suggestion_config")
          .select("*")
          .eq("dj_id", session.user.id)
          .maybeSingle()

        if (configError) {
          console.error("Error al obtener configuración de expiración:", configError)
        } else if (configData) {
          setExpirationConfig({
            expiration_time: configData.expiration_time,
            auto_reject_expired: configData.auto_reject_expired,
          })
        } else {
          // Si no existe configuración, crear una por defecto
          const { error: createConfigError } = await supabase.from("suggestion_config").insert({
            dj_id: session.user.id,
            expiration_time: 3600, // 1 hora por defecto
            auto_reject_expired: true,
          })

          if (createConfigError) {
            console.error("Error al crear configuración de expiración:", createConfigError)
          }
        }
      } catch (err) {
        console.error("Error al cargar el perfil:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDjProfile()
  }, [session, supabase, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session) {
      toast({
        title: "Error",
        description: "No hay sesión activa",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      // Validar datos
      if (!formData.displayName.trim()) {
        throw new Error("El nombre artístico es obligatorio")
      }

      if (!formData.username.trim()) {
        throw new Error("El nombre de usuario es obligatorio")
      }

      const minTipAmount = Number.parseFloat(formData.minTipAmount)
      if (isNaN(minTipAmount) || minTipAmount < MIN_TIP_AMOUNT) {
        throw new Error(`La propina mínima debe ser un número válido mayor o igual a ${MIN_TIP_AMOUNT}`)
      }

      // Verificar si el nombre de usuario ya existe (si ha cambiado)
      if (formData.username !== djProfile.username) {
        const { data: existingUsers, error: usernameError } = await supabase
          .from("djs")
          .select("id")
          .eq("username", formData.username)
          .neq("id", session.user.id)

        if (usernameError) throw usernameError

        if (existingUsers && existingUsers.length > 0) {
          throw new Error("El nombre de usuario ya está en uso")
        }
      }

      // Actualizar el perfil
      const { error: updateError } = await supabase
        .from("djs")
        .update({
          display_name: formData.displayName.trim(),
          username: formData.username.trim(),
          min_tip_amount: minTipAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)

      if (updateError) throw updateError

      toast({
        title: "Perfil actualizado",
        description: "Tu perfil ha sido actualizado correctamente",
      })

      // Recargar el perfil para mostrar los cambios
      const { data: updatedProfile, error: reloadError } = await supabase
        .from("djs")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (reloadError) throw reloadError

      setDjProfile(updatedProfile)
    } catch (err: any) {
      console.error("Error al actualizar el perfil:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session) {
      toast({
        title: "Error",
        description: "No hay sesión activa",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      // Validar contraseñas
      if (!formData.newPassword) {
        throw new Error("La nueva contraseña es obligatoria")
      }

      if (formData.newPassword.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error("Las contraseñas no coinciden")
      }

      // Actualizar la contraseña
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (error) throw error

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente",
      })

      // Limpiar el formulario
      setFormData({
        ...formData,
        newPassword: "",
        confirmPassword: "",
      })
    } catch (err: any) {
      console.error("Error al actualizar la contraseña:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar la contraseña",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Agregar función para manejar cambios en la configuración
  const handleExpirationChange = (value: string) => {
    const time = Number.parseInt(value)
    setExpirationConfig((prev) => ({ ...prev, expiration_time: time }))
  }

  const handleAutoRejectChange = (value: boolean) => {
    setExpirationConfig((prev) => ({ ...prev, auto_reject_expired: value }))
  }

  // Agregar función para guardar la configuración
  const saveExpirationConfig = async () => {
    try {
      setSaving(true)

      // Usar upsert en lugar de insert para evitar el error de clave duplicada
      const { error } = await supabase.from("suggestion_config").upsert(
        {
          dj_id: session.user.id,
          expiration_time: expirationConfig.expiration_time,
          auto_reject_expired: expirationConfig.auto_reject_expired,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "dj_id", // Especificar la columna de conflicto
        },
      )

      if (error) throw error

      toast({
        title: "Configuración guardada",
        description: "La configuración de expiración ha sido actualizada",
      })
    } catch (err: any) {
      console.error("Error al guardar configuración:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-8 pt-6 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    )
  }

  if (!djProfile) {
    return (
      <div className="flex-1 p-8 pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error al cargar el perfil
            </CardTitle>
            <CardDescription>No se pudo cargar la información de tu perfil</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>Recargar página</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Perfil</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <form onSubmit={handleProfileSubmit}>
            <CardHeader>
              <CardTitle>Información del perfil</CardTitle>
              <CardDescription>Actualiza tu información personal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre artístico</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de usuario</Label>
                <div className="flex items-center">
                  <span className="mr-1">@</span>
                  <Input id="username" name="username" value={formData.username} onChange={handleChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minTipAmount">Propina mínima</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                  <Input
                    id="minTipAmount"
                    name="minTipAmount"
                    type="number"
                    min={MIN_TIP_AMOUNT}
                    className="pl-7"
                    value={formData.minTipAmount}
                    onChange={handleChange}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta es la propina mínima que los clientes deben pagar (mínimo ${MIN_TIP_AMOUNT})
                </p>
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input value={djProfile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">No puedes cambiar tu correo electrónico</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <form onSubmit={handlePasswordSubmit}>
            <CardHeader>
              <CardTitle>Cambiar contraseña</CardTitle>
              <CardDescription>Actualiza tu contraseña</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Guardando..." : "Cambiar contraseña"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveExpirationConfig()
            }}
          >
            <CardHeader>
              <CardTitle>Configuración de sugerencias</CardTitle>
              <CardDescription>Configura cómo se manejan las sugerencias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expirationTime">Tiempo de expiración de sugerencias</Label>
                <Select value={expirationConfig.expiration_time.toString()} onValueChange={handleExpirationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tiempo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="600">10 minutos</SelectItem>
                    <SelectItem value="900">15 minutos</SelectItem>
                    <SelectItem value="1800">30 minutos</SelectItem>
                    <SelectItem value="2700">45 minutos</SelectItem>
                    <SelectItem value="3600">1 hora</SelectItem>
                    <SelectItem value="7200">2 horas</SelectItem>
                    <SelectItem value="10800">3 horas</SelectItem>
                    <SelectItem value="14400">4 horas</SelectItem>
                    <SelectItem value="18000">5 horas</SelectItem>
                    <SelectItem value="21600">6 horas</SelectItem>
                    <SelectItem value="0">Nunca</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Las sugerencias no aceptadas expirarán después de este tiempo
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoReject"
                  checked={expirationConfig.auto_reject_expired}
                  onCheckedChange={handleAutoRejectChange}
                />
                <Label htmlFor="autoReject">Rechazar automáticamente sugerencias expiradas</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Guardando..." : "Guardar configuración"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
