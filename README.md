# College Club Registration Application

A complete, production-ready full-stack application built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

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
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
   > **Important:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It is used in server actions for atomic transactions.

4. **Run Locally**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Deployment to Vercel

1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Go to Vercel and import the repository.
3. In the Vercel project settings, add the three environment variables listed above.
4. Deploy!

## Features
- **Atomic Registration**: Registration is backed by a PL/pgSQL function to prevent race conditions when multiple students try to grab the last seat.
- **Dynamic Capacities**: Capacity checks rely strictly on Department + Club (e.g. ECE + IoT Club). Year is completely ignored for quotas.
- **Japanese Club Handling**: Only Japanese students can see/select the Japanese club.
- **Admin Dashboard**: Real-time capacity matrices, secure authentication, and full CSV export capabilities.
