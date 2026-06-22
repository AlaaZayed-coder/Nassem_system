import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from("erp_items")
    .select("item_code, cost_price_cents, final_selling_price_cents, profit_margin_percent")
    .limit(1);

  if (error) {
    console.error("Fetch Error:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("No items found");
    return;
  }
  
  const item = data[0];
  console.log("Original item:", item);
  
  const { data: updateData, error: updateError } = await supabase
    .from("erp_items")
    .update({ cost_price_cents: 9999 })
    .eq("item_code", item.item_code)
    .select()
    .single();
    
  if (updateError) {
    console.error("Update Error:", updateError);
  } else {
    console.log("Update Success:", updateData.cost_price_cents);
  }
}

test();
