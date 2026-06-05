import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  try {
    const supabase = await createClient()
    
    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent_test_user@example.com',
      password: 'WrongPassword123!',
    })

    return NextResponse.json({
      env: {
        url: url || 'MISSING',
        keyLength: key ? key.length : 0,
        keyStart: key ? key.substring(0, 10) : 'MISSING',
      },
      loginResponse: {
        data: data ? { user: data.user?.id, session: !!data.session } : null,
        error: error ? { name: error.name, message: error.message, status: error.status } : null
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack })
  }
}
