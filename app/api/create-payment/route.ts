import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createPaymentPreference } from "@/lib/mercadopago"
import { nanoid } from "nanoid"

export async function POST(request: Request) {
  try {
    const { amount, djId, recommendationId, clientName } = await request.json()

    if (!amount || !djId || !recommendationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerComponentClient({ cookies })

    // Get DJ details
    const { data: djData, error: djError } = await supabase.from("djs").select("*").eq("id", djId).single()

    if (djError || !djData) {
      return NextResponse.json({ error: "DJ not found" }, { status: 404 })
    }

    // Create external reference
    const externalReference = nanoid()

    // Get the app URL from environment variable or construct it
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-tipy-six.vercel.app"

    // Create payment preference
    const title = `Propina para ${djData.display_name}`
    const successUrl = `${appUrl}/tip/success?reference=${externalReference}`
    const failureUrl = `${appUrl}/tip/failure?reference=${externalReference}`
    const pendingUrl = `${appUrl}/tip/pending?reference=${externalReference}`

    const preference = await createPaymentPreference(
      title,
      amount,
      1,
      externalReference,
      successUrl,
      failureUrl,
      pendingUrl,
    )

    // Create payment record
    await supabase.from("payments").insert({
      dj_id: djId,
      recommendation_id: recommendationId,
      amount,
      mercadopago_id: externalReference,
      status: "pending",
    })

    return NextResponse.json(preference)
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
  }
}

