import { Request, Response } from "express";
import { CategoryRequestData } from "../../types/Restaurant/Menue.types";
import { Menu } from "../../models/restaurant/restaurant_menu.model";
import { Category } from "../../models/restaurant/restaurant_category.model";
import { EventPublisher } from "../../services/rabbitmq/eventPublisher";
import { SignAccessArguments } from "../../services/restaurant/createwebtokens";

export const addCategory = async (req: Request, res: Response) => {
  try {
    const data: CategoryRequestData = req.body;
    const check = await Menu.checkExistingMenuByid(data.menu_id);

    if (!check) {
      return res
        .status(400)
        .json({ msg: `Menu with id: ${data.menu_id} not found` });
    }
    console.log("data", data);
    const add_data = await Category.addNewCategory(data);
    console.log("add_data", add_data);

    if (!add_data) {
      return res.status(404).json({ msg: `Database Error Occured ` });
    }
    return res.status(201).json({ msg: "new Category added", data: add_data });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const restaurant_id = Number(req.query.restaurant_id);
    if (!restaurant_id) {
      return res.status(404).json({ msg: "ionvalid data provided" });
    }
    const allCategoriesData: any =
      await Category.getAllCategories(restaurant_id);
    return res.status(200).json({ data: allCategoriesData });
  } catch (e) {
    console.log("error fetching all the categories", e);
    return res.status(500).json({ msg: "internal server error" });
  }
};
interface CategoryStatusBody {
  category_id: number;
  status: boolean;
}
export const changeCategoryStatus = async (req: Request, res: Response) => {
  try {
    const data: CategoryStatusBody = req.body;
    const success: boolean = await Category.changeCategoryStatus(
      data.category_id,
      data.status,
    );
    if (success) {
      
      const user = req.user as SignAccessArguments;
      
      EventPublisher.emitInAppNotification(user.reference_id, "IN_APP", {
        recipientType: "RESTAURANT",
        title: data.status? "Category Activated": "Category Deactivated",
        message: `Category ID ${data.category_id} status was modified to ${data.status ? "Active" : "Inactive"}.`,
        action_url: "",
        metadata: {},
        is_read: false
      });
      return res.status(200).json({ msg: "succesfully changed the status" });
    }
    return res.status(503).json({ msg: "service unavailable" });
  } catch (e) {
    console.log("error while changing category status", e);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const category_id: string = req.query.category_id as string;
    console.log(req.query);
    const success: boolean = await Category.deleteCategory(Number(category_id));
    if (success) {
      // const user = req.user as SignAccessArguments;
      // NotificationService.triggerNotification({
      //   recipientId: user.reference_id,
      //   recipientType: "RESTAURANT",
      //   eventType: "IN_APP",
      //   title: "Category Deleted 🗑️",
      //   message: `Category ID ${category_id} was removed from your setup.`,
      //   priority: "HIGH"
      // }).catch(err => console.error("Notification streaming failed:", err));
      console.log("need to establish inter service communication ");
      return res.status(201).json({ msg: "succesfully deleted" });
    }
    return res.status(503).json({ msg: "service unavailable" });
  } catch (e) {
    console.log("error while deleting menu", e);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const changeCategoryOrder = async (req: Request, res: Response) => {
  try {
    const { initial_order, final_order, category_id, menu_id } = req.body;
    console.log(req.body);
    const success: boolean = await Category.updateCategoryOrder(
      category_id,
      initial_order,
      final_order,
      menu_id,
    );
    if (success) {
      // const user = req.user as SignAccessArguments;
      // NotificationService.triggerNotification({
      //   recipientId: user.reference_id,
      //   recipientType: "RESTAURANT",
      //   eventType: "IN_APP",
      //   title: "Display Order Updated 🔃",
      //   message: "The layout sequence of your menu categories has been reorganized.",
      //   priority: "LOW"
      // }).catch(err => console.error("Notification streaming failed:", err));
      console.log("need to establish inter service communication ");

      return res.status(201).json({ msg: "succesfully changed" });
    }
    return res.status(503).json({ msg: "service unavailable" });
  } catch (e) {
    console.log("error while changing order of the categories", e);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const editCategory = async (req: Request, res: Response) => {
  try {
    const {
      name,
      short_desc,
      long_desc,
      is_active,
      display_order,
      rules,
      category_id,
    } = req.body;

    const updateCategory = await Category.editCategory(
      {
        name,
        short_desc,
        long_desc,
        is_active,
        display_order,
        rules,
      },
      category_id,
    );
    if (updateCategory) {
      return res.status(200).json({
        msg: "Successfully updated menu",
        data: updateCategory,
      });
    }

    return res.status(404).json({
      msg: "Menu not found",
    });
  } catch (e) {
    console.log("error while changing order of the categories", e);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};
