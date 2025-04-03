import { NextResponse } from "next/server"
import { createPaymentPreference } from "@/lib/mercadopago"
import { v4 as uuidv4 } from "uuid"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Configurar CORS para permitir solicitudes desde Mercado Pago
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function POST(request: Request) {
  try {
    // Extraer datos de la solicitud
    const { amount, djId, recommendationId, clientName } = await request.json()

    // Validar datos requeridos
    if (!amount || !djId || !recommendationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verificar que el token de Mercado Pago esté configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error("MERCADOPAGO_ACCESS_TOKEN no está configurado")
      return NextResponse.json({ error: "Configuración de pago incompleta" }, { status: 500 })
    }

    // Obtener cliente de Supabase
    const supabase = createServerSupabaseClient()

    // Obtener detalles del DJ
    const { data: djData, error: djError } = await supabase.from("djs").select("*").eq("id", djId).single()

    if (djError || !djData) {
      console.error("Error al obtener detalles del DJ:", djError)
      return NextResponse.json({ error: "DJ not found" }, { status: 404 })
    }

    // Crear referencia externa única
    const externalReference = uuidv4()

    // Obtener URL base de la aplicación
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-tipy-six.vercel.app"

    // Configurar URLs de retorno
    const successUrl = `${appUrl}/tip/success?reference=${externalReference}`
    const failureUrl = `${appUrl}/tip/failure?reference=${externalReference}`
    const pendingUrl = `${appUrl}/tip/pending?reference=${externalReference}`

    try {
      // Crear preferencia de pago en Mercado Pago
      const preference = await createPaymentPreference(
        `Propina para ${djData.display_name}`,
        amount,
        1,
        externalReference,
        successUrl,
        failureUrl,
        pendingUrl,
      )

      // Registrar el pago en la base de datos
      const { error: paymentError } = await supabase.from("payments").insert({
        id: uuidv4(), // Asegurar que tenga un ID único
        dj_id: djId,
        recommendation_id: recommendationId,
        amount,
        mercadopago_id: externalReference,
        status: "pending",
      })

      if (paymentError) {
        console.error("Error al registrar el pago:", paymentError)
        return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 })
      }

      // Verificar la estructura de la respuesta
      if (!preference || !preference.id) {
        throw new Error("Invalid preference response")
      }

      // Devolver la respuesta con los headers CORS adecuados
      return NextResponse.json(
        {
          id: preference.id,
          init_point: preference.init_point,
          sandbox_init_point: preference.sandbox_init_point,
          external_reference: externalReference,
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      )
    } catch (mpError: any) {
      console.error("MercadoPago error:", mpError)
      return NextResponse.json({ error: mpError.message || "MercadoPago error" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: error.message || "Failed to create payment" }, { status: 500 })
  }
}

