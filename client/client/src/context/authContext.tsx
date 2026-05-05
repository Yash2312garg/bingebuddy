import axios from "axios";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";


interface User {
    email: string;
    referenceId: string;
    authStatus: boolean;   
}

interface AuthContextTypes{
    user:User|null;
    isLoading:boolean;
    setUser: (user:User)=>void;
    logout: ()=> void;  
}

const AuthContext = createContext<AuthContextTypes|undefined>(undefined);

export const AuthProvider = ({children}:{children:ReactNode})=>{
    const [user,setUser] = useState<User | null>(null);
    const [isLoading,setIsLoading] = useState<boolean>(true);

    useEffect(()=>{
        const initAuth = async()=>{
            try{
                // const session = await verifySession()
                setUser (null)
            }catch(err){
                if(axios.isAxiosError(err) && err.response?.status===401){
                    try{
                        // await refreshToken();
                        // const session = await verifySession()    
                        setUser(null)

                    }catch{
                        setUser(null)
                    }
                }else{
                setUser(null)
                }
            }finally{
                setIsLoading(false)
            }
        }
        initAuth()
    },[])

    const logout = async()=>{
        //need to add logout functionality

    }

    return (
        <AuthContext.Provider value={{user,isLoading,setUser,logout}}>
            {children}
        </AuthContext.Provider>
    )
}   

export const useAuth = ()=>{
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}

