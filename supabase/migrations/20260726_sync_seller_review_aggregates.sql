-- Keep the seller profile aggregate aligned with both individual and business reviews.
create or replace function public.refresh_seller_review_aggregate(target_seller_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    rating = aggregates.average_rating,
    review_count = aggregates.review_total
  from (
    select
      coalesce(round(avg(rating)::numeric, 1), 0) as average_rating,
      count(*)::integer as review_total
    from (
      select rating from public.user_reviews where seller_id = target_seller_id
      union all
      select reviews.rating
      from public.business_reviews reviews
      join public.businesses on businesses.id = reviews.business_id
      where businesses.owner_id = target_seller_id
    ) all_reviews
  ) aggregates
  where users.id = target_seller_id;
end;
$$;

create or replace function public.sync_user_review_aggregate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_seller_review_aggregate(case when tg_op = 'DELETE' then old.seller_id else new.seller_id end);
  if tg_op = 'UPDATE' and old.seller_id is distinct from new.seller_id then
    perform public.refresh_seller_review_aggregate(old.seller_id);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_business_review_aggregate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner_id uuid;
  previous_owner_id uuid;
begin
  select owner_id into current_owner_id
  from public.businesses
  where id = case when tg_op = 'DELETE' then old.business_id else new.business_id end;
  perform public.refresh_seller_review_aggregate(current_owner_id);

  if tg_op = 'UPDATE' and old.business_id is distinct from new.business_id then
    select owner_id into previous_owner_id from public.businesses where id = old.business_id;
    perform public.refresh_seller_review_aggregate(previous_owner_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists user_reviews_sync_seller_aggregates on public.user_reviews;
create trigger user_reviews_sync_seller_aggregates
after insert or update or delete on public.user_reviews
for each row execute function public.sync_user_review_aggregate();

drop trigger if exists business_reviews_sync_seller_aggregates on public.business_reviews;
create trigger business_reviews_sync_seller_aggregates
after insert or update or delete on public.business_reviews
for each row execute function public.sync_business_review_aggregate();

-- Repair the profiles created before these triggers existed.
update public.users
set
  rating = coalesce((
    select round(avg(rating)::numeric, 1)
    from (
      select rating from public.user_reviews where seller_id = users.id
      union all
      select reviews.rating
      from public.business_reviews reviews
      join public.businesses on businesses.id = reviews.business_id
      where businesses.owner_id = users.id
    ) all_reviews
  ), 0),
  review_count = (
    select count(*)::integer
    from (
      select rating from public.user_reviews where seller_id = users.id
      union all
      select reviews.rating
      from public.business_reviews reviews
      join public.businesses on businesses.id = reviews.business_id
      where businesses.owner_id = users.id
    ) all_reviews
  )
where coalesce(review_count, 0) > 0
   or exists (select 1 from public.user_reviews where seller_id = users.id)
   or exists (
     select 1 from public.business_reviews reviews
     join public.businesses on businesses.id = reviews.business_id
     where businesses.owner_id = users.id
   );
