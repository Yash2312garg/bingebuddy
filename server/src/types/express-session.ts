import 'express-session';
import { SignAccessArguments } from '../services/restaurant/createwebtokens';
declare module 'express-session' {
  interface SessionData {
    otpIdentifier: string;
    otpGeneratedAt: number; 
    identifierType: string;
  }
}
declare module "express-serve-static-core" {
  interface Request {
    user?: SignAccessArguments; 
  }
}