import React,{useEffect} from "react";
import Navbar from "../Navbar/Navbar";
import "./PendingVerific.css"
import { checkpreloginSession } from "./utils";
import { useNavigate } from "react-router-dom";
const PendingVerificationScreen:React.FC = ()=>{
    //check for the session if is still active or not. 
    const navigate = useNavigate()
    useEffect(()=>{
        const checkSession = async()=>{
            try{
              const checkSession = await checkpreloginSession()
            if (!checkSession.isActive){
               navigate("/login")
            }
            }catch(e){
              navigate("/login")
            }     
        }
        checkSession()
      },[])
    
    return (    
        <>
            <Navbar/>
            <div className ="PendingVerificationScreen-cntr" >
                <h2>We're verifying your details.</h2>
                <p>If you need any help or have questions, feel free to reach out to our support email. </p>
                <span>bingebuddy@contactus.com</span>
            </div>
        
        </>
    )
}


export default PendingVerificationScreen;