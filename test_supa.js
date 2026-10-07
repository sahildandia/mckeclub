const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kwzuhysldgendoswrfzd.supabase.co', 'sb_publishable_kavNu8Y16FY_o80OExqwow_RijEWrNp');
async function test() {
  const { data, error } = await supabase.from('registrations').select('*');
  console.log('Data:', data?.length);
  console.log('Error:', error);
}
test();
