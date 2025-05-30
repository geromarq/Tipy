// Implementación mejorada para Mercado Pago con manejo de errores y depuración

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

    // URL base para webhooks - usar siempre el dominio de producción
    const baseUrl = "https://www.tipy.uy"

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
      // Usar siempre la URL de producción para el webhook
      notification_url: `${baseUrl}/api/mercadopago-webhook`,
      // Configuración específica para Uruguay
      payment_methods: {
        excluded_payment_types: [
          { id: "atm" }, // Excluir pagos en efectivo que no aplican en Uruguay
        ],
        installments: 1, // Sin cuotas por defecto
      },
    }

    console.log("Enviando datos a Mercado Pago:", JSON.stringify(preferenceData, null, 2))

    // Realizar la solicitud a la API de Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": externalReference, // Prevenir duplicados
        "User-Agent": "Tipy/1.0", // Identificar la aplicación
        Accept: "application/json",
      },
      body: JSON.stringify(preferenceData),
    })

    // Manejar errores de la API
    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error de Mercado Pago:", errorText)
      throw new Error(`MercadoPago API error: ${response.status} - ${errorText}`)
    }

    // Procesar la respuesta
    const data = await response.json()
    console.log("Respuesta de Mercado Pago:", JSON.stringify(data, null, 2))

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
      external_reference: externalReference, // Asegurar que se devuelva la referencia externa
    }
  } catch (error) {
    console.error("Error creating MercadoPago preference:", error)
    throw error
  }
}

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
        "User-Agent": "Tipy/1.0", // Identificar la aplicación
        Accept: "application/json",
      },
    })

    // Manejar errores de la API
    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error al obtener estado de pago:", errorText)
      throw new Error(`Error fetching payment: ${response.status} - ${errorText}`)
    }

    // Procesar la respuesta
    const data = await response.json()
    console.log("Estado de pago recibido:", JSON.stringify(data, null, 2))

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

// Función corregida para procesar reembolsos con Checkout Pro
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

    console.log(`Solicitando reembolso para pago ${paymentId}${amount ? ` por ${amount}` : " (total)"}`)

    // Realizar la solicitud a la API de Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey, // Prevenir duplicados
        "User-Agent": "Tipy/1.0", // Identificar la aplicación
        Accept: "application/json",
      },
      body: JSON.stringify(refundData),
    })

    // Manejar errores de la API
    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error al procesar reembolso:", errorText)
      throw new Error(`Error processing refund: ${response.status} - ${errorText}`)
    }

    // Procesar la respuesta
    const data = await response.json()
    console.log("Reembolso procesado:", JSON.stringify(data, null, 2))

    // Asegurarnos de que los IDs de usuario se manejen como strings
    if (data.id) data.id = String(data.id)
    if (data.payment_id) data.payment_id = String(data.payment_id)

    return data
  } catch (error) {
    console.error("Error refunding payment:", error)
    throw error
  }
}
