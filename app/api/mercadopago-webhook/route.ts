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
    // Obtener el cuerpo de la solicitud
    const bodyText = await request.text()

    let body
    try {
      body = JSON.parse(bodyText)

      // Asegurarnos de que los IDs se manejen como strings
      if (body.user_id) body.user_id = String(body.user_id)
      if (body.data && body.data.id) body.data.id = String(body.data.id)
    } catch (e) {
      console.error("Error al parsear el cuerpo de la solicitud:", e)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // Verificar si es una prueba de Mercado Pago
    const isMercadoPagoTest = body && (body.live_mode === false || (body.data && body.data.id === "123456"))

    // Si es una prueba, responder con éxito
    if (isMercadoPagoTest) {
      return NextResponse.json({
        success: true,
        message: "Webhook test received successfully",
        test: true,
      })
    }

    // Procesar la notificación real
    if (body.type === "payment" && body.data && body.data.id) {
      const paymentId = String(body.data.id)

      // Obtener detalles del pago desde Mercado Pago
      const paymentDetails = await getPaymentStatus(paymentId)

      if (!paymentDetails || !paymentDetails.external_reference) {
        console.error("Información de pago incompleta:", paymentDetails)
        return NextResponse.json({ error: "Información de pago incompleta" }, { status: 400 })
      }

      const externalReference = paymentDetails.external_reference
      const status = paymentDetails.status

      // Guardar la información del webhook
      const supabase = createServerSupabaseClient()

      // Crear la tabla si no existe
      try {
        await supabase.query(`
          CREATE TABLE IF NOT EXISTS public.mercadopago_webhooks (
            id SERIAL PRIMARY KEY,
            payment_id TEXT NOT NULL,
            external_reference TEXT NOT NULL,
            status TEXT NOT NULL,
            webhook_data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `)
      } catch (tableError) {
        console.error("Error al crear tabla:", tableError)
      }

      // Guardar el webhook
      await supabase.from("mercadopago_webhooks").insert({
        payment_id: paymentId,
        external_reference: externalReference,
        status: status,
        webhook_data: body,
      })

      // Actualizar el estado del pago en la base de datos
      const { error } = await supabase
        .from("payments")
        .update({
          status,
          mercadopago_payment_id: paymentId,
        })
        .eq("mercadopago_id", externalReference)

      if (error) {
        console.error("Error al actualizar el pago:", error)
        return NextResponse.json({ error: "Error al actualizar el pago" }, { status: 500 })
      }

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
