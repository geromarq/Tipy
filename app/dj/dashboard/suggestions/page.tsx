"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatPhoneNumber } from "@/lib/utils"
import { Check, X, Music, LinkIcon, Star, ExternalLink, AlertCircle } from "lucide-react"

export default function SuggestionsPage() {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("pending")

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
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setSuggestions(data || [])
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

  const hasPaid = (suggestion: any) => {
    return suggestion.payments && suggestion.payments.some((payment: any) => payment.status === "approved")
  }

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
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="accepted">Aceptadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias pendientes</CardTitle>
                <CardDescription>Las sugerencias pendientes aparecerán aquí</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <Badge variant="secondary">{getSuggestionType(suggestion)}</Badge>
                    </div>
                    <CardDescription>
                      {formatPhoneNumber(suggestion.clients?.phone || "")} •{" "}
                      {new Date(suggestion.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">{getSuggestionContent(suggestion)}</div>
                  </CardContent>
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
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="accepted" className="mt-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias aceptadas</CardTitle>
                <CardDescription>Las sugerencias aceptadas aparecerán aquí</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <Badge variant="secondary">{getSuggestionType(suggestion)}</Badge>
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
        <TabsContent value="all" className="mt-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay sugerencias</CardTitle>
                <CardDescription>Las sugerencias aparecerán aquí</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion)}
                        <CardTitle className="text-lg">{suggestion.clients?.name || "Cliente"}</CardTitle>
                        <Badge variant={hasPaid(suggestion) ? "default" : "outline"}>
                          {hasPaid(suggestion) ? "Pagado" : "Sin pago"}
                        </Badge>
                      </div>
                      <Badge variant="secondary">{getSuggestionType(suggestion)}</Badge>
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
      </Tabs>
    </div>
  )
}

