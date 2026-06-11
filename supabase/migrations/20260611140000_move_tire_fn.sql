-- =====================================================================
-- CRIS · Rodízio de pneus — função atômica move_tire.
-- Move um pneu para outra posição (mesmo veículo ou do conjunto); se a
-- posição destino estiver ocupada, TROCA os dois pneus de lugar.
-- Tudo numa transação: nunca deixa pneu "no limbo" (removido sem destino).
-- Roda com permissões do chamador (RLS de staff vale normalmente).
-- =====================================================================

create or replace function move_tire(
  p_installation_id uuid,
  p_target_vehicle  uuid,
  p_target_axle     smallint,
  p_target_side     text,
  p_target_dual     text,    -- null = posição simples
  p_km              integer  -- hodômetro de referência (opcional)
) returns void language plpgsql as $$
declare
  v_src     tire_installations%rowtype;
  v_dst     tire_installations%rowtype;
  v_has_dst boolean := false;
begin
  select * into v_src
    from tire_installations
   where id = p_installation_id and removed_at is null;
  if not found then
    raise exception 'Instalação de origem não encontrada (pneu já removido?)';
  end if;

  if v_src.vehicle_id = p_target_vehicle
     and v_src.axle_number = p_target_axle
     and v_src.side = p_target_side
     and coalesce(v_src.dual_pos, 'U') = coalesce(p_target_dual, 'U') then
    raise exception 'O pneu já está nessa posição';
  end if;

  select * into v_dst
    from tire_installations
   where vehicle_id = p_target_vehicle
     and axle_number = p_target_axle
     and side = p_target_side
     and coalesce(dual_pos, 'U') = coalesce(p_target_dual, 'U')
     and removed_at is null;
  v_has_dst := found;

  -- Fecha a origem (e o destino, se for troca).
  update tire_installations
     set removed_at = now(), removed_km = p_km
   where id = v_src.id;

  if v_has_dst then
    update tire_installations
       set removed_at = now(), removed_km = p_km
     where id = v_dst.id;
    -- O ocupante do destino assume a posição de origem.
    insert into tire_installations
      (tire_id, vehicle_id, axle_number, side, dual_pos, installed_km, created_by)
    values
      (v_dst.tire_id, v_src.vehicle_id, v_src.axle_number, v_src.side, v_src.dual_pos,
       p_km, auth.uid());
  end if;

  -- O pneu movido assume o destino.
  insert into tire_installations
    (tire_id, vehicle_id, axle_number, side, dual_pos, installed_km, created_by)
  values
    (v_src.tire_id, p_target_vehicle, p_target_axle, p_target_side, p_target_dual,
     p_km, auth.uid());
end $$;
