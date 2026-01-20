import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies as nextCookies } from "next/headers";

/**
 * Creates a Supabase server-side client safely (App Router compatible)
 */
export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key is missing in .env.local");
  }

  // Await the cookies() promise
  const cookieStore = await nextCookies();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesArray) => {
          cookiesArray.forEach((c) => cookieStore.set(c.name, c.value, c));
        },
      },
      cookieOptions: {
        name: "sb-auth-token",
        lifetime: 60 * 60 * 24 * 7, // 7 days
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    }
  );

  return supabase;
}
