import { createSupabaseServerClient } from "@/lib/supabase/server";


export default async function TestDatabase() {
  const supabase = await createSupabaseServerClient();


  const { data: employees, error } = await supabase
    .from("employees")
    .select("*");


  if (error) return <pre>{error.message}</pre>;


  return <pre>{JSON.stringify(employees, null, 2)}</pre>;
}