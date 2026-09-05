import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)
supabase.from('profiles').select('schedule_data').not('schedule_data', 'is', null).limit(1).then(r => console.log(JSON.stringify(r.data[0].schedule_data, null, 2)))
