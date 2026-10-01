-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR AURA TASKFLOW
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Create custom users table (or use Supabase built-in auth)
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  otp_code text,
  otp_expires_at timestamptz,
  is_verified boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Create tasks table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  completed boolean default false not null,
  deadline timestamptz,
  notified boolean default false not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Create indexes for high-speed queries
create index if not exists idx_tasks_user_id on public.tasks (user_id);
create index if not exists idx_tasks_deadline on public.tasks (deadline);
create index if not exists idx_tasks_completed on public.tasks (completed);

-- 4. Automatically update 'updated_at' column on update
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.handle_updated_at();

-- 5. Enable Row Level Security (RLS) - Recommended for security
alter table public.users enable row level security;
alter table public.tasks enable row level security;

-- Policy to allow backend service role full access
create policy "Allow service role full access on users"
on public.users for all
using (true)
with check (true);

create policy "Allow service role full access on tasks"
on public.tasks for all
using (true)
with check (true);
