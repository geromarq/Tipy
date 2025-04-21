"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, generateUUID } from "@/lib/utils"
import { Music, LinkIcon, Star } from "lucide-react"

export default function TipPage() {
  const params = useParams()
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [djDetails, setDjDetails] = useState<any>(null)
  const [qrDetails, setQrDetails] = useState<any>(null)
  const [messageType, setMessageType] = useState<"normal" | "spotify" | "priority">("normal")
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: "",
    spotifyLink: "",
  })
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => {
    fetchQrDetails()
  }, [])

  const fetchQrDetails = async () => {
    try {
      setLoading(true)
      const { data: qrData, error: qrError } = await supabase
        .from("qr_codes")
        .select("*, djs(*)")
        .eq("code", params.code)
        .single()

      if (qrError || !qrData) {
        router.push("/")
        return
      }

      if (!qrData.active) {
        toast({
          title: "Tipy Pausado",
          description: "El DJ ha pausado temporalmente las recomendaciones",
          variant: "destructive",
        })
        setQrDetails(qrData)
        setDjDetails(qrData.djs)
        setLoading(false)
        return
      }

      setQrDetails(qrData)
      setDjDetails(qrData.djs)
    } catch (error) {
      console.error("Error fetching QR details:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite solo dígitos y elimina cualquier otro caracter
    const value = e.target.value.replace(/\D/g, "")
    setFormData((prev) => ({ ...prev, phone: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setDebugInfo(null)

    try {
      // Generate a UUID for the client
      const clientId = generateUUID()

      // Prepare client data
      const clientData = {
        id: clientId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        created_at: new Date().toISOString(),
      }

      // Log the data being sent for debugging
      console.log("Sending client data:", clientData)

      // Create client - using insert directly without select=*
      const { error: clientError, data: clientResponse } = await supabase.from("clients").insert(clientData).select()

      if (clientError) {
        console.error("Client insertion error:", clientError)
        setDebugInfo(
          JSON.stringify(
            {
              error: clientError,
              data: clientData,
            },
            null,
            2,
          ),
        )
        throw new Error(`Error al crear cliente: ${clientError.message}`)
      }

      console.log("Client created:", clientResponse)

      // Create recommendation
      const recommendationData = {
        dj_id: djDetails.id,
        client_id: clientId,
        message: messageType === "normal" ? formData.message : null,
        spotify_link: messageType === "spotify" ? formData.spotifyLink : null,
        is_priority: messageType === "priority",
        accepted: messageType === "priority", // Auto-accept priority messages
      }

      const { data: recommendationResponse, error: recommendationError } = await supabase
        .from("recommendations")
        .insert(recommendationData)
        .select()
        .single()

      if (recommendationError) {
        console.error("Recommendation insertion error:", recommendationError)
        throw new Error(`Error al crear recomendación: ${recommendationError.message}`)
      }

      // Redirect to payment page
      router.push(`/tip/${params.code}/payment?recommendation=${recommendationResponse.id}`)
    } catch (error: any) {
      console.error("Error submitting recommendation:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la recomendación",
        variant: "destructive",
      })
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Logo size="lg" />
        <p className="mt-4 text-center text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!qrDetails.active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Logo size="lg" />
        <Card className="w-full max-w-md mt-8">
          <CardHeader>
            <CardTitle>Tipy Pausado</CardTitle>
            <CardDescription>{djDetails.display_name} ha pausado temporalmente las recomendaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">Intenta nuevamente más tarde</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4">
      <Logo size="lg" />
      <div className="w-full max-w-md mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recomienda música a {djDetails.display_name}</CardTitle>
            <CardDescription>Envía tu recomendación y agrega una propina</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Tu nombre"
                  required
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="Tu número de teléfono"
                  required
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de recomendación</Label>
                <RadioGroup
                  value={messageType}
                  onValueChange={(value) => setMessageType(value as any)}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="flex items-center">
                      <Music className="mr-2 h-4 w-4" />
                      Mensaje normal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="spotify" id="spotify" />
                    <Label htmlFor="spotify" className="flex items-center">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Link de Spotify
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="priority" id="priority" />
                    <Label htmlFor="priority" className="flex items-center">
                      <Star className="mr-2 h-4 w-4" />
                      Mensaje prioritario
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {messageType === "normal" && (
                <div className="space-y-2">
                  <Label htmlFor="message">Tu recomendación</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="¿Qué canción te gustaría escuchar?"
                    required
                    value={formData.message}
                    onChange={handleChange}
                  />
                </div>
              )}
              {messageType === "spotify" && (
                <div className="space-y-2">
                  <Label htmlFor="spotifyLink">Link de Spotify</Label>
                  <Input
                    id="spotifyLink"
                    name="spotifyLink"
                    placeholder="https://open.spotify.com/track/..."
                    required
                    value={formData.spotifyLink}
                    onChange={handleChange}
                  />
                </div>
              )}
              {messageType === "priority" && (
                <div className="space-y-2">
                  <Label htmlFor="message">Tu recomendación prioritaria</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="¿Qué canción te gustaría escuchar con prioridad?"
                    required
                    value={formData.message}
                    onChange={handleChange}
                  />
                  <div className="p-4 bg-accent rounded-md">
                    <p className="text-sm text-accent-foreground">
                      Los mensajes prioritarios son aceptados automáticamente por el DJ.
                    </p>
                  </div>
                </div>
              )}

              {debugInfo && (
                <div className="mt-4 p-4 bg-muted rounded-md overflow-auto max-h-60">
                  <p className="text-xs font-mono mb-2">Debug Info:</p>
                  <pre className="text-xs font-mono">{debugInfo}</pre>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Enviando..." : "Continuar"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Propina mínima: {formatCurrency(djDetails.min_tip_amount)}
        </p>
      </div>
    </div>
  )
}
