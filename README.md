# React + Vite

This project is a Vite-powered React SPA that delivers a guided recipe experience, user authentication flows, and a lightweight content studio for managing homepage copy without redeploying.

## Step-by-step guide

1. **Install dependencies**  
   ```bash
   cd "C:\_my-projects\The Aroma\The Aroma"
   npm install
   ```

2. **Start the dev server with hot reload**  
   ```bash
   npm run dev -- --host
   ```
   Visit `http://localhost:5173` (or the printed dev URL) to explore the dashboard, planner, and recipe flows.

3. **Preview or build for production**  
   ```bash
   npm run build
   npm run preview
   ```
   Use the preview command to verify the production bundle locally before deploying.

4. **Work with environment secrets**  
   Copy `.env.example` to `.env` if needed, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so Supabase-powered features (recipe saving, user management) activate.

5. **Launch the Content Studio (CMS)**  
   Navigate to `http://localhost:5173/cms` to open the Content Studio page, where you can add/edit hero sections, announcements, and other evergreen copy. Entries are persisted locally via `localStorage` for quick prototyping.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
