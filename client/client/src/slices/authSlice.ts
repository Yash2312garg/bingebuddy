import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Restaurant } from "../Types/Restraurant";


interface AuthState {
    restaurant : Restaurant|null;
    isLoading: boolean
}
const initialState:AuthState = {
    restaurant:null,
    isLoading:true
}

export const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        setUser:(state,action: PayloadAction<Restaurant|null>)=>{
            state.restaurant = action.payload;
        },
        setLoading: (state,action: PayloadAction<boolean>)=>{
            state.isLoading = action.payload
        },
        logoutUser: (state)=>{
            state.isLoading= false;
            state.restaurant = null
        }
    }
})

export const {setUser, setLoading, logoutUser} = authSlice.actions;

export default authSlice.reducer;