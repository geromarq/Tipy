import { MercadoPagoConfig, Payment, Preference } from "mercadopago"

// Initialize the MercadoPago client
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function createPaymentPreference(
  title: string,
  price: number,
  quantity = 1,
  externalReference: string,
  successUrl: string,
  failureUrl: string,
  pendingUrl: string,
) {
  const preference = new Preference(mercadopago)

  const preferenceData = {
    items: [
      {
        id: externalReference,
        title,
        quantity,
        unit_price: price,
        currency_id: "ARS",
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
  }

  try {
    const result = await preference.create({ body: preferenceData })
    return result
  } catch (error) {
    console.error("Error creating MercadoPago preference:", error)
    throw error
  }
}

export async function getPaymentById(paymentId: string) {
  const payment = new Payment(mercadopago)

  try {
    const result = await payment.get({ id: paymentId })
    return result
  } catch (error) {
    console.error("Error getting MercadoPago payment:", error)
    throw error
  }
}

