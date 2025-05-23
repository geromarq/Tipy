/**
 * Implementación mejorada de la integración con Mercado Pago
 * Incluye mejoras para manejar problemas de cookies de terceros
 */

/**
 * Crea una preferencia de pago en Mercado Pago con configuración optimizada
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

    // Crear datos de preferencia con configuración optimizada para evitar problemas de cookies
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
      // Configuraciones adicionales para mejorar la compatibilidad
      expires: false, // No expirar la preferencia automáticamente
      purpose: "wallet_purchase", // Especificar el propósito del pago
      // Configuración para mejorar la experiencia en dispositivos móviles
      shipments: {
        mode: "not_specified",
      },
    }

    console.log("Creando preferencia de pago:", {
      external_reference: externalReference,
      amount: price,
      currency: "UYU",
    })

    // Realizar la solicitud a la API de Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": externalReference,
        "User-Agent": "Tipy/1.0",
        Accept: "application/json",
        // Headers adicionales para mejorar la compatibilidad
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      body: JSON.stringify(preferenceData),
    })

    // Manejar errores de la API
    if (!response.ok) {
      let errorText = ""
      let errorDetails = null

      try {
        errorDetails = await response.json()
        errorText = JSON.stringify(errorDetails)
        console.error("Error de Mercado Pago:", errorDetails)
      } catch (e) {
        errorText = await response.text()
        console.error("Error de Mercado Pago (texto):", errorText)
      }

      // Proporcionar mensajes de error más específicos
      if (response.status === 401) {
        throw new Error("Token de acceso inválido. Verifica las credenciales de Mercado Pago.")
      } else if (response.status === 400) {
        throw new Error(`Datos de pago inválidos: ${errorDetails?.message || errorText}`)
      } else {
        throw new Error(`Error de Mercado Pago (${response.status}): ${errorText}`)
      }
    }

    // Procesar la respuesta
    const data = await response.json()
    console.log("Preferencia creada exitosamente:", {
      id: data.id,
      external_reference: data.external_reference,
    })

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

    console.log("Obteniendo estado del pago:", paymentId)

    // Realizar la solicitud a la API de Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "User-Agent": "Tipy/1.0",
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    })

    // Manejar errores de la API
    if (!response.ok) {
      let errorText = ""
      try {
        const errorJson = await response.json()
        errorText = JSON.stringify(errorJson)
        console.error("Error al obtener estado de pago:", errorJson)
      } catch (e) {
        errorText = await response.text()
        console.error("Error al obtener estado de pago (texto):", errorText)
      }
      throw new Error(`Error fetching payment: ${response.status} - ${errorText}`)
    }

    // Procesar la respuesta
    const data = await response.json()
    console.log("Estado del pago obtenido:", {
      id: data.id,
      status: data.status,
      external_reference: data.external_reference,
    })

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

    console.log("Procesando reembolso:", {
      payment_id: paymentId,
      amount: amount || "total",
    })

    // Realizar la solicitud a la API de Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey,
        "User-Agent": "Tipy/1.0",
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(refundData),
    })

    // Manejar errores de la API
    if (!response.ok) {
      let errorText = ""
      try {
        const errorJson = await response.json()
        errorText = JSON.stringify(errorJson)
        console.error("Error al procesar reembolso:", errorJson)
      } catch (e) {
        errorText = await response.text()
        console.error("Error al procesar reembolso (texto):", errorText)
      }
      throw new Error(`Error processing refund: ${response.status} - ${errorText}`)
    }

    // Procesar la respuesta
    const data = await response.json()
    console.log("Reembolso procesado exitosamente:", {
      id: data.id,
      payment_id: data.payment_id,
      amount: data.amount,
    })

    // Asegurarnos de que los IDs de usuario se manejen como strings
    if (data.id) data.id = String(data.id)
    if (data.payment_id) data.payment_id = String(data.payment_id)

    return data
  } catch (error) {
    console.error("Error refunding payment:", error)
    throw error
  }
}
