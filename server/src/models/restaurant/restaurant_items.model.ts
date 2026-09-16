import { pool } from "../../database/db";
import { type AddRestaurantItems } from "../../types/Restaurant/Items.types";

interface GetItemsParams {
  restaurant_id: string;
  limit: number;
  offset: number;
  search?: string | undefined;
  category_id?: number | undefined;
  is_available?: boolean | undefined;
  min_price?: number | undefined;
  max_price?: number | undefined;
  sort_by?: "price" | "updated_at" | undefined;
  sort_order?: "ASC" | "DESC" | undefined;
}

export class RestaurantItemModel {
  static async getItems({
    restaurant_id,
    limit,
    offset,
    search,
    category_id,
    is_available,
    min_price,
    max_price,
    sort_by = "updated_at",
    sort_order = "DESC",
  }: GetItemsParams) {
    const values: any[] = [restaurant_id];

    let query = `
      SELECT
        mi.id AS item_id,
        mi.name AS item_name,
        mi.short_desc AS item_short_desc,
        mi.long_desc AS item_long_desc,
        mi.base_price,
        mi.is_available,
        mi.is_veg,
        mi.spice_level,
        mi.prep_time,
        c.id AS category_id,
        m.id AS menu_id,
        mi.created_at AS item_created_at,
        mi.updated_at AS item_updated_at
      FROM menue_items mi
      INNER JOIN categories c ON mi.category_id = c.id
      INNER JOIN menu m ON c.menu_id = m.id
      WHERE m.restaurant_id = $1
    `;

    if (search) {
      values.push(`%${search}%`);
      query += `
        AND (
          mi.name ILIKE $${values.length}
          OR mi.short_desc ILIKE $${values.length}
          OR mi.long_desc ILIKE $${values.length}
        )
      `;
    }

    if (category_id) {
      values.push(category_id);
      query += ` AND c.id = $${values.length}`;
    }

    if (typeof is_available === "boolean") {
      values.push(is_available);
      query += ` AND mi.is_available = $${values.length}`;
    }

    if (min_price !== undefined) {
      values.push(min_price);
      query += ` AND mi.base_price >= $${values.length}`;
    }

    if (max_price !== undefined) {
      values.push(max_price);
      query += ` AND mi.base_price <= $${values.length}`;
    }

    const sortColumn =
      sort_by === "price"
        ? "mi.base_price"
        : "mi.updated_at";

    const sortDirection =
      sort_order === "ASC"
        ? "ASC"
        : "DESC";

    query += `
      ORDER BY ${sortColumn} ${sortDirection}
    `;

    values.push(limit);
    query += ` LIMIT $${values.length}`;

    values.push(offset);
    query += ` OFFSET $${values.length}`;

    const result = await pool.query(query, values);

    return result.rows;
  }

  static async getTotalItems({
    restaurant_id,
    search,
    category_id,
    is_available,
    min_price,
    max_price,
  }: Omit<GetItemsParams, "limit" | "offset" | "sort_by" | "sort_order">) {
    const values: any[] = [restaurant_id];

    let query = `
      SELECT COUNT(*) AS total
      FROM menue_items mi
      INNER JOIN categories c ON mi.category_id = c.id
      INNER JOIN menu m ON c.menu_id = m.id
      WHERE m.restaurant_id = $1
    `;

    if (search) {
      values.push(`%${search}%`);
      query += `
        AND (
          mi.name ILIKE $${values.length}
          OR mi.short_desc ILIKE $${values.length}
          OR mi.long_desc ILIKE $${values.length}
        )
      `;
    }

    if (category_id) {
      values.push(category_id);
      query += ` AND c.id = $${values.length}`;
    }

    if (typeof is_available === "boolean") {
      values.push(is_available);
      query += ` AND mi.is_available = $${values.length}`;
    }

    if (min_price !== undefined) {
      values.push(min_price);
      query += ` AND mi.base_price >= $${values.length}`;
    }

    if (max_price !== undefined) {
      values.push(max_price);
      query += ` AND mi.base_price <= $${values.length}`;
    }

    const result = await pool.query(query, values);

    return Number(result.rows[0].total);
  }

  static async changeItemAvailability(item_id:number, status: boolean){
    const query = `UPDATE menue_items set is_available = $1 where id = $2`;
    const values = [status,item_id];
    const result  = await pool.query(query,values);
    if (result.rowCount && result.rowCount > 0) {
      return true;
    }
    return false;
  }

  static async deleteItems(item_id:number){
    const query = `DELETE from menue_items where id = $1`
    const result = await pool.query(query,[item_id]);
    if (result.rowCount && result.rowCount>0){
        return true
    }
    return false;
  }

  static async createItem(data:AddRestaurantItems){
    const query = `
    INSERT into menue_items (
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
        img_url
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;

    const values = [
        data.category_id,
        data.name,
        data.short_desc,
        data.long_desc,
        data.base_price,
        data.is_available,
        data.is_veg,
        data.spice_level,
        data.prep_time,
        data.tags,
        data.img_url
    ]
    const result  = await pool.query(query, values);
    
    if (result.rowCount && result.rowCount>0){
        return result.rows[0]
    }
    return false
  }

  static async editItem(
  item_id: number,
  data: AddRestaurantItems
) {
  const query = `
    UPDATE menue_items
    SET
      category_id = $1,
      name = $2,
      short_desc = $3,
      long_desc = $4,
      base_price = $5,
      is_available = $6,
      is_veg = $7,
      spice_level = $8,
      prep_time = $9,
      tags = $10,
      img_url = $11,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $12
    RETURNING *;
  `;

  const values = [
    data.category_id,
    data.name,
    data.short_desc,
    data.long_desc,
    data.base_price,
    data.is_available,
    data.is_veg,
    data.spice_level,
    data.prep_time,
    data.tags,
    data.img_url,
    item_id,
  ];

  const result = await pool.query(query, values);

  if (result.rowCount && result.rowCount > 0) {
    return result.rows[0];
  }

  return false;
}
}