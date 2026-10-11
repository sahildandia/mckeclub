# College Club Registration Application

A full-stack application built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

## Setup Instructions

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Supabase Setup**:
   - Create a new project on [Supabase](https://supabase.com).
   - Go to the SQL Editor and run the script found in `supabase_schema.sql`.
   - Then run the script found in `supabase_seed.sql` to populate exactly 10 departments, 10 clubs, and the precise matrix of capacities.
   - Set up an admin user in Supabase Auth (Authentication > Users) to log into the Admin Dashboard.

3. **Environment Variables**:
   Create a `.env.local` file in the root of the project with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL=your_postgres_connection_string
   ADMIN_EMAIL=your_admin_email
   ```
   Keep `DATABASE_URL` server-only. Create the admin account in Supabase Authentication, then run `node create_admin.js` to assign its admin role. Sign in again after assigning the role.

   For existing databases, run `node scripts/apply-security.cjs` to apply restricted policies and registration validation.

   Rotate any database password previously committed to source, then update `DATABASE_URL` locally and in deployment settings.

4. **Run Locally**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Deployment to Vercel

1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Go to Vercel and import the repository.
3. In the Vercel project settings, add the environment variables listed above.
4. Deploy!

## Features
- **Atomic Registration**: Registration is backed by a PL/pgSQL function to prevent race conditions when multiple students try to grab the last seat.
- **Dynamic Capacities**: Capacity checks rely strictly on Department + Club (e.g. ECE + IoT Club). Year is completely ignored for quotas.
- **Japanese Club Handling**: Only Japanese students can see/select the Japanese club.
- **Admin Dashboard**: Real-time capacity matrices, secure authentication, and full CSV export capabilities.
