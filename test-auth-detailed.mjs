import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')

import { createClient } from '@supabase/supabase-js'

const url = 'https://krcpnzxylqgtjbtyehoa.supabase.co'
const key = 'sb_publishable_oMiPs9YuMW2nJhadWaqZlg_CpnvjPOh'

const supabase = createClient(url, key)

async function debugAuth() {
  console.log('--- ENV CHECK ---')
  console.log('URL:', url)
  console.log('KEY:', key.substring(0, 20) + '... (length: ' + key.length + ')')
  
  const email = `test_${Date.now()}@example.com`
  const password = 'TestPassword123!'

  console.log('\n--- SIGNUP REQUEST ---')
  console.log('Payload:', { email, password: '***' })
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.log('\n--- SUPABASE RESPONSE (ERROR) ---')
    console.log('Error Name:', error.name)
    console.log('Error Message:', error.message)
    console.log('Error Status:', error.status)
    return
  }

  console.log('\n--- SUPABASE RESPONSE (SUCCESS) ---')
  console.log('User ID:', data.user?.id)
  console.log('Session present:', !!data.session)
}

debugAuth()
