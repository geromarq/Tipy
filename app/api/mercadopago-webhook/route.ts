import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getPaymentStatus } from "@/lib/mercadopago"

// Configurar CORS para permitir solicitudes desde Mercado Pago
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Secret",
    },
  })
}

export async function POST(request: Request) {
  try {
    // Obtener el cuerpo de la solicitud primero para poder loguearlo
    const bodyText = await request.text()
    console.log("Webhook recibido (raw):", bodyText)

    let body
    try {
      body = JSON.parse(bodyText)
      console.log("Webhook recibido (parsed):", JSON.stringify(body, null, 2))
    } catch (e) {
      console.error("Error al parsear el cuerpo de la solicitud:", e)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // Verificar la clave secreta del webhook SOLO si no es una prueba de Mercado Pago
    // Las pruebas de Mercado Pago no incluyen la clave secreta
    const webhookSecret = request.headers.get("x-webhook-secret")
    const isMercadoPagoTest = body && (body.live_mode === false || (body.data && body.data.id === "123456"))

    if (
      !isMercadoPagoTest &&
      process.env.MERCADOPAGO_WEBHOOK_SECRET &&
      webhookSecret !== process.env.MERCADOPAGO_WEBHOOK_SECRET
    ) {
      console.error("Clave secreta de webhook inválida")
      console.error(`Recibida: ${webhookSecret}`)
      console.error(`Esperada: ${process.env.MERCADOPAGO_WEBHOOK_SECRET}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Si es una prueba de Mercado Pago, simplemente responder con éxito
    if (isMercadoPagoTest) {
      console.log("Prueba de webhook de Mercado Pago detectada, respondiendo con éxito")
      return NextResponse.json({
        success: true,
        message: "Webhook test received successfully",
        test: true,
      })
    }

    // Procesar la notificación real
    if (body.type === "payment" && body.data && body.data.id) {
      const paymentId = body.data.id

      // Obtener detalles del pago desde Mercado Pago
      const paymentDetails = await getPaymentStatus(paymentId)

      if (!paymentDetails || !paymentDetails.external_reference) {
        console.error("Información de pago incompleta:", paymentDetails)
        return NextResponse.json({ error: "Información de pago incompleta" }, { status: 400 })
      }

      const externalReference = paymentDetails.external_reference
      const status = paymentDetails.status

      console.log(`Actualizando pago ${externalReference} a estado: ${status}`)

      // Actualizar el estado del pago en la base de datos
      const supabase = createServerSupabaseClient()

      const { error } = await supabase.from("payments").update({ status }).eq("mercadopago_id", externalReference)

      if (error) {
        console.error("Error al actualizar el pago:", error)
        return NextResponse.json({ error: "Error al actualizar el pago" }, { status: 500 })
      }

      console.log(`Pago ${externalReference} actualizado correctamente a estado: ${status}`)
      return NextResponse.json({
        success: true,
        message: "Pago actualizado correctamente",
        payment_id: paymentId,
        external_reference: externalReference,
        status: status,
      })
    }

    // Si no es una notificación de pago, simplemente confirmar recepción
    return NextResponse.json({
      success: true,
      message: "Notificación recibida",
      type: body.type || "unknown",
    })
  } catch (error: any) {
    console.error("Error en webhook de Mercado Pago:", error)
    return NextResponse.json({ error: error.message || "Error en webhook" }, { status: 500 })
  }
}
