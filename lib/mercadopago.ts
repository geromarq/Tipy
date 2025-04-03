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
      // Agregar notificación webhook para mayor seguridad
      notification_url: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago-webhook`
        : undefined,
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
    return data
  } catch (error) {
    console.error("Error getting MercadoPago payment:", error)
    throw error
  }
}

