import React, { useEffect } from "react";
// import Sidebar from "../Components/Sidebar";
// import { addMenuUtil } from "../utils/checkinterceptors";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Navbar/Navbar";

const Home:React.FC= ()=>{

    return (<>
    <Navbar/>
        <Sidebar/>
    </>)
}

export default Home