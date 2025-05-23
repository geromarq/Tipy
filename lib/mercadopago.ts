/**
 * Implementación limpia de la integración con Mercado Pago
 * Esta versión elimina código antiguo y se enfoca en una implementación robusta
 */

/**
 * Crea una preferencia de pago en Mercado Pago
 */
export async function createPaymentPreference(
  title: string,
  price: number,
  quantity = 1,
  externalReference: string,
  successUrl: string,
  failureUrl: string,
  pendingUrl: string,
) {
  try {
    // Verificar que el token de acceso esté disponible
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado")
    }

    // Crear datos de preferencia con formato correcto para Uruguay
    const preferenceData = {
      items: [
        {
          id: externalReference,
          title,
          quantity,
          unit_price: price,
          currency_id: "UYU", // Peso Uruguayo
        },
      ],
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: "approved",
      external_reference: externalReference,
      statement_descriptor: "Tipy App",
      notification_url: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago-webhook`
        : undefined,
      payment_methods: {
        excluded_payment_types: [
          { id: "atm" }, // Excluir pagos en efectivo que no aplican en Uruguay
        ],
        installments: 1, // Sin cuotas por defecto
      },
    }

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

    // Manejar errores de la API
    if (!response.ok) {
      let errorText = ""
      try {
        const errorJson = await response.json()
        errorText = JSON.stringify(errorJson)
      } catch (e) {
        errorText = await response.text()
      }
      throw new Error(`MercadoPago API error: ${response.status} - ${errorText}`)
    }

    // Procesar la respuesta
    const data = await response.json()

    // Verificar que la respuesta contenga los campos necesarios
    if (!data.id || !data.init_point) {
      throw new Error("Respuesta de Mercado Pago incompleta")
    }

    // Asegurarnos de que los IDs de usuario se manejen como strings
    if (data.collector_id) data.collector_id = String(data.collector_id)
    if (data.client_id) data.client_id = String(data.client_id)
    if (data.marketplace_owner) data.marketplace_owner = String(data.marketplace_owner)

    return {
      ...data,
      external_reference: externalReference,
    }
  } catch (error) {
    console.error("Error creating MercadoPago preference:", error)
    throw error
  }
}

/**
 * Obtiene el estado de un pago en Mercado Pago
 */
export async function getPaymentStatus(paymentId: string) {
  try {
    // Verificar que el token de acceso esté disponible
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado")
    }

    // Realizar la solicitud a la API de Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "User-Agent": "Tipy/1.0",
        Accept: "application/json",
      },
    })

    // Manejar errores de la API
    if (!response.ok) {
      let errorText = ""
      try {
        const errorJson = await response.json()
        errorText = JSON.stringify(errorJson)
      } catch (e) {
        errorText = await response.text()
      }
      throw new Error(`Error fetching payment: ${response.status} - ${errorText}`)
    }

    // Procesar la respuesta
    const data = await response.json()

    // Asegurarnos de que los IDs de usuario se manejen como strings
    if (data.user_id) data.user_id = String(data.user_id)
    if (data.payer && data.payer.id) data.payer.id = String(data.payer.id)
    if (data.collector && data.collector.id) data.collector.id = String(data.collector.id)

    return data
  } catch (error) {
    console.error("Error getting MercadoPago payment:", error)
    throw error
  }
}

/**
 * Procesa un reembolso en Mercado Pago
 */
export async function refundPayment(paymentId: string, amount?: number) {
  try {
    // Verificar que el token de acceso esté disponible
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado")
    }

    // Generar una clave de idempotencia única
    const idempotencyKey = `refund_${paymentId}_${Date.now()}`

    // Preparar datos para el reembolso
    const refundData = amount ? { amount } : {}

    // Realizar la solicitud a la API de Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey,
        "User-Agent": "Tipy/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify(refundData),
    })

    // Manejar errores de la API
    if (!response.ok) {
      let errorText = ""
      try {
        const errorJson = await response.json()
        errorText = JSON.stringify(errorJson)
      } catch (e) {
        errorText = await response.text()
      }
      throw new Error(`Error processing refund: ${response.status} - ${errorText}`)
    }

    // Procesar la respuesta
    const data = await response.json()

    // Asegurarnos de que los IDs de usuario se manejen como strings
    if (data.id) data.id = String(data.id)
    if (data.payment_id) data.payment_id = String(data.payment_id)

    return data
  } catch (error) {
    console.error("Error refunding payment:", error)
    throw error
  }
}
