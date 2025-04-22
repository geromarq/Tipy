import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Crear procedimiento almacenado para crear la tabla de webhooks si no existe
    const { error: procedureError } = await supabase.query(`
      CREATE OR REPLACE FUNCTION create_mercadopago_webhooks_if_not_exists()
      RETURNS void AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'mercadopago_webhooks'
        ) THEN
          CREATE TABLE public.mercadopago_webhooks (
            id SERIAL PRIMARY KEY,
            payment_id TEXT NOT NULL,
            external_reference TEXT NOT NULL,
            status TEXT NOT NULL,
            webhook_data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `)

    if (procedureError) {
      console.error("Error al crear procedimiento:", procedureError)
      return NextResponse.json({ error: "Error al crear procedimiento" }, { status: 500 })
    }

    // Modificar la tabla de pagos para agregar el campo mercadopago_payment_id si no existe
    const { error: alterTableError } = await supabase.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'payments' 
          AND column_name = 'mercadopago_payment_id'
        ) THEN
          ALTER TABLE public.payments ADD COLUMN mercadopago_payment_id TEXT;
        END IF;
      END $$;
    `)

    if (alterTableError) {
      console.error("Error al modificar tabla de pagos:", alterTableError)
      return NextResponse.json({ error: "Error al modificar tabla de pagos" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Base de datos configurada correctamente",
    })
  } catch (error: any) {
    console.error("Error al configurar la base de datos:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
