import { pool } from "../../database/db";
import {
  CategoryRequestData,
  MenueItemsRequestData,
  MenueRequestBody,
} from "../../types/Restaurant/Menue.types";

export class Menu {
  static async addNewMenue(new_menue_data: MenueRequestBody) {
    const query = `INSERT INTO menu (restaurant_id, 
                    name, 
                    short_desc, 
                    long_desc, 
                    is_active, 
                    available_from, 
                    available_until, 
                    rules)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

    const values = [
      new_menue_data.restaurant_id,
      new_menue_data.name,
      new_menue_data.short_desc || "",
      new_menue_data.long_desc || "",
      new_menue_data.is_active,
      this.convert_string_to_time(new_menue_data.available_from),
      this.convert_string_to_time(new_menue_data.available_until),
      new_menue_data.rules || {},
    ];
    const rows = await pool.query(query, values);
    if (rows) {
      return rows;
    } else {
      return null;
    }
  }

  static async addNewCategory(new_category_data: CategoryRequestData) {
    const query = `INSERT INTO categories (
                    menue_id,
                    name,
                    short_desc,
                    long_desc,
                    display_order,
                    is_active,
                    rules) 
                    VALUES($1, $2, $3, $4, $5, $6, $7)`;

    const values = [
      new_category_data.menue_id,
      new_category_data.name,
      new_category_data.short_desc || "",
      new_category_data.long_desc || "",
      new_category_data.display_order,
      new_category_data.is_active,
      new_category_data.rules || {},
    ];
    const result = await pool.query(query, values);
    if (result.rowCount > 0) {
      return result.rows;
    } else {
      return null;
    }
  }

  static async addNewMenueItems(new_item_data: MenueItemsRequestData){
        const query = `INSERT INTO menue_items (
            category_id, 
            name,
            short_desc,
            long_desc,
            base_price,
            is_available,
            is_veg,
            spice_level,
            prep_time,
            tags,
            img_url,
            )`
        const values = [
            new_item_data.category_id,
            new_item_data.name,
            new_item_data.short_desc,
            new_item_data.long_desc,
            new_item_data.is_available,
            new_item_data.is_veg,
            new_item_data.spice_level,
            new_item_data.prep_time,
            new_item_data.tags||{},
            new_item_data.img_url || ""
        ]
        const data = await pool.query(query,values)

        if(data.rowCount>0){
            return data.rows
        }else{
            null
        }
        
  }

    static async  createNewCombos(combo_data:any){
        const query = `INSERT INTO combos(
        category_id,
        name,
        short_desc,
        long_desc,
        base_price,
        is_available,
        max_items,
        min_items) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`; 
        const values= [
combo_data.category_id,
combo_data.name,
combo_data.short_desc,
combo_data.long_desc,
combo_data.base_price,
combo_data.is_available,
combo_data.max_items,
combo_data.min_items
        ]

        const result = pool.query(query,values);
        if(result.rowCount> 1){
            return result.rows[1]
        }else{
            return null
        }

    }
//   static async addAddons(new_addin_data:){

//   }

  static async checkExistingMenuByid(menu_id: string) {
    if (!menu_id) {
      throw new Error("No Menu id Found");
    }
    const query = `SELECT 1 FROM menu WHERE id = $1`;
    const value = [menu_id];
    const result = await pool.query(query, value);
    console.log(result);
    return result.rowCount > 0;
  }

  

  static async checkExistingCategoryByid(category_id: string) {
    if (!category_id) {
      throw new Error("No Category id Found");
    }
    const query = `SELECT 1 FROM categories WHERE id = $1`;
    const value = [category_id];
    const result = await pool.query(query, value);
    console.log(result);
    return result.rowCount > 0;
  }

  private static convert_string_to_time(timeString: String) {
    if (timeString === "" || null) {
      return null;
    }
    const date = new Date(`1970-01-01 ${timeString}`);
    if (isNaN(date.getTime())) {
      console.error("Invalid time string provided:", timeString);
      return null;
    }
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }
}
