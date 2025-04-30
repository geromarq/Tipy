-- Crear función para recalcular balances
CREATE OR REPLACE FUNCTION recalculate_dj_balances(dj_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- Si se proporciona un DJ específico
  IF dj_id IS NOT NULL THEN
    -- Actualizar ganancias_totales y balance para el DJ específico
    UPDATE public.djs
    SET ganancias_totales = COALESCE(subquery.total_earnings, 0),
        balance = COALESCE(subquery.total_earnings, 0) - COALESCE(withdrawals.total_withdrawals, 0)
    FROM (
      SELECT dj_id as dj_id_inner, SUM(amount) as total_earnings
      FROM public.payments
      WHERE status = 'approved' AND dj_id = dj_id
      GROUP BY dj_id_inner
    ) as subquery
    LEFT JOIN (
      SELECT dj_id as dj_id_inner, SUM(amount) as total_withdrawals
      FROM public.withdrawals
      WHERE status = 'processed' AND dj_id = dj_id
      GROUP BY dj_id_inner
    ) as withdrawals ON withdrawals.dj_id_inner = subquery.dj_id_inner
    WHERE djs.id = dj_id;
  ELSE
    -- Actualizar ganancias_totales y balance para todos los DJs
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
  END IF;
END;
$$ LANGUAGE plpgsql;
