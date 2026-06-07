import { pool } from "../../database/db";
import {
  CategoryEditData,
  CategoryRequestData,
} from "../../types/Restaurant/Menue.types";

export class Category {
  static async addNewCategory(new_category_data: CategoryRequestData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Shift existing categories
      await client.query(
        `
      UPDATE categories
      SET display_order = display_order + 1
      WHERE menu_id = $1
      AND display_order >= $2
      `,
        [new_category_data.menu_id, new_category_data.display_order],
      );

      // Insert new category
      const result = await client.query(
        `
      INSERT INTO categories (
        menu_id,
        name,
        short_desc,
        long_desc,
        display_order,
        is_active,
        rules
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
      `,
        [
          new_category_data.menu_id,
          new_category_data.name,
          new_category_data.short_desc || "",
          new_category_data.long_desc || "",
          new_category_data.display_order,
          new_category_data.is_active,
          new_category_data.rules || {},
        ],
      );

      await client.query("COMMIT");

      return result.rows[0];
    } catch (e) {
      await client.query("ROLLBACK");
      console.log("error creating category", e);
      return null;
    } finally {
      client.release();
    }
  }

  static async getAllCategories(restaurant_id: number) {
    const query = `select c.id, c.menu_id, c.name, c.short_desc, c.long_desc, c.display_order,c.is_active, c.rules
        from categories c 
        join menu m
        on c.menu_id = m.id
        where m.restaurant_id = $1 ORDER BY c.menu_id ASC, c.display_order ASC`;
    const values = [restaurant_id];

    const result = await pool.query(query, values);

    return result.rows;
  }

  static async changeCategoryStatus(category_id: number, status: boolean) {
    const query = `UPDATE categories set is_active = $1 where id = $2`;
    const value = [status, category_id];
    const result = await pool.query(query, value);
    if (result.rowCount && result.rowCount > 0) {
      return true;
    }
    return false;
  }

  static async deleteCategory(category_id: number) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const categoryResult = await client.query(
        `
      SELECT menu_id, display_order
      FROM categories
      WHERE id = $1
      `,
        [category_id],
      );

      if (categoryResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return false;
      }
      const { menu_id, display_order } = categoryResult.rows[0];
      const deleteResult = await client.query(
        `
      DELETE FROM categories
      WHERE id = $1
      `,
        [category_id],
      );
      if (deleteResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return false;
      }
      await client.query(
        `
      UPDATE categories
      SET display_order = display_order - 1
      WHERE menu_id = $1
        AND display_order > $2
      `,
        [menu_id, display_order],
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateCategoryOrder(
    category_id: number,
    initial_order: number,
    final_order: number,
    menu_id: number,
  ) {
    const client = await pool.connect();

    try {
      // nothing changed
      if (initial_order === final_order) {
        return true;
      }

      await client.query("BEGIN");

      const moveDownQuery = `
  UPDATE categories
  SET display_order = display_order - 1
  WHERE menu_id = $1::int
  AND display_order > $2::int
  AND display_order <= $3::int;
`;

      const moveUpQuery = `
  UPDATE categories
  SET display_order = display_order + 1
  WHERE menu_id = $1::int
  AND display_order >= $3::int
  AND display_order < $2::int;
`;

      const updateCurrentCategoryQuery = `
      UPDATE categories
      SET display_order = $1
      WHERE id = $2
      AND menu_id = $3;
    `;
      const moveValues = [menu_id, initial_order, final_order];
      const updateValues = [final_order, category_id, menu_id];
      // console.log({moveValues,updateValues})

      // const values = [menu_id, initial_order, final_order, category_id];

      // moving down
      if (final_order > initial_order) {
        await client.query(moveDownQuery, moveValues);
      }

      // moving up
      else {
        await client.query(moveUpQuery, moveValues);
      }

      // update selected category
      await client.query(updateCurrentCategoryQuery, updateValues);

      await client.query("COMMIT");

      return true;
    } catch (e) {
      await client.query("ROLLBACK");
      console.log("error updating category order", e);
      return false;
    } finally {
      client.release();
    }
  }

  static async editCategory(
    new_category_data: CategoryEditData,
    category_id: number,
  ) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingCategory = await client.query(
        `
      SELECT menu_id, display_order
      FROM categories
      WHERE id = $1
      `,
        [category_id],
      );

      if (existingCategory.rowCount === 0) {
        throw new Error("Category not found");
      }

      const { menu_id, display_order: currentOrder } = existingCategory.rows[0];

      const newOrder = new_category_data.display_order;

      if (currentOrder !== newOrder) {
        const moveDownQuery = `
        UPDATE categories
        SET display_order = display_order - 1
        WHERE menu_id = $1
        AND display_order > $2
        AND display_order <= $3
      `;

        const moveUpQuery = `
        UPDATE categories
        SET display_order = display_order + 1
        WHERE menu_id = $1
        AND display_order >= $3
        AND display_order < $2
      `;

        if (newOrder > currentOrder) {
          await client.query(moveDownQuery, [menu_id, currentOrder, newOrder]);
        } else {
          await client.query(moveUpQuery, [menu_id, currentOrder, newOrder]);
        }
      }

      const updateResult = await client.query(
        `
      UPDATE categories
      SET
        name = $1,
        short_desc = $2,
        long_desc = $3,
        display_order = $4,
        is_active = $5,
        rules = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *;
      `,
        [
          new_category_data.name,
          new_category_data.short_desc,
          new_category_data.long_desc,
          newOrder,
          new_category_data.is_active,
          new_category_data.rules,
          category_id,
        ],
      );

      await client.query("COMMIT");

      return updateResult.rows[0];
    } catch (e) {
      await client.query("ROLLBACK");
      console.log("error editing category", e);
      return null;
    } finally {
      client.release();
    }
  }
}
