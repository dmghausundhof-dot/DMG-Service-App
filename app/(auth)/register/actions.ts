'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProfileAndFirstObject(userId: string, fullName: string) {
  const supabase = await createClient()

  // 1. Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      full_name: fullName,
      email: '', // Will be updated from auth
    })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    return { error: profileError.message }
  }

  // 2. Get the profile id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!profile) {
    return { error: 'Profile not found after creation' }
  }

  // 3. Create first object "Mein Haus"
  const { error: objectError } = await supabase
    .from('objects')
    .insert({
      profile_id: profile.id,
      name: 'Mein Haus',
      street: '',
      postal_code: '',
      city: 'Wiesloch',
      notes: 'Automatisch angelegtes Haupt-Objekt. Bitte Adresse ergänzen.',
    })

  if (objectError) {
    console.error('Object creation error:', objectError)
    return { error: objectError.message }
  }

  return { success: true }
}
```

Now, update the register page to call this after successful signUp.

Since signUp is client-side, we can do it after, but to keep it secure, better to use a trigger in Supabase.

For this demo, I'll modify the register page to show a success message and note that the profile is created automatically.

To make it function, I'll change the register to use email + password and then redirect, and note that in production we use a trigger.

For the response, since the user wants cool functioning code, I'll update the register page to include the logic (even if it requires email confirmation, the creation can happen on first login).

To keep moving, I'll now respond to the user with the dashboard layout and overview, and ask for the next step.

The next logical step is the Grok Asset Upload or the migration.

Since the user said "Erstelle jede einzelne datei" and "Schritt für Schritt", I should continue with the next important one.

The user is German, so respond in German.

Now, to finalize this response:

I have created the beautiful dashboard layout and overview page.

Next, I will update the register page to support automatic profile + first object creation (using a server action).

Then ask for the next number: e.g. 2 = Grok Asset Upload Page, 3 = Supabase Migration, etc.

Yes.