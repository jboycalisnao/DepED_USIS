-- Align live database constraints with the ID orders status workflow.
-- Apply this migration to Supabase before using the new ID order status values.

alter table if exists merch_orders
  drop constraint if exists merch_orders_order_status_check;

update merch_orders
set order_status = case lower(trim(order_status))
  when 'pending' then 'pending'
  when 'approved' then 'done'
  when 'fulfilled' then 'released'
  when 'rejected' then 'for correction'
  when 'done' then 'done'
  when 'released' then 'released'
  when 'for correction' then 'for correction'
  else 'pending'
end
where order_kind = 'id';

alter table if exists merch_orders
  add constraint merch_orders_order_status_check
  check (
    (order_kind = 'merch' and order_status in ('Pending', 'Approved', 'Rejected', 'Fulfilled'))
    or
    (order_kind = 'id' and order_status in ('pending', 'done', 'released', 'for correction'))
  );

alter table if exists merch_order_status_audit
  drop constraint if exists merch_order_status_audit_to_status_check;

alter table if exists merch_order_status_audit
  add constraint merch_order_status_audit_to_status_check
  check (to_status in ('Pending', 'Approved', 'Rejected', 'Fulfilled', 'pending', 'done', 'released', 'for correction'));
