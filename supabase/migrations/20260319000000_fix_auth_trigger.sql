-- Drop the broken trigger that prevents new user signups.
-- The trigger (created by the Supabase Dashboard starter template)
-- tries to insert into public.profiles which doesn't exist in this project.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
