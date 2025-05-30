import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Verificar que el token de Mercado Pago esté configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          error: "MERCADOPAGO_ACCESS_TOKEN no está configurado",
          status: "error",
        },
        { status: 500 },
      )
    }

    // Verificar que la URL de la aplicación esté configurada
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "No configurado"

    // Realizar una solicitud simple a la API de Mercado Pago para verificar el token
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: `Error al verificar el token: ${response.status} - ${errorText}`,
          status: "error",
        },
        { status: 500 },
      )
    }

    const userData = await response.json()

    return NextResponse.json({
      message: "Configuración de Mercado Pago verificada correctamente",
      status: "success",
      appUrl,
      userData: {
        id: userData.id,
        nickname: userData.nickname,
        email: userData.email,
        site_status: userData.site_status,
        country_id: userData.country_id,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Error al verificar la configuración de Mercado Pago",
        status: "error",
      },
      { status: 500 },
    )
  }
}
