import { privateApi } from "./api";

export const addMenuUtil=async()=>{

    const res = await privateApi.post(
        "restaurant/addMenu",
          {
    "restaurant_id": "25",
    "name": "Breakfast Delights",
    "short_desc": "Fresh and energizing morning meals",
    "long_desc": "Start your day right with our wholesome breakfast options including eggs, pancakes, smoothies, and freshly brewed coffee.",
    "is_active": true,
    "available_from": "07:00",
    "available_until": "11:00",
    "rules": {
      "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "dine_in_only": false
    }
  },   
    )
    console.log(res)
}