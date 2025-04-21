"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { generateQrCode } from "@/lib/utils"
import { Copy, Plus, Trash, AlertCircle, Download, LinkIcon } from "lucide-react"
import QRCode from "react-qr-code"

export default function QrPage() {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [appUrl, setAppUrl] = useState("")

  useEffect(() => {
    // Usar la URL correcta para los enlaces QR
    setAppUrl("https://tipy.uy")

    if (!session) return
    fetchQrCodes()
  }, [session])

  const fetchQrCodes = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!session) {
        throw new Error("No hay sesión activa")
      }

      const { data, error: fetchError } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("dj_id", session.user.id)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError

      setQrCodes(data || [])
    } catch (err: any) {
      console.error("Error al cargar los códigos QR:", err)
      setError(err.message || "No se pudieron cargar los códigos QR")
      toast({
        title: "Error",
        description: err.message || "No se pudieron cargar los códigos QR",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createQrCode = async () => {
    try {
      if (!session) {
        throw new Error("No hay sesión activa")
      }

      setCreating(true)

      // Generar un código único
      const code = generateQrCode()

      // Crear el código QR en la base de datos
      const { data, error: createError } = await supabase
        .from("qr_codes")
        .insert({
          dj_id: session.user.id,
          code: code,
          active: true,
        })
        .select()

      if (createError) throw createError

      toast({
        title: "Código QR creado",
        description: "Se ha creado un nuevo código QR",
      })

      // Recargar los códigos QR
      fetchQrCodes()
    } catch (err: any) {
      console.error("Error al crear el código QR:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo crear el código QR",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const toggleQrCode = async (id: string, active: boolean) => {
    try {
      if (!session) {
        throw new Error("No hay sesión activa")
      }

      const { error } = await supabase.from("qr_codes").update({ active }).eq("id", id).eq("dj_id", session.user.id) // Asegurar que pertenece a este DJ

      if (error) throw error

      // Actualizar el estado local
      setQrCodes(qrCodes.map((qr) => (qr.id === id ? { ...qr, active } : qr)))

      toast({
        title: active ? "Código QR activado" : "Código QR desactivado",
        description: active
          ? "El código QR ahora está disponible para el público"
          : "El código QR ya no está disponible para el público",
      })
    } catch (err: any) {
      console.error("Error al actualizar el código QR:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar el estado del código QR",
        variant: "destructive",
      })
    }
  }

  const deleteQrCode = async (id: string) => {
    try {
      if (!session) {
        throw new Error("No hay sesión activa")
      }

      const { error } = await supabase.from("qr_codes").delete().eq("id", id).eq("dj_id", session.user.id) // Asegurar que pertenece a este DJ

      if (error) throw error

      // Actualizar el estado local
      setQrCodes(qrCodes.filter((qr) => qr.id !== id))

      toast({
        title: "Código QR eliminado",
        description: "El código QR ha sido eliminado permanentemente",
      })
    } catch (err: any) {
      console.error("Error al eliminar el código QR:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo eliminar el código QR",
        variant: "destructive",
      })
    }
  }

  const copyQrLink = (code: string) => {
    const link = `${appUrl}/tip/${code}`
    navigator.clipboard.writeText(link)
    toast({
      title: "Enlace copiado",
      description: "El enlace del código QR ha sido copiado al portapapeles",
    })
  }

  const downloadQR = (code: string) => {
    // Crear un canvas a partir del SVG
    const svg = document.getElementById(`qr-${code}`)
    if (!svg) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Configurar el tamaño del canvas
    canvas.width = 300
    canvas.height = 300

    // Crear una imagen a partir del SVG
    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.src = "data:image/svg+xml;base64," + btoa(svgData)

    img.onload = () => {
      // Dibujar un fondo blanco
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Dibujar la imagen del QR
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Convertir a PNG y descargar
      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `qr-tipy-${code}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "QR descargado",
        description: "El código QR ha sido descargado correctamente",
      })
    }

    img.onerror = () => {
      toast({
        title: "Error",
        description: "No se pudo descargar el código QR",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-8 pt-6 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando códigos QR...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-8 pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error al cargar los códigos QR
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => fetchQrCodes()}>Intentar nuevamente</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Códigos QRs</h2>
        <Button onClick={createQrCode} disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Creando..." : "Crear nuevo QR"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {qrCodes.length === 0 ? (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>No hay códigos QR</CardTitle>
              <CardDescription>Crea tu primer código QR para compartir con tu público</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={createQrCode} disabled={creating}>
                <Plus className="mr-2 h-4 w-4" />
                {creating ? "Creando..." : "Crear QR"}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          qrCodes.map((qr) => (
            <Card key={qr.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Código: {qr.code}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`qr-active-${qr.id}`}
                      checked={qr.active}
                      onCheckedChange={(checked) => toggleQrCode(qr.id, checked)}
                    />
                    <Label htmlFor={`qr-active-${qr.id}`}>{qr.active ? "Activo" : "Inactivo"}</Label>
                  </div>
                </CardTitle>
                <CardDescription>Creado el {new Date(qr.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {/* QR Code usando react-qr-code */}
                <div className="bg-white p-3 rounded-md">
                  <QRCode
                    id={`qr-${qr.code}`}
                    value={`${appUrl}/tip/${qr.code}`}
                    size={150}
                    level="H"
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>

                {/* Link */}
                <div className="w-full">
                  <p className="text-sm font-medium mb-2">Enlace:</p>
                  <div className="bg-background p-2 rounded border flex items-center">
                    <span className="truncate text-sm">{`${appUrl}/tip/${qr.code}`}</span>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => copyQrLink(qr.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground text-center">
                  {qr.active
                    ? "Este QR está activo y puede ser compartido con el público"
                    : "Este QR está inactivo y no puede ser usado por el público"}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => copyQrLink(qr.code)} title="Copiar enlace">
                    <LinkIcon className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadQR(qr.code)} title="Descargar QR">
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Guardar</span>
                  </Button>
                </div>
                <Button variant="destructive" size="sm" onClick={() => deleteQrCode(qr.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
