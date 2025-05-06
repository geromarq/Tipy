import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function GET() {
  try {
    // Verificar que el token esté configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Token no configurado" }, { status: 500 })
    }

    // Crear una preferencia de prueba simple
    const externalReference = uuidv4()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-tipy-six.vercel.app"

    const preferenceData = {
      items: [
        {
          id: externalReference,
          title: "Prueba de integración",
          quantity: 1,
          unit_price: 10,
          currency_id: "UYU", // Peso Uruguayo
        },
      ],
      back_urls: {
        success: `${appUrl}/tip/success?reference=${externalReference}`,
        failure: `${appUrl}/tip/failure?reference=${externalReference}`,
        pending: `${appUrl}/tip/pending?reference=${externalReference}`,
      },
      auto_return: "approved",
      external_reference: externalReference,
      statement_descriptor: "Tipy App Test",
    }

    console.log("Enviando datos a Mercado Pago:", JSON.stringify(preferenceData, null, 2))

    // Realizar la solicitud a la API de Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": externalReference,
        "User-Agent": "Tipy/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify(preferenceData),
    })

    // Capturar la respuesta completa para diagnóstico
    const responseStatus = response.status
    const responseHeaders = Object.fromEntries(response.headers.entries())
    let responseBody

    try {
      responseBody = await response.json()
    } catch (e) {
      responseBody = await response.text()
    }

    return NextResponse.json({
      success: response.ok,
      request: {
        url: "https://api.mercadopago.com/checkout/preferences",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": externalReference,
          "User-Agent": "Tipy/1.0",
          Accept: "application/json",
          // No mostramos el token por seguridad
          Authorization: "Bearer [REDACTED]",
        },
        body: preferenceData,
      },
      response: {
        status: responseStatus,
        headers: responseHeaders,
        body: responseBody,
      },
    })
  } catch (error: any) {
    console.error("Error al probar Mercado Pago:", error)
    return NextResponse.json({ error: error.message || "Error desconocido" }, { status: 500 })
  }
}
