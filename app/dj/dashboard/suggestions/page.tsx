"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatPhoneNumber } from "@/lib/utils"
import { Check, X, Music, LinkIcon, Star, ExternalLink, AlertCircle, Info, Clock } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function SuggestionsPage() {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("pending")
  const [acceptedTimes, setAcceptedTimes] = useState<{ [key: string]: Date }>({})
  const [now, setNow] = useState(new Date())

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

      setSuggestions(paidSuggestions)

      // Inicializar los tiempos de aceptación para las sugerencias recién aceptadas
      const newAcceptedTimes = { ...acceptedTimes }
      paidSuggestions.forEach((suggestion) => {
        if (suggestion.accepted && !acceptedTimes[suggestion.id]) {
          newAcceptedTimes[suggestion.id] = new Date()
        }
      })
      setAcceptedTimes(newAcceptedTimes)
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

      // Registrar el tiempo de aceptación
      setAcceptedTimes((prev) => ({
        ...prev,
        [id]: new Date(),
      }))

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
      console.error("Error al rechazar la sugerencia:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo rechazar la sugerencia",
        variant: "destructive",
      })
    }
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

  const getSuggestionContent = (suggestion: any) => {
    if (suggestion.spotify_link) {
      return (
        <div className="flex items-center">
          <span className="truncate">{suggestion.spotify_link}</span>
          <a
            href={suggestion.spotify_link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-primary hover:text-primary/80"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )
    } else {
      return suggestion.message
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

  // Calcular el tiempo restante para una sugerencia aceptada (en minutos y segundos)
  const getRemainingTime = (suggestionId: string) => {
    if (!acceptedTimes[suggestionId]) return null

    const acceptedTime = acceptedTimes[suggestionId]
    const oneHourLater = new Date(acceptedTime)
    oneHourLater.setHours(oneHourLater.getHours() + 1)

    const diffMs = oneHourLater.getTime() - now.getTime()
    if (diffMs <= 0) return null

    const minutes = Math.floor(diffMs / 60000)
    const seconds = Math.floor((diffMs % 60000) / 1000)

    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Verificar si una sugerencia está dentro de la ventana de 1 hora
  const isWithinTimeWindow = (suggestionId: string) => {
    if (!acceptedTimes[suggestionId]) return false

    const acceptedTime = acceptedTimes[suggestionId]
    const oneHourLater = new Date(acceptedTime)
    oneHourLater.setHours(oneHourLater.getHours() + 1)

    return now < oneHourLater
  }

  // Ordenar sugerencias para mostrar primero las aceptadas dentro de la ventana de tiempo
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const aInWindow = a.accepted && isWithinTimeWindow(a.id)
    const bInWindow = b.accepted && isWithinTimeWindow(b.id)

    if (aInWindow && !bInWindow) return -1
    if (!aInWindow && bInWindow) return 1

    // Si ambas están en la ventana o ambas no lo están, ordenar por fecha
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Filtrar sugerencias de Spotify
  const spotifySuggestions = suggestions.filter((suggestion) => suggestion.spotify_link)

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
            <TooltipContent>
              <p className="max-w-xs">
                Las sugerencias aceptadas aparecen destacadas durante 1 hora. Después, se muestran en la pestaña
                "Aceptadas".
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="accepted">Aceptadas</TabsTrigger>
          <TabsTrigger value="spotify">Spotify</TabsTrigger>
          <TabsTrigger value="all" className="bg-primary text-primary-foreground">
            Todas
          </TabsTrigger>
        </TabsList>

        {/* Pestaña de Pendientes */}
        <TabsContent value="pending" className="mt-4">
          {sortedSuggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias pendientes</CardTitle>
                <CardDescription>Las sugerencias pendientes aparecerán aquí</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sortedSuggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className={
                    suggestion.accepted && isWithinTimeWindow(suggestion.id)
                      ? "border-2 border-primary bg-accent/30"
                      : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {suggestion.accepted && isWithinTimeWindow(suggestion.id) && (
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <Clock className="h-4 w-4" />
                            <span>{getRemainingTime(suggestion.id)}</span>
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
                    <div className="text-sm">{getSuggestionContent(suggestion)}</div>
                  </CardContent>
                  {!suggestion.accepted && (
                    <CardFooter className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleReject(suggestion.id)}>
                        <X className="mr-2 h-4 w-4" />
                        Rechazar
                      </Button>
                      <Button size="sm" onClick={() => handleAccept(suggestion.id)}>
                        <Check className="mr-2 h-4 w-4" />
                        Aceptar
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pestaña de Aceptadas */}
        <TabsContent value="accepted" className="mt-4">
          {sortedSuggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias aceptadas</CardTitle>
                <CardDescription>Las sugerencias aceptadas aparecerán aquí</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sortedSuggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className={
                    suggestion.accepted && isWithinTimeWindow(suggestion.id)
                      ? "border-2 border-primary bg-accent/30"
                      : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {suggestion.accepted && isWithinTimeWindow(suggestion.id) && (
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <Clock className="h-4 w-4" />
                            <span>{getRemainingTime(suggestion.id)}</span>
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
                    <div className="text-sm">{getSuggestionContent(suggestion)}</div>
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
                <CardDescription>Las sugerencias con enlaces de Spotify aparecerán aquí</CardDescription>
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
                      suggestion.accepted && isWithinTimeWindow(suggestion.id)
                        ? "border-2 border-primary bg-accent/30"
                        : ""
                    }
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-5 w-5 text-green-500" />
                          <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                          <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                            {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {suggestion.accepted && isWithinTimeWindow(suggestion.id) && (
                            <div className="flex items-center gap-1 text-sm font-medium text-primary">
                              <Clock className="h-4 w-4" />
                              <span>{getRemainingTime(suggestion.id)}</span>
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
                      <div className="text-sm flex items-center">
                        <span className="truncate">{suggestion.spotify_link}</span>
                        <a
                          href={suggestion.spotify_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-green-500 hover:text-green-600"
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
                      <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleReject(suggestion.id)}>
                          <X className="mr-2 h-4 w-4" />
                          Rechazar
                        </Button>
                        <Button size="sm" onClick={() => handleAccept(suggestion.id)}>
                          <Check className="mr-2 h-4 w-4" />
                          Aceptar
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Pestaña de Todas */}
        <TabsContent value="all" className="mt-4">
          {sortedSuggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias</CardTitle>
                <CardDescription>Las sugerencias aparecerán aquí</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sortedSuggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className={
                    suggestion.accepted && isWithinTimeWindow(suggestion.id)
                      ? "border-2 border-primary bg-accent/30"
                      : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {suggestion.accepted && isWithinTimeWindow(suggestion.id) && (
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <Clock className="h-4 w-4" />
                            <span>{getRemainingTime(suggestion.id)}</span>
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
                    <div className="text-sm">
                      {suggestion.spotify_link ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center">
                            <span className="truncate">{suggestion.spotify_link}</span>
                            <a
                              href={suggestion.spotify_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-green-500 hover:text-green-600"
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
                  {!suggestion.accepted && (
                    <CardFooter className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleReject(suggestion.id)}>
                        <X className="mr-2 h-4 w-4" />
                        Rechazar
                      </Button>
                      <Button size="sm" onClick={() => handleAccept(suggestion.id)}>
                        <Check className="mr-2 h-4 w-4" />
                        Aceptar
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

