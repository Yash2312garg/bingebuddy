import React, { useEffect } from "react";
import Sidebar from "../Components/Sidebar";
import { addMenuUtil } from "../utils/checkinterceptors";
const Home:React.FC= ()=>{
  useEffect(()=>{
    addMenuUtil()
  })
    return (<>

        <Sidebar/>
    </>)
}

export default Home