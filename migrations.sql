-- 1. Agregar campos a la tabla DJs
ALTER TABLE public.djs 
ADD COLUMN IF NOT EXISTS ganancias_totales DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- 2. Crear tabla para configuración de tiempo de expiración
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

-- 3. Modificar tabla de recomendaciones
ALTER TABLE public.recommendations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT false;

-- 4. Crear función para actualizar ganancias_totales y balance
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

-- Crear triggers para actualizar ganancias
DROP TRIGGER IF EXISTS trigger_update_dj_earnings ON public.payments;
CREATE TRIGGER trigger_update_dj_earnings
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_dj_earnings();

DROP TRIGGER IF EXISTS trigger_insert_dj_earnings ON public.payments;
CREATE TRIGGER trigger_insert_dj_earnings
AFTER INSERT ON public.payments
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION update_dj_earnings();

-- 5. Crear función para establecer fecha de expiración
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

DROP TRIGGER IF EXISTS trigger_set_recommendation_expiration ON public.recommendations;
CREATE TRIGGER trigger_set_recommendation_expiration
BEFORE INSERT ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION set_recommendation_expiration();

-- 6. Actualizar los balances existentes
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

-- 7. Crear configuraciones de expiración para DJs existentes
INSERT INTO public.suggestion_config (dj_id, expiration_time, auto_reject_expired)
SELECT id, 3600, true
FROM public.djs
WHERE NOT EXISTS (
  SELECT 1 FROM public.suggestion_config WHERE dj_id = djs.id
);
