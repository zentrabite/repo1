-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — SMS Attribution Trigger
-- Run in Supabase SQL Editor.
--
-- When a new order is created, checks if the customer received an SMS
-- in the last 48 hours. If so, marks that SMS as converted.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION attribute_sms_conversion()
RETURNS TRIGGER AS $$
DECLARE
  attribution_window INTERVAL := INTERVAL '48 hours';
BEGIN
  -- Find the most recent SMS sent to this customer within the attribution window
  UPDATE sms_logs
  SET converted = true
  WHERE customer_id = NEW.customer_id
    AND business_id = NEW.business_id
    AND converted   = false
    AND sent_at    >= NOW() - attribution_window
    AND id = (
      SELECT id FROM sms_logs
      WHERE customer_id = NEW.customer_id
        AND business_id = NEW.business_id
        AND converted   = false
        AND sent_at    >= NOW() - attribution_window
      ORDER BY sent_at DESC
      LIMIT 1
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire after every new order
DROP TRIGGER IF EXISTS on_order_created_attribute ON orders;
CREATE TRIGGER on_order_created_attribute
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.customer_id IS NOT NULL)
  EXECUTE FUNCTION attribute_sms_conversion();

-- ─── Also: auto-update customer record when order is inserted ─────────────────
-- Keeps total_orders, total_spent, last_order_date in sync automatically.

CREATE OR REPLACE FUNCTION update_customer_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET
    total_orders    = total_orders + 1,
    total_spent     = total_spent + NEW.total,
    last_order_date = NEW.created_at,
    points_balance  = points_balance + FLOOR(NEW.total * 10),  -- 10 pts per $1
    segment = CASE
      WHEN total_orders + 1 >= 10  THEN 'VIP'
      WHEN total_orders + 1 >= 3   THEN 'Regular'
      ELSE segment
    END
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_update_customer ON orders;
CREATE TRIGGER on_order_update_customer
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.customer_id IS NOT NULL)
  EXECUTE FUNCTION update_customer_on_order();
