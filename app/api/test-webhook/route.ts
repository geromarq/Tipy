import { NextResponse } from "next/server"

// Endpoint para probar la configuración de webhooks
export async function GET(request: Request) {
  try {
    // Obtener la URL del webhook configurada
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago-webhook`
      : "https://v0-tipy-six.vercel.app/api/mercadopago-webhook"

    // Obtener la clave secreta configurada
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "no-configurada"

    // Crear un objeto de prueba similar a lo que enviaría Mercado Pago
    const testPayload = {
      action: "test.created",
      api_version: "v1",
      data: {
        id: "test_webhook_" + Date.now(),
      },
      date_created: new Date().toISOString(),
      id: 12345,
      live_mode: false,
      type: "test",
    }

    // Enviar una solicitud de prueba al webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify(testPayload),
    })

    // Obtener la respuesta
    const responseData = await response.json()

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      webhook_url: webhookUrl,
      webhook_secret_configured: webhookSecret !== "no-configurada",
      webhook_secret_masked: webhookSecret.substring(0, 3) + "..." + webhookSecret.substring(webhookSecret.length - 3),
      response: responseData,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al probar el webhook",
      },
      { status: 500 },
    )
  }
}
