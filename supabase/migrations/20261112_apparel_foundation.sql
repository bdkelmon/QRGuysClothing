-- New, empty QR Guys Supabase project only. Review and test before enabling services.
begin;
create schema qrg_private;
revoke all on schema qrg_private from public, anon, authenticated;

create table public.links (
 id uuid primary key default gen_random_uuid(),
 link_id text unique not null default gen_random_uuid()::text,
 user_id uuid references auth.users(id),
 is_apparel boolean not null default true,
 is_public boolean not null default false,
 content_type text not null default 'url' check (content_type in ('url','text')),
 url text check (url is null or url ~ '^https://'),
 text_content text check (length(text_content) <= 20000),
 image_url_override text check (image_url_override is null),
 video_uri text check (video_uri is null),
 qr_image_url text,
 text_font text, text_color text, text_size text,
 settings jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table qrg_private.entitlements (
 link_id text primary key references public.links(link_id),
 activation_hash bytea unique not null,
 payment_status text not null default 'pending' check (payment_status in ('pending','paid','refunded')),
 fulfillment_key text unique not null,
 claimed_at timestamptz
);
create table public.profiles (
 id uuid primary key references auth.users(id),
 username text, avatar_url text
);
create table public.apparel_content_history (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 client_id text not null,
 link_id text not null references public.links(link_id),
 content_type text not null,
 details jsonb not null,
 created_at timestamptz not null default now(),
 unique(user_id,client_id)
);
alter table public.links enable row level security;
alter table public.profiles enable row level security;
alter table public.apparel_content_history enable row level security;
revoke all on public.links, public.profiles, public.apparel_content_history from anon, authenticated;
grant select on public.links, public.profiles, public.apparel_content_history to authenticated;
grant update (is_public,content_type,url,text_content,image_url_override,video_uri,text_font,text_color,text_size,settings) on public.links to authenticated;
grant insert on public.apparel_content_history to authenticated;
create policy owner_read on public.links for select to authenticated using (user_id = auth.uid());
create policy owner_edit on public.links for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profile_read on public.profiles for select to authenticated using (id = auth.uid());
create policy history_read on public.apparel_content_history for select to authenticated using (user_id = auth.uid());
create policy history_insert on public.apparel_content_history for insert to authenticated with check (
 user_id = auth.uid() and exists(select 1 from public.links l where l.link_id = apparel_content_history.link_id and l.user_id = auth.uid())
);

create function public.qrg_claim_apparel(p_activation_code text, p_user_id uuid)
returns table(link_id text) language plpgsql security definer set search_path = '' as $$
declare candidate text;
begin
 select e.link_id into candidate from qrg_private.entitlements e
 where e.activation_hash = pg_catalog.sha256(pg_catalog.convert_to(p_activation_code,'UTF8'))
 and e.payment_status = 'paid' for update;
 if candidate is null then return; end if;
 return query update public.links l set user_id = p_user_id
 where l.link_id = candidate and (l.user_id is null or l.user_id = p_user_id)
 returning l.link_id;
 if found then update qrg_private.entitlements e set claimed_at = coalesce(e.claimed_at,now()) where e.link_id = candidate; end if;
end;
$$;
create function public.qrg_resolve_apparel(p_link_id text)
returns table(content_type text,text_content text,url text,text_font text,text_color text,text_size text,settings jsonb)
language sql stable security definer set search_path = '' as $$
 select l.content_type,l.text_content,l.url,l.text_font,l.text_color,l.text_size,l.settings
 from public.links l join qrg_private.entitlements e on e.link_id=l.link_id
 where l.link_id=p_link_id and l.is_public and l.user_id is not null and e.payment_status='paid';
$$;
revoke all on function public.qrg_claim_apparel(text,uuid) from public,anon,authenticated;
revoke all on function public.qrg_resolve_apparel(text) from public,anon,authenticated;
grant execute on function public.qrg_claim_apparel(text,uuid), public.qrg_resolve_apparel(text) to service_role;
commit;
