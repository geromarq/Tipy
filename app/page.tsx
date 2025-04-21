import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Music, DollarSign, QrCode } from "lucide-react"
import Link from "next/link"
import { AnimatedIcon } from "@/components/animated-icon"
import { ContactSection } from "@/components/contact-section"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Conecta con tu público a través de la música
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Tipy permite a los DJs recibir recomendaciones de música y propinas en tiempo real durante sus
                    eventos.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/dj/register">
                    <Button size="lg" className="w-full">
                      Registrarse como DJ
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline" className="w-full">
                      Conoce más
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative w-full max-w-[500px] aspect-square rounded-full bg-gradient-to-tr from-primary to-purple-300 p-1">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AnimatedIcon className="h-32 w-32 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Cómo funciona</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Descubre cómo Tipy mejora la experiencia tanto para DJs como para el público
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              <Card>
                <CardHeader className="pb-2">
                  <Music className="h-12 w-12 text-primary mb-2" />
                  <CardTitle>Recomendaciones de música</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    El público puede enviar recomendaciones de canciones directamente al DJ durante el evento.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <DollarSign className="h-12 w-12 text-primary mb-2" />
                  <CardTitle>Sistema de propinas</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Integración con Mercado Pago para recibir propinas junto con las recomendaciones.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <QrCode className="h-12 w-12 text-primary mb-2" />
                  <CardTitle>Códigos QR únicos</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Genera códigos QR para compartir con tu público y recibir recomendaciones específicas para tu
                    evento.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* DJ Section */}
        <section id="dj-info" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Diseñado para DJs</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Una nueva forma de conectar con tu público y mejorar la experiencia de tus eventos
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Totalmente gratuito</CardTitle>
                  <CardDescription>Sin suscripciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Regístrate y comienza a usar Tipy sin costo alguno</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Genera códigos QR ilimitados para tus eventos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Integración con API de Spotify para reproducir directamente</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Mejora tu experiencia</CardTitle>
                  <CardDescription>Optimiza tu trabajo como DJ</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Recibe sugerencias digitalmente sin interrupciones en tu equipo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Evita que se acerquen con bebidas cerca de tu equipo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Filtra peticiones repetitivas que no van con el ambiente</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Client Section */}
        <section id="client-info" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">¿Eres cliente?</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Sugerir música nunca fue tan fácil
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 mt-8">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-center">
                    <QrCode className="h-16 w-16 text-primary mb-2" />
                  </div>
                  <CardTitle className="text-center">1. Escanea el QR</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground">
                    Escanea el código QR que el DJ comparte en el evento
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-center">
                    <Music className="h-16 w-16 text-primary mb-2" />
                  </div>
                  <CardTitle className="text-center">2. Sugiere tu canción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground">
                    Escribe el nombre de la canción o comparte un enlace de Spotify
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-center">
                    <DollarSign className="h-16 w-16 text-primary mb-2" />
                  </div>
                  <CardTitle className="text-center">3. Paga con Mercado Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground">
                    Realiza el pago de forma rápida y segura, ¡y disfruta de tu canción!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Lo que dicen nuestros DJs
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Descubre cómo Tipy ha transformado la experiencia de DJs en todo el país
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <p className="text-lg italic">
                      "La verdad, no pensé que fuera a funcionar tan bien. Pero me sorprendió. La gente realmente usó el
                      sistema y hasta me mandaban sugerencias constantemente. Me encantó la experiencia, fue algo
                      diferente y muy positivo para las fiestas."
                    </p>
                    <div>
                      <p className="font-semibold">Sebastián</p>
                      <p className="text-sm text-muted-foreground">DJ de eventos privados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <p className="text-lg italic">
                      "Probé la demo en un par de eventos y funcionó bárbaro. La gente se acercaba y lo usaba sin
                      problema. A los grupos grandes les copó, se re enganchaban con mandar temas."
                    </p>
                    <div>
                      <p className="font-semibold">Martina J.</p>
                      <p className="text-sm text-muted-foreground">DJ de eventos privados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <p className="text-lg italic">
                      "Lo que más me gustó fue lo fácil que es de usar. Escaneás el QR, escribís el tema que querés
                      escuchar, pagas con tu cuenta de Mercado Pago y ya está. Además, que se puedan pegar links de
                      Spotify me pareció un golazo."
                    </p>
                    <div>
                      <p className="font-semibold">Alejandro M.</p>
                      <p className="text-sm text-muted-foreground">Usuario Entrevistado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <ContactSection />
      </main>
      <footer className="w-full border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 Tipy. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Política de privacidad
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Términos de servicio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
