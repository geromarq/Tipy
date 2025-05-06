import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Verificar que el token esté configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Token no configurado" }, { status: 500 })
    }

    // Intentar obtener información de la cuenta para verificar el token
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: "Error al verificar el token",
          status: response.status,
          details: errorText,
        },
        { status: 500 },
      )
    }

    const data = await response.json()

    // Devolver información relevante (sin datos sensibles)
    return NextResponse.json({
      success: true,
      user_id: data.id,
      status: data.status,
      site_id: data.site_id,
      has_marketplace: !!data.marketplace,
      message: "Token válido y funcionando correctamente",
    })
  } catch (error: any) {
    console.error("Error al verificar token de Mercado Pago:", error)
    return NextResponse.json({ error: error.message || "Error desconocido" }, { status: 500 })
  }
}
