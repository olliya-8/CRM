import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// ⚠️ Use Service Role Key (never expose this to client)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { currentEmail, currentPassword, newName, newEmail, newPassword } = body

    // 1️⃣ Sign in user with current credentials
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    })

    if (signInError || !signInData?.user) {
      return NextResponse.json({ error: "Current credentials do not match" }, { status: 400 })
    }

    const userId = signInData.user.id

    // 2️⃣ Delete existing account
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

    // 3️⃣ Create new account
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: { data: { name: newName } },
    })

    if (signUpError) return NextResponse.json({ error: signUpError.message }, { status: 400 })

    return NextResponse.json({ message: "Account recreated successfully! Please verify your new email." })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || "Failed to recreate account" }, { status: 500 })
  }
}
