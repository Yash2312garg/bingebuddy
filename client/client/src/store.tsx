import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import menuReducer  from "./slices/menuSlice";
 const store = configureStore({
    reducer: {
        auth: authReducer,
        menu: menuReducer
    },
})

export default store;
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;