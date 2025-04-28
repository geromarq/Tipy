"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export function DatabaseSetup() {
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ step: string; success: boolean; message: string }[]>([])

  const runMigrations = async () => {
    setLoading(true)
    setResults([])

    try {
      // Paso 1: Agregar campos a la tabla DJs
      try {
        await supabase.query(`
          ALTER TABLE public.djs 
          ADD COLUMN IF NOT EXISTS ganancias_totales DECIMAL(10,2) DEFAULT 0 NOT NULL,
          ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0 NOT NULL;
        `)
        setResults((prev) => [
          ...prev,
          {
            step: "Agregar campos a la tabla DJs",
            success: true,
            message: "Campos ganancias_totales y balance agregados correctamente",
          },
        ])
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Agregar campos a la tabla DJs",
            success: false,
            message: error.message || "Error al agregar campos a la tabla DJs",
          },
        ])
      }

      // Paso 2: Crear tabla para configuración de tiempo de expiración
      try {
        await supabase.query(`
          CREATE TABLE IF NOT EXISTS public.suggestion_config (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
            expiration_time INTEGER NOT NULL DEFAULT 3600,
            auto_reject_expired BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(dj_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_suggestion_config_dj_id ON public.suggestion_config(dj_id);
        `)
        setResults((prev) => [
          ...prev,
          {
            step: "Crear tabla suggestion_config",
            success: true,
            message: "Tabla suggestion_config creada correctamente",
          },
        ])
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Crear tabla suggestion_config",
            success: false,
            message: error.message || "Error al crear tabla suggestion_config",
          },
        ])
      }

      // Paso 3: Modificar tabla de recomendaciones
      try {
        await supabase.query(`
          ALTER TABLE public.recommendations
          ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT false;
        `)
        setResults((prev) => [
          ...prev,
          {
            step: "Modificar tabla recommendations",
            success: true,
            message: "Campos expires_at e is_expired agregados correctamente",
          },
        ])
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Modificar tabla recommendations",
            success: false,
            message: error.message || "Error al modificar tabla recommendations",
          },
        ])
      }

      // Paso 4: Crear función y trigger para actualizar ganancias_totales y balance
      try {
        await supabase.query(`
          CREATE OR REPLACE FUNCTION update_dj_earnings()
          RETURNS TRIGGER AS $$
          BEGIN
            -- Si el estado cambia a 'approved'
            IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
              -- Actualizar ganancias_totales y balance
              UPDATE public.djs
              SET ganancias_totales = ganancias_totales + NEW.amount,
                  balance = balance + NEW.amount
              WHERE id = NEW.dj_id;
            
            -- Si el estado cambia de 'approved' a otro estado (reembolso)
            ELSIF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
              -- Restar de ganancias_totales y balance
              UPDATE public.djs
              SET ganancias_totales = GREATEST(0, ganancias_totales - OLD.amount),
                  balance = GREATEST(0, balance - OLD.amount)
              WHERE id = NEW.dj_id;
            END IF;
            
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `)

        // Verificar si el trigger ya existe antes de crearlo
        const { data: triggerExists } = await supabase.query(`
          SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_dj_earnings';
        `)

        if (!triggerExists || triggerExists.length === 0) {
          await supabase.query(`
            DROP TRIGGER IF EXISTS trigger_update_dj_earnings ON public.payments;
            CREATE TRIGGER trigger_update_dj_earnings
            AFTER UPDATE ON public.payments
            FOR EACH ROW
            EXECUTE FUNCTION update_dj_earnings();
          `)
        }

        // Verificar si el trigger ya existe antes de crearlo
        const { data: insertTriggerExists } = await supabase.query(`
          SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_insert_dj_earnings';
        `)

        if (!insertTriggerExists || insertTriggerExists.length === 0) {
          await supabase.query(`
            DROP TRIGGER IF EXISTS trigger_insert_dj_earnings ON public.payments;
            CREATE TRIGGER trigger_insert_dj_earnings
            AFTER INSERT ON public.payments
            FOR EACH ROW
            WHEN (NEW.status = 'approved')
            EXECUTE FUNCTION update_dj_earnings();
          `)
        }

        setResults((prev) => [
          ...prev,
          {
            step: "Crear función y trigger para actualizar ganancias",
            success: true,
            message: "Función y trigger creados correctamente",
          },
        ])
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Crear función y trigger para actualizar ganancias",
            success: false,
            message: error.message || "Error al crear función y trigger",
          },
        ])
      }

      // Paso 5: Crear función para establecer fecha de expiración
      try {
        await supabase.query(`
          CREATE OR REPLACE FUNCTION set_recommendation_expiration()
          RETURNS TRIGGER AS $$
          DECLARE
            config_record RECORD;
          BEGIN
            -- Buscar configuración del DJ
            SELECT * INTO config_record FROM public.suggestion_config 
            WHERE dj_id = NEW.dj_id;
            
            -- Si existe configuración y el tiempo no es 0 (nunca expirar)
            IF FOUND AND config_record.expiration_time > 0 THEN
              -- Establecer fecha de expiración
              NEW.expires_at = NOW() + (config_record.expiration_time || ' seconds')::INTERVAL;
            END IF;
            
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `)

        // Verificar si el trigger ya existe antes de crearlo
        const { data: triggerExists } = await supabase.query(`
          SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_recommendation_expiration';
        `)

        if (!triggerExists || triggerExists.length === 0) {
          await supabase.query(`
            DROP TRIGGER IF EXISTS trigger_set_recommendation_expiration ON public.recommendations;
            CREATE TRIGGER trigger_set_recommendation_expiration
            BEFORE INSERT ON public.recommendations
            FOR EACH ROW
            EXECUTE FUNCTION set_recommendation_expiration();
          `)
        }

        setResults((prev) => [
          ...prev,
          {
            step: "Crear función para establecer fecha de expiración",
            success: true,
            message: "Función y trigger de expiración creados correctamente",
          },
        ])
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Crear función para establecer fecha de expiración",
            success: false,
            message: error.message || "Error al crear función de expiración",
          },
        ])
      }

      // Paso 6: Actualizar los balances existentes
      try {
        await supabase.query(`
          -- Actualizar ganancias_totales y balance para todos los DJs basado en pagos aprobados
          UPDATE public.djs
          SET ganancias_totales = COALESCE(subquery.total_earnings, 0),
              balance = COALESCE(subquery.total_earnings, 0) - COALESCE(withdrawals.total_withdrawals, 0)
          FROM (
            SELECT dj_id, SUM(amount) as total_earnings
            FROM public.payments
            WHERE status = 'approved'
            GROUP BY dj_id
          ) as subquery
          LEFT JOIN (
            SELECT dj_id, SUM(amount) as total_withdrawals
            FROM public.withdrawals
            WHERE status = 'processed'
            GROUP BY dj_id
          ) as withdrawals ON withdrawals.dj_id = subquery.dj_id
          WHERE djs.id = subquery.dj_id;
        `)

        setResults((prev) => [
          ...prev,
          {
            step: "Actualizar balances existentes",
            success: true,
            message: "Balances actualizados correctamente",
          },
        ])
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Actualizar balances existentes",
            success: false,
            message: error.message || "Error al actualizar balances existentes",
          },
        ])
      }

      // Paso 7: Crear configuraciones de expiración para DJs existentes
      try {
        await supabase.query(`
          -- Insertar configuración de expiración para DJs que no la tienen
          INSERT INTO public.suggestion_config (dj_id, expiration_time, auto_reject_expired)
          SELECT id, 3600, true
          FROM public.djs
          WHERE NOT EXISTS (
            SELECT 1 FROM public.suggestion_config WHERE dj_id = djs.id
          );
        `)

        setResults((prev) => [
          ...prev,
          {
            step: "Crear configuraciones de expiración",
            success: true,
            message: "Configuraciones de expiración creadas para DJs existentes",
          },
        ])
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Crear configuraciones de expiración",
            success: false,
            message: error.message || "Error al crear configuraciones de expiración",
          },
        ])
      }
    } catch (error: any) {
      console.error("Error al ejecutar migraciones:", error)
      setResults((prev) => [
        ...prev,
        {
          step: "Error general",
          success: false,
          message: error.message || "Error al ejecutar migraciones",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de la base de datos</CardTitle>
        <CardDescription>
          Ejecuta las migraciones necesarias para actualizar la estructura de la base de datos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Este proceso realizará los siguientes cambios:</p>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Agregar campos ganancias_totales y balance a la tabla DJs</li>
            <li>Crear tabla para configuración de tiempo de expiración</li>
            <li>Modificar tabla de recomendaciones para soportar expiración</li>
            <li>Crear triggers para actualizar automáticamente los balances</li>
            <li>Actualizar los balances existentes</li>
            <li>Crear configuraciones de expiración para DJs existentes</li>
          </ul>

          {results.length > 0 && (
            <div className="mt-6 border rounded-md p-4">
              <h3 className="font-medium mb-2">Resultados:</h3>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{result.step}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={runMigrations} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ejecutando migraciones...
            </>
          ) : (
            "Ejecutar migraciones"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
