-- Fix 42601: record variable cannot be part of multiple-item INTO list (00014 line 177)
-- Run alone if generate_service_invoice failed, then continue 00014 realtime section if needed.

CREATE OR REPLACE FUNCTION public.generate_service_invoice(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  inv_num TEXT;
  sub BIGINT;
  gst BIGINT;
  tot BIGINT;
  inv_id UUID;
  v_svc_name TEXT;
  v_center_name TEXT;
BEGIN
  SELECT bk.* INTO v_booking
  FROM bookings bk
  WHERE bk.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking not found');
  END IF;

  SELECT s.name, sc.name
  INTO v_svc_name, v_center_name
  FROM services s
  JOIN service_centers sc ON sc.id = v_booking.service_center_id
  WHERE s.id = v_booking.service_id;

  IF EXISTS (SELECT 1 FROM service_invoices WHERE booking_id = p_booking_id) THEN
    SELECT invoice_number INTO inv_num FROM service_invoices WHERE booking_id = p_booking_id;
    RETURN jsonb_build_object('ok', true, 'invoice_number', inv_num, 'existing', true);
  END IF;

  tot := COALESCE(v_booking.total_amount, v_booking.payment_amount, 0);
  gst := ROUND(tot * 0.18 / 1.18);
  sub := tot - gst;
  inv_num := public.next_service_invoice_number();

  INSERT INTO service_invoices (
    booking_id, service_center_id, invoice_number, line_items,
    subtotal, gst_amount, grand_total, status, issued_at
  ) VALUES (
    p_booking_id, v_booking.service_center_id, inv_num,
    jsonb_build_array(jsonb_build_object('description', v_svc_name, 'amount', tot)),
    sub, gst, tot, 'issued', NOW()
  )
  RETURNING id INTO inv_id;

  IF v_booking.tracking_step = 'completed' OR v_booking.status = 'completed' THEN
    INSERT INTO vehicle_service_history (
      user_id, booking_id, service_center_id, vehicle_details,
      service_name, center_name, total_amount, completed_at
    ) VALUES (
      v_booking.user_id, p_booking_id, v_booking.service_center_id, v_booking.vehicle_details,
      v_svc_name, v_center_name, tot, COALESCE(v_booking.scheduled_at, NOW())
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'invoice_id', inv_id, 'invoice_number', inv_num);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_service_invoice(UUID) TO authenticated;
