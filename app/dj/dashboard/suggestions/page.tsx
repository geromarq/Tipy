"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatPhoneNumber, formatCurrency } from "@/lib/utils"
import {
  Check,
  X,
  Music,
  LinkIcon,
  Star,
  ExternalLink,
  AlertCircle,
  Info,
  Clock,
  CheckCircle,
  RefreshCcw,
  AlertTriangle,
  DollarSign,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function SuggestionsPage() {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("pending")
  const [now, setNow] = useState(new Date())
  const [showOlderSuggestions, setShowOlderSuggestions] = useState(false)
  const [hiddenSuggestions, setHiddenSuggestions] = useState<string[]>([])
  const [processingRefund, setProcessingRefund] = useState<string | null>(null)
  const [confirmRefundDialog, setConfirmRefundDialog] = useState<{
    open: boolean
    suggestionId: string | null
    paymentInfo: any | null
  }>({
    open: false,
    suggestionId: null,
    paymentInfo: null,
  })
  const [refundStatus, setRefundStatus] = useState<{
    suggestionId: string | null
    status: "success" | "error" | "processing" | null
    message: string | null
  }>({
    suggestionId: null,
    status: null,
    message: null,
  })

  // Actualizar el tiempo actual cada segundo para los temporizadores
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!session) return

    fetchSuggestions()
  }, [session, activeTab])

  // Modificar la función getSuggestionContent para mostrar el monto de la propina
  const getSuggestionContent = (suggestion: any) => {
    // Obtener el monto de la propina si existe
    const tipAmount = suggestion.payments?.find((payment: any) => payment.status === "approved")?.amount || 0

    if (suggestion.spotify_link) {
      return (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center">
            <span className="truncate text-base">{suggestion.spotify_link}</span>
            <a
              href={suggestion.spotify_link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-primary hover:text-primary/80"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          {tipAmount > 0 && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400 inline-flex items-center px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-3 w-3 mr-1" />
              Propina: {formatCurrency(tipAmount)}
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div className="flex flex-col space-y-2">
          <p className="text-base">{suggestion.message}</p>
          {tipAmount > 0 && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400 inline-flex items-center px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-3 w-3 mr-1" />
              Propina: {formatCurrency(tipAmount)}
            </div>
          )}
        </div>
      )
    }
  }

  // Modificar la función fetchSuggestions para verificar sugerencias expiradas
  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!session) {
        throw new Error("No hay sesión activa")
      }

      let query = supabase
        .from("recommendations")
        .select("*, clients(*), payments(*)")
        .eq("dj_id", session.user.id)
        .order("created_at", { ascending: false })

      if (activeTab === "pending") {
        // Incluir sugerencias pendientes y expiradas
        query = query.eq("accepted", false)
      } else if (activeTab === "accepted") {
        query = query.eq("accepted", true)
      } else if (activeTab === "spotify") {
        query = query.not("spotify_link", "is", null)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Filtrar para mostrar solo sugerencias pagadas
      const paidSuggestions =
        data?.filter(
          (suggestion) =>
            suggestion.payments && suggestion.payments.some((payment: any) => payment.status === "approved"),
        ) || []

      // Verificar si hay sugerencias expiradas y actualizarlas
      const now = new Date()
      const expiredSuggestions = paidSuggestions.filter(
        (suggestion) =>
          !suggestion.is_expired &&
          suggestion.expires_at &&
          new Date(suggestion.expires_at) < now &&
          !suggestion.accepted,
      )

      // Actualizar sugerencias expiradas en la base de datos
      if (expiredSuggestions.length > 0) {
        const expiredIds = expiredSuggestions.map((s) => s.id)

        await supabase.from("recommendations").update({ is_expired: true }).in("id", expiredIds)

        // Actualizar el estado local
        paidSuggestions.forEach((suggestion) => {
          if (expiredIds.includes(suggestion.id)) {
            suggestion.is_expired = true
          }
        })
      }

      setSuggestions(paidSuggestions)
      setShowOlderSuggestions(false)
    } catch (err: any) {
      console.error("Error al cargar las sugerencias:", err)
      setError(err.message || "No se pudieron cargar las sugerencias")
      toast({
        title: "Error",
        description: err.message || "No se pudieron cargar las sugerencias",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (id: string) => {
    try {
      if (!session) {
        throw new Error("No hay sesión activa")
      }

      const { error } = await supabase
        .from("recommendations")
        .update({ accepted: true })
        .eq("id", id)
        .eq("dj_id", session.user.id) // Asegurar que pertenece a este DJ

      if (error) throw error

      // Actualizar el estado local
      setSuggestions(
        suggestions.map((suggestion) => (suggestion.id === id ? { ...suggestion, accepted: true } : suggestion)),
      )

      toast({
        title: "Sugerencia aceptada",
        description: "La sugerencia ha sido aceptada",
      })
    } catch (err: any) {
      console.error("Error al aceptar la sugerencia:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo aceptar la sugerencia",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (id: string) => {
    try {
      // Buscar la sugerencia para obtener información de pago
      const suggestion = suggestions.find((s) => s.id === id)

      if (!suggestion) {
        throw new Error("Sugerencia no encontrada")
      }

      // Verificar si hay pagos aprobados
      const approvedPayment = suggestion.payments?.find((p: any) => p.status === "approved")

      if (approvedPayment) {
        // Mostrar diálogo de confirmación con información del pago
        setConfirmRefundDialog({
          open: true,
          suggestionId: id,
          paymentInfo: approvedPayment,
        })
        return
      }

      // Si no hay pagos aprobados, simplemente eliminar la sugerencia
      await deleteRecommendation(id)
    } catch (err: any) {
      console.error("Error al rechazar la sugerencia:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo rechazar la sugerencia",
        variant: "destructive",
      })
    }
  }

  const deleteRecommendation = async (id: string) => {
    try {
      if (!session) {
        throw new Error("No hay sesión activa")
      }

      const { error } = await supabase.from("recommendations").delete().eq("id", id).eq("dj_id", session.user.id) // Asegurar que pertenece a este DJ

      if (error) throw error

      setSuggestions(suggestions.filter((suggestion) => suggestion.id !== id))

      toast({
        title: "Sugerencia rechazada",
        description: "La sugerencia ha sido rechazada",
      })
    } catch (err: any) {
      console.error("Error al eliminar la recomendación:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo eliminar la recomendación",
        variant: "destructive",
      })
    }
  }

  const handleConfirmRefund = async () => {
    if (!confirmRefundDialog.suggestionId || !confirmRefundDialog.paymentInfo) {
      return
    }

    const suggestionId = confirmRefundDialog.suggestionId
    const paymentInfo = confirmRefundDialog.paymentInfo

    setProcessingRefund(suggestionId)
    setRefundStatus({
      suggestionId,
      status: "processing",
      message: "Procesando reembolso...",
    })
    setConfirmRefundDialog({ open: false, suggestionId: null, paymentInfo: null })

    try {
      // Procesar el reembolso
      const response = await fetch("/api/refund-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mercadopagoId: paymentInfo.mercadopago_id,
          recommendationId: suggestionId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar el reembolso")
      }

      // Actualizar la lista de sugerencias
      setSuggestions(suggestions.filter((suggestion) => suggestion.id !== suggestionId))

      setRefundStatus({
        suggestionId,
        status: "success",
        message: "Reembolso procesado correctamente",
      })

      toast({
        title: "Reembolso procesado",
        description: "La sugerencia ha sido rechazada y el pago reembolsado",
      })

      // Limpiar el estado después de 5 segundos
      setTimeout(() => {
        setRefundStatus({
          suggestionId: null,
          status: null,
          message: null,
        })
      }, 5000)
    } catch (err: any) {
      console.error("Error al procesar el reembolso:", err)

      setRefundStatus({
        suggestionId,
        status: "error",
        message: err.message || "Error al procesar el reembolso",
      })

      toast({
        title: "Error",
        description: err.message || "No se pudo procesar el reembolso",
        variant: "destructive",
      })

      // Intentar eliminar la sugerencia de todos modos después de un error
      try {
        await deleteRecommendation(suggestionId)
      } catch (deleteErr) {
        console.error("Error al eliminar la recomendación después de un reembolso fallido:", deleteErr)
      }
    } finally {
      setProcessingRefund(null)
    }
  }

  const handleHideSuggestion = (id: string) => {
    setHiddenSuggestions((prev) => [...prev, id])
    toast({
      title: "Sugerencia ocultada",
      description: "La sugerencia ha sido ocultada de esta vista",
    })
  }

  const getSuggestionIcon = (suggestion: any) => {
    if (suggestion.is_priority) {
      return <Star className="h-5 w-5 text-yellow-500" />
    } else if (suggestion.spotify_link) {
      return <LinkIcon className="h-5 w-5 text-green-500" />
    } else {
      return <Music className="h-5 w-5 text-primary" />
    }
  }

  const getSuggestionType = (suggestion: any) => {
    if (suggestion.is_priority) {
      return "Prioritaria"
    } else if (suggestion.spotify_link) {
      return "Spotify"
    } else {
      return "Normal"
    }
  }

  // Función para extraer el ID de la canción de Spotify de una URL
  const getSpotifyTrackId = (spotifyLink: string) => {
    try {
      // Patrones comunes de URLs de Spotify
      const patterns = [
        /spotify:track:([a-zA-Z0-9]+)/,
        /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
        /spotify\.com\/track\/([a-zA-Z0-9]+)/,
      ]

      for (const pattern of patterns) {
        const match = spotifyLink.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }

      return null
    } catch (error) {
      console.error("Error al extraer ID de Spotify:", error)
      return null
    }
  }

  const hasPaid = (suggestion: any) => {
    return suggestion.payments && suggestion.payments.some((payment: any) => payment.status === "approved")
  }

  // Modificar la función isWithinTimeWindow para verificar expiración
  const isWithinTimeWindow = (suggestion: any) => {
    if (!suggestion.created_at) return false

    // Si la sugerencia tiene fecha de expiración, usarla
    if (suggestion.expires_at) {
      return new Date() < new Date(suggestion.expires_at)
    }

    // Si no tiene fecha de expiración, usar el comportamiento anterior (1 hora)
    const creationTime = new Date(suggestion.created_at)
    const oneHourLater = new Date(creationTime)
    oneHourLater.setHours(oneHourLater.getHours() + 1)

    return now < oneHourLater
  }

  // Verificar si una sugerencia es de hace más de 1 día
  const isOlderThanOneDay = (suggestion: any) => {
    if (!suggestion.created_at) return false

    const creationTime = new Date(suggestion.created_at)
    const oneDayAgo = new Date(now)
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    return creationTime < oneDayAgo
  }

  // Modificar la función getRemainingTime para usar la fecha de expiración
  const getRemainingTime = (suggestion: any) => {
    // Si la sugerencia tiene fecha de expiración, usarla
    if (suggestion.expires_at) {
      const expirationTime = new Date(suggestion.expires_at)
      const diffMs = expirationTime.getTime() - now.getTime()

      if (diffMs <= 0) return null

      const minutes = Math.floor(diffMs / 60000)
      const seconds = Math.floor((diffMs % 60000) / 1000)

      return `${minutes}:${seconds.toString().padStart(2, "0")}`
    }

    // Si no tiene fecha de expiración, usar el comportamiento anterior (1 hora desde creación)
    if (!suggestion.created_at) return null

    const creationTime = new Date(suggestion.created_at)
    const oneHourLater = new Date(creationTime)
    oneHourLater.setHours(oneHourLater.getHours() + 1)

    const diffMs = oneHourLater.getTime() - now.getTime()
    if (diffMs <= 0) return null

    const minutes = Math.floor(diffMs / 60000)
    const seconds = Math.floor((diffMs % 60000) / 1000)

    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Filtrar sugerencias según criterios
  const filterSuggestions = (suggestions: any[]) => {
    // Filtrar sugerencias ocultas
    let filtered = suggestions.filter((s) => !hiddenSuggestions.includes(s.id))

    // Si no estamos mostrando sugerencias antiguas, filtrar las de más de 1 día
    if (!showOlderSuggestions && activeTab === "all") {
      filtered = filtered.filter((s) => !isOlderThanOneDay(s))
    }

    return filtered
  }

  // Ordenar sugerencias para mostrar primero las aceptadas dentro de la ventana de tiempo
  const sortedSuggestions = [...suggestions]
    .filter((s) => !hiddenSuggestions.includes(s.id))
    .sort((a, b) => {
      // Primero las aceptadas dentro de la ventana de tiempo
      const aInWindow = a.accepted && isWithinTimeWindow(a)
      const bInWindow = b.accepted && isWithinTimeWindow(b)

      if (aInWindow && !bInWindow) return -1
      if (!aInWindow && bInWindow) return 1

      // Luego por fecha (más recientes primero)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // Filtrar sugerencias de Spotify
  const spotifySuggestions = suggestions.filter(
    (suggestion) => suggestion.spotify_link && !hiddenSuggestions.includes(suggestion.id),
  )

  // Verificar si hay sugerencias antiguas
  const hasOlderSuggestions = suggestions.some((s) => !hiddenSuggestions.includes(s.id) && isOlderThanOneDay(s))

  // Filtrar sugerencias según la pestaña activa y criterios
  const filteredSuggestions = filterSuggestions(sortedSuggestions)

  if (loading) {
    return (
      <div className="flex-1 p-8 pt-6 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando sugerencias...</p>
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
              Error al cargar las sugerencias
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => fetchSuggestions()}>Intentar nuevamente</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sugerencias</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="h-4 w-4" />
                <span className="sr-only">Información</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-md p-4">
              <div className="space-y-2">
                <p className="font-medium">Información sobre las pestañas:</p>
                <div className="space-y-1">
                  <p>
                    <strong>Pendientes:</strong> Muestra las sugerencias entrantes pendientes. Tienen un tiempo porque
                    una vez aceptadas, se destacan durante una hora para facilitar su reproducción.
                  </p>
                  <p>
                    <strong>Aceptadas:</strong> Muestra únicamente las sugerencias que has aceptado para reproducir.
                  </p>
                  <p>
                    <strong>Spotify:</strong> Si el público sugiere un link de Spotify, se muestra en esta pestaña con
                    un reproductor integrado para previsualizar la canción.
                  </p>
                  <p>
                    <strong>Todas:</strong> Se muestran todas las sugerencias, tanto entrantes como aceptadas, para
                    tener una visión completa de las peticiones.
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full max-w-[100%] flex-nowrap overflow-x-auto sm:w-auto">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="accepted">Aceptadas</TabsTrigger>
          <TabsTrigger value="spotify">Spotify</TabsTrigger>
          <TabsTrigger value="all" className="bg-primary text-primary-foreground">
            Todas
          </TabsTrigger>
        </TabsList>

        {/* Pestaña de Pendientes */}
        <TabsContent value="pending" className="mt-4">
          {filteredSuggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias pendientes</CardTitle>
                <CardDescription>
                  Las sugerencias pendientes aparecerán aquí para que puedas revisarlas y decidir si las reproduces
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredSuggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className={
                    suggestion.accepted && isWithinTimeWindow(suggestion) ? "border-2 border-primary bg-accent/30" : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {suggestion.accepted && isWithinTimeWindow(suggestion) && (
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <Clock className="h-4 w-4" />
                            <span>{getRemainingTime(suggestion)}</span>
                          </div>
                        )}
                        <Badge variant="secondary">{getSuggestionType(suggestion)}</Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {formatPhoneNumber(suggestion.clients?.phone || "")} •{" "}
                      {new Date(suggestion.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm break-words">{getSuggestionContent(suggestion)}</div>
                  </CardContent>
                  {!suggestion.accepted && (
                    <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
                      {suggestion.is_expired ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto text-amber-600 border-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30"
                          onClick={() => handleReject(suggestion.id)}
                          disabled={processingRefund === suggestion.id}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          Expirada
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(suggestion.id)}
                            className="w-full sm:w-auto"
                            disabled={processingRefund === suggestion.id}
                          >
                            {processingRefund === suggestion.id ? (
                              <>
                                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <X className="mr-2 h-4 w-4" />
                                Rechazar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(suggestion.id)}
                            className="w-full sm:w-auto"
                            disabled={processingRefund === suggestion.id}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Aceptar
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  )}
                  {refundStatus.suggestionId === suggestion.id && (
                    <div
                      className={`mt-2 p-2 rounded-md text-sm ${
                        refundStatus.status === "success"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                          : refundStatus.status === "error"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                      }`}
                    >
                      {refundStatus.message}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pestaña de Aceptadas */}
        <TabsContent value="accepted" className="mt-4">
          {filteredSuggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias aceptadas</CardTitle>
                <CardDescription>
                  Aquí se mostrarán las sugerencias que hayas aceptado para reproducir durante tu sesión
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredSuggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className={isWithinTimeWindow(suggestion) ? "border-2 border-primary bg-accent/30" : "bg-muted/30"}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {isWithinTimeWindow(suggestion) && (
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <Clock className="h-4 w-4" />
                            <span>{getRemainingTime(suggestion)}</span>
                          </div>
                        )}
                        <Badge variant="secondary">{getSuggestionType(suggestion)}</Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {formatPhoneNumber(suggestion.clients?.phone || "")} •{" "}
                      {new Date(suggestion.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm break-words">{getSuggestionContent(suggestion)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pestaña de Spotify */}
        <TabsContent value="spotify" className="mt-4">
          {spotifySuggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias de Spotify</CardTitle>
                <CardDescription>
                  Aquí se mostrarán las sugerencias con enlaces de Spotify, permitiéndote previsualizar las canciones
                  antes de reproducirlas
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {spotifySuggestions.map((suggestion) => {
                const trackId = getSpotifyTrackId(suggestion.spotify_link)
                return (
                  <Card
                    key={suggestion.id}
                    className={
                      suggestion.accepted && isWithinTimeWindow(suggestion)
                        ? "border-2 border-primary bg-accent/30"
                        : ""
                    }
                  >
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-5 w-5 text-green-500" />
                          <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                          <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                            {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {suggestion.accepted && isWithinTimeWindow(suggestion) && (
                            <div className="flex items-center gap-1 text-sm font-medium text-primary">
                              <Clock className="h-4 w-4" />
                              <span>{getRemainingTime(suggestion)}</span>
                            </div>
                          )}
                          <Badge className="bg-green-600 hover:bg-green-700">Spotify</Badge>
                        </div>
                      </div>
                      <CardDescription>
                        {formatPhoneNumber(suggestion.clients?.phone || "")} •{" "}
                        {new Date(suggestion.created_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm flex items-center break-words">
                        <span className="truncate">{suggestion.spotify_link}</span>
                        <a
                          href={suggestion.spotify_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-green-500 hover:text-green-600 shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>

                      {trackId && (
                        <div className="w-full">
                          <iframe
                            src={`https://open.spotify.com/embed/track/${trackId}`}
                            width="100%"
                            height="80"
                            frameBorder="0"
                            allow="encrypted-media"
                            className="rounded-md"
                          ></iframe>
                        </div>
                      )}
                    </CardContent>
                    {!suggestion.accepted && (
                      <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
                        {suggestion.is_expired ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto text-amber-600 border-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30"
                            onClick={() => handleReject(suggestion.id)}
                            disabled={processingRefund === suggestion.id}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Expirada
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(suggestion.id)}
                              className="w-full sm:w-auto"
                              disabled={processingRefund === suggestion.id}
                            >
                              {processingRefund === suggestion.id ? (
                                <>
                                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  <X className="mr-2 h-4 w-4" />
                                  Rechazar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAccept(suggestion.id)}
                              className="w-full sm:w-auto"
                              disabled={processingRefund === suggestion.id}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Aceptar
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    )}
                    {refundStatus.suggestionId === suggestion.id && (
                      <div
                        className={`mt-2 p-2 rounded-md text-sm ${
                          refundStatus.status === "success"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                            : refundStatus.status === "error"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                        }`}
                      >
                        {refundStatus.message}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Pestaña de Todas */}
        <TabsContent value="all" className="mt-4">
          {filteredSuggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias</CardTitle>
                <CardDescription>
                  Esta vista te permite ver todas tus sugerencias en un solo lugar, tanto pendientes como aceptadas
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredSuggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className={
                    suggestion.accepted && isWithinTimeWindow(suggestion) ? "border-2 border-primary bg-accent/30" : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {suggestion.accepted && isWithinTimeWindow(suggestion) && (
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <Clock className="h-4 w-4" />
                            <span>{getRemainingTime(suggestion)}</span>
                          </div>
                        )}
                        {suggestion.spotify_link ? (
                          <Badge className="bg-green-600 hover:bg-green-700">Spotify</Badge>
                        ) : (
                          <Badge variant="secondary">{getSuggestionType(suggestion)}</Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {formatPhoneNumber(suggestion.clients?.phone || "")} •{" "}
                      {new Date(suggestion.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm break-words">
                      {suggestion.spotify_link ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center">
                            <span className="truncate">{suggestion.spotify_link}</span>
                            <a
                              href={suggestion.spotify_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-green-500 hover:text-green-600 shrink-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-fit text-green-500 border-green-500 hover:bg-green-500/10"
                            onClick={() => setActiveTab("spotify")}
                          >
                            Ver más
                          </Button>
                        </div>
                      ) : (
                        suggestion.message
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
                    {!suggestion.accepted ? (
                      <>
                        {suggestion.is_expired ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto text-amber-600 border-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30"
                            onClick={() => handleReject(suggestion.id)}
                            disabled={processingRefund === suggestion.id}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Expirada
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(suggestion.id)}
                              className="w-full sm:w-auto"
                              disabled={processingRefund === suggestion.id}
                            >
                              {processingRefund === suggestion.id ? (
                                <>
                                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  <X className="mr-2 h-4 w-4" />
                                  Rechazar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAccept(suggestion.id)}
                              className="w-full sm:w-auto"
                              disabled={processingRefund === suggestion.id}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Aceptar
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleHideSuggestion(suggestion.id)}
                        className="ml-auto"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        ¡Listo!
                      </Button>
                    )}
                  </CardFooter>
                  {refundStatus.suggestionId === suggestion.id && (
                    <div
                      className={`mt-2 p-2 rounded-md text-sm ${
                        refundStatus.status === "success"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                          : refundStatus.status === "error"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                      }`}
                    >
                      {refundStatus.message}
                    </div>
                  )}
                </Card>
              ))}

              {/* Botón para mostrar sugerencias antiguas */}
              {activeTab === "all" && hasOlderSuggestions && !showOlderSuggestions && (
                <Button variant="outline" onClick={() => setShowOlderSuggestions(true)} className="mt-2">
                  Mostrar sugerencias anteriores
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmación de reembolso */}
      <Dialog
        open={confirmRefundDialog.open}
        onOpenChange={(open) => setConfirmRefundDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirmar reembolso
            </DialogTitle>
            <DialogDescription>
              Estás a punto de rechazar una sugerencia con un pago aprobado. Esto procesará un reembolso automático al
              cliente.
            </DialogDescription>
          </DialogHeader>

          {confirmRefundDialog.paymentInfo && (
            <div className="py-4">
              <div className="rounded-md bg-muted p-4">
                <h3 className="font-medium mb-2">Detalles del reembolso</h3>
                <div className="flex justify-between text-sm">
                  <span>Monto:</span>
                  <span>{formatCurrency(confirmRefundDialog.paymentInfo.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fecha del pago:</span>
                  <span>{new Date(confirmRefundDialog.paymentInfo.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>ID de referencia:</span>
                  <span className="font-mono text-xs">
                    {confirmRefundDialog.paymentInfo.mercadopago_id.substring(0, 10)}...
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                El reembolso se procesará a través de Mercado Pago y puede tardar hasta 15 días hábiles en reflejarse en
                la cuenta del cliente, dependiendo de su método de pago.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRefundDialog({ open: false, suggestionId: null, paymentInfo: null })}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmRefund}>
              Confirmar reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
