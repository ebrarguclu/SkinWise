-- =====================================================================
-- Migration (Jira DP-14, Sprint 2): a logged-in user may read and change
-- ONLY their own cart lines in cart_items.
--
-- Why: the /cart API runs every query as the logged-in user (req.supabase),
-- so these policies decide what each user can touch. The cart then works with
-- the publishable key as well as the secret key.
--
-- Run ONCE in Supabase > SQL Editor on the existing database.
-- It only adds rules; no table or data is changed or deleted.
-- schema.sql already contains the same policies for a fresh setup.
-- =====================================================================

create policy "Users can read their own cart"
  on public.cart_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add to their own cart"
  on public.cart_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can change their own cart"
  on public.cart_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove from their own cart"
  on public.cart_items for delete to authenticated
  using ((select auth.uid()) = user_id);
