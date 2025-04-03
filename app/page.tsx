import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Music, Headphones, DollarSign, QrCode } from "lucide-react"
import Link from "next/link"

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
                    <Headphones className="h-32 w-32 text-white" />
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
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Características principales
                </h2>
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

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Planes simples y transparentes
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Elige el plan que mejor se adapte a tus necesidades
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 mt-8">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Plan Básico</CardTitle>
                  <CardDescription>Para DJs que están comenzando</CardDescription>
                  <div className="mt-4 text-4xl font-bold">Gratis</div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="grid gap-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Recibe recomendaciones de música</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Genera códigos QR</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>25% de comisión en propinas</span>
                    </li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Link href="/dj/register">
                    <Button className="w-full">Comenzar gratis</Button>
                  </Link>
                </div>
              </Card>
              <Card className="flex flex-col border-primary">
                <CardHeader>
                  <CardTitle>Plan Pro</CardTitle>
                  <CardDescription>Para DJs profesionales</CardDescription>
                  <div className="mt-4 text-4xl font-bold">$1,500/mes</div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="grid gap-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Todo lo del plan básico</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>15% de comisión en propinas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Análisis detallado de recomendaciones</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Soporte prioritario</span>
                    </li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Link href="/dj/register?plan=pro">
                    <Button className="w-full">Comenzar prueba gratuita</Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
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
                      "Tipy ha revolucionado la forma en que interactúo con mi público. Ahora recibo recomendaciones
                      relevantes y propinas en tiempo real."
                    </p>
                    <div>
                      <p className="font-semibold">DJ Martín</p>
                      <p className="text-sm text-muted-foreground">Buenos Aires</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <p className="text-lg italic">
                      "La integración con Mercado Pago es perfecta. Mis ingresos han aumentado significativamente desde
                      que empecé a usar Tipy."
                    </p>
                    <div>
                      <p className="font-semibold">DJ Laura</p>
                      <p className="text-sm text-muted-foreground">Córdoba</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <p className="text-lg italic">
                      "Los códigos QR son geniales para eventos específicos. Puedo activarlos y desactivarlos según mis
                      necesidades."
                    </p>
                    <div>
                      <p className="font-semibold">DJ Carlos</p>
                      <p className="text-sm text-muted-foreground">Rosario</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
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

