import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return NextResponse.json({
    success: true,
    message: "Endpoint de prueba para webhooks funcionando correctamente",
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  try {
    // Obtener el cuerpo de la solicitud
    const bodyText = await request.text()
    console.log("Solicitud de prueba recibida:", bodyText)

    let body
    try {
      body = JSON.parse(bodyText)
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // Simular procesamiento de webhook
    console.log("Datos de prueba procesados correctamente:", body)

    // Responder con éxito
    return NextResponse.json({
      success: true,
      message: "Webhook de prueba recibido correctamente",
      received_data: body,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error en webhook de prueba:", error)
    return NextResponse.json({ error: error.message || "Error en webhook de prueba" }, { status: 500 })
  }
}
