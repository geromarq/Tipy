import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"
import { cache } from "react"

export const createServerSupabaseClient = cache(() => {
  const cookieStore = cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
})

export async function getSession() {
  const supabase = createServerSupabaseClient()
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

export async function getUserDetails() {
  const supabase = createServerSupabaseClient()
  const session = await getSession()

  if (!session) {
    return null
  }

  try {
    const { data, error } = await supabase.from("djs").select("*").eq("id", session.user.id).single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error("Error getting user details:", error)
    return null
  }
}

