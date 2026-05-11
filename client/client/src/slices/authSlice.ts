import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface User {
    email: string;
    referenceId: string;
    authStatus: boolean;   
}

interface AuthState {
    user : User|null;
    isLoading: boolean
}
const initialState:AuthState = {
    user:null,
    isLoading:true
}

export const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        setUser:(state,action: PayloadAction<User|null>)=>{
            state.user = action.payload;
        },
        setLoading: (state,action: PayloadAction<boolean>)=>{
            state.isLoading = action.payload
        },
        logoutUser: (state)=>{
            state.isLoading= false;
            state.user = null
        }
    }
})

export const {setUser, setLoading, logoutUser} = authSlice.actions;

export default authSlice.reducer;