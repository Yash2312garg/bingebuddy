import "./App.css";

import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./Login";
import VerifyOTP from "./Verify_Otp";
import LandingPage from "./LandingPage";
import PreLoginSteps from "./PreLoginSteps";
import PendingVerificationScreen from "./Verify_Otp/PendingVerific";
import Home from "./Home";
import Menu from "./Menu";
function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/login/info" element={<PreLoginSteps />} />
          <Route path= "/login/status=pending" element = {<PendingVerificationScreen/>}/>
          <Route path= "/home" element = {<Home/>}/>
          <Route path= "/menu" element = {<Menu/>}/>

        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
