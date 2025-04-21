"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AtSign, User, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ContactSection() {
  const handleContactClick = () => {
    window.location.href = "mailto:contactanos@tipy.uy"
  }

  return (
    <section id="contact" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Habla con el equipo</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Estamos aquí para ayudarte y responder a tus preguntas y escuchar tus sugerencias para el programa.
            </p>

            <div className="flex justify-center mt-6">
              <Button size="lg" onClick={handleContactClick} className="gap-2">
                <Mail className="h-5 w-5" />
                Contáctanos
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 mt-12">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Gerónimo Martínez</CardTitle>
              </div>
              <CardDescription>CEO</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm flex items-center">
                <AtSign className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">geronimo.martinez@tipy.uy</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Facundo Nina</CardTitle>
              </div>
              <CardDescription>CFO</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm flex items-center">
                <AtSign className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">facundo.nina@tipy.uy</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Matteo Quagliatta</CardTitle>
              </div>
              <CardDescription>CTO</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm flex items-center">
                <AtSign className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">matteo.quagliatta@tipy.uy</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
