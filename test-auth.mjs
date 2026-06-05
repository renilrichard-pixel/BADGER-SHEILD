import { createClient } from '@supabase/supabase-js'

const url = 'https://krcpnzxylqgtjbtyehoa.supabase.co'
const key = 'sb_publishable_oMiPs9YuMW2nJhadWaqZlg_CpnvjPOh'

const supabase = createClient(url, key)

async function testAuth() {
  console.log('Testing Supabase Connection...')
  const email = `test_${Date.now()}@example.com`
  const password = 'TestPassword123!'

  console.log('Attempting signup for:', email)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Signup failed:', error.message)
    return
  }

  console.log('Signup successful:', data.user?.id)
  
  if (data.session) {
    console.log('Session returned on signup (Email confirmation disabled)')
  } else {
    console.log('No session returned on signup (Email confirmation likely ENABLED)')
  }
}

testAuth()
