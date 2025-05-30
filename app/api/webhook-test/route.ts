import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Herramienta de prueba de webhooks",
    instructions: "Envía una solicitud POST a esta URL para probar la configuración de webhooks",
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  try {
    // Obtener el cuerpo de la solicitud
    const bodyText = await request.text()

    let body
    try {
      body = JSON.parse(bodyText)
    } catch (e) {
      // Si no es JSON válido, usar el texto como está
      body = { raw_text: bodyText }
    }

    // Registrar la solicitud recibida
    console.log("Solicitud de prueba de webhook recibida:", {
      headers: Object.fromEntries(request.headers),
      body: body,
    })

    // Simular el formato de respuesta de Mercado Pago
    return NextResponse.json({
      success: true,
      message: "Webhook recibido correctamente",
      received_data: body,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error en la prueba de webhook:", error)
    return NextResponse.json({ error: error.message || "Error en la prueba" }, { status: 500 })
  }
}
