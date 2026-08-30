create or replace function public.request_sale_cancellation(
  p_sale_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_location_id uuid;
  v_session_id uuid;
  v_approval_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'REASON_REQUIRED';
  end if;

  select sales.location_id, sales.session_id
    into v_location_id, v_session_id
  from sales
  where sales.id = p_sale_id
    and sales.status = 'completed';

  if v_location_id is null then
    raise exception 'SALE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from approvals
    where approvals.entity_type = 'sale'
      and approvals.entity_id = p_sale_id
      and approvals.action_type = 'cancel_sale'
      and approvals.status = 'pending'
  ) then
    raise exception 'ALREADY_REQUESTED';
  end if;

  insert into approvals (
    entity_type,
    entity_id,
    action_type,
    status,
    requested_by,
    requested_at,
    request_reason
  )
  values (
    'sale',
    p_sale_id,
    'cancel_sale',
    'pending',
    v_user_id,
    now(),
    trim(p_reason)
  )
  returning id into v_approval_id;

  insert into audit_logs (
    user_id,
    location_id,
    session_id,
    action,
    entity_type,
    entity_id,
    new_values,
    reason
  )
  values (
    v_user_id,
    v_location_id,
    v_session_id,
    'sale_cancellation_requested',
    'sale',
    p_sale_id,
    jsonb_build_object('approval_id', v_approval_id),
    trim(p_reason)
  );

  return v_approval_id;
end;
$$;

grant execute on function public.request_sale_cancellation(uuid, text) to authenticated;
