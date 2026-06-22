import fs from "fs";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Reading CSV...");
  const records = [];
  
  const parser = fs
    .createReadStream("data/تصنيف_اصناف_النسيم.csv")
    .pipe(parse({ delimiter: ";", from_line: 2 }));
    
  for await (const record of parser) {
    const [mainCategory, subCategory, code, name] = record;
    if (!mainCategory || mainCategory === "أصناف غير واضحة / تحتاج تنظيف") continue;
    records.push({ mainCategory, subCategory, code, name });
  }

  console.log(`Found ${records.length} clean records to import.`);
  
  // 1. Get or Create Categories
  const categoriesMap = new Map();
  const subCategoriesMap = new Map();

  for (const r of records) {
    // Main Category
    if (!categoriesMap.has(r.mainCategory)) {
      const { data, error } = await supabase
        .from("erp_categories")
        .select("id")
        .eq("name", r.mainCategory)
        .is("parent_id", null)
        .maybeSingle();

      if (data) {
        categoriesMap.set(r.mainCategory, data.id);
      } else {
        console.log(`Creating Main Category: ${r.mainCategory}`);
        const { data: newCat, error: err } = await supabase
          .from("erp_categories")
          .insert({ name: r.mainCategory, type: "منتجات" })
          .select("id")
          .single();
        if (err) {
          console.error("Error inserting main category:", err);
          process.exit(1);
        }
        categoriesMap.set(r.mainCategory, newCat.id);
      }
    }

    const mainId = categoriesMap.get(r.mainCategory);

    // Sub Category
    const subKey = `${r.mainCategory}-${r.subCategory}`;
    if (!subCategoriesMap.has(subKey)) {
      const { data, error } = await supabase
        .from("erp_categories")
        .select("id")
        .eq("name", r.subCategory)
        .eq("parent_id", mainId)
        .maybeSingle();

      if (data) {
        subCategoriesMap.set(subKey, data.id);
      } else {
        console.log(`Creating Sub Category: ${r.subCategory}`);
        const { data: newSubCat, error: err2 } = await supabase
          .from("erp_categories")
          .insert({ name: r.subCategory, type: "منتجات", parent_id: mainId })
          .select("id")
          .single();
        if (err2) {
            console.error("Error inserting sub category:", err2);
            process.exit(1);
        }
        subCategoriesMap.set(subKey, newSubCat.id);
      }
    }
  }

  // 2. Prepare Items
  const itemsToInsert = records.map(r => {
    const mainId = categoriesMap.get(r.mainCategory);
    const subKey = `${r.mainCategory}-${r.subCategory}`;
    const subId = subCategoriesMap.get(subKey);
    return {
      main_category_id: mainId,
      sub_category_id: subId,
      item_code: r.code,
      original_name: r.name,
      approved_name: r.name,
      pricing_status: "غير مسعّر",
      cost_price_cents: 0,
      final_selling_price_cents: 0
    };
  });

  console.log(`Prepared ${itemsToInsert.length} items for insertion.`);

  // Insert in batches of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
    console.log(`Inserting batch ${i / BATCH_SIZE + 1}...`);
    const { error } = await supabase.from("erp_items").insert(batch);
    if (error) {
      console.error("Error inserting batch:", error);
    }
  }

  console.log("Data migration complete! 🎉");
}

main().catch(console.error);
