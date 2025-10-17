create or replace function get_organizations_for_user(user_id uuid)
returns table(organization_id uuid, name text) as $$
declare
  user_role text;
begin
  -- First, get the user's role from their app_metadata
  select raw_app_meta_data->>'role' into user_role from auth.users where id = user_id;

  -- Check if the user has the 'Owner' role
  if user_role = 'Owner' then
    -- If the user is an Owner, return all organizations
    return query
    select o.id, o.name from public.organizations o;
  else
    -- Otherwise, return only the organizations the user is a member of
    return query
    select o.id, o.name
    from public.organizations o
    join public.organization_members om on o.id = om.organization_id
    where om.user_id = get_organizations_for_user.user_id;
  end if;
end;
$$ language plpgsql security definer;
