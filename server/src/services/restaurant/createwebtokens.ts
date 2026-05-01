import  jwt,{SignOptions,Secret} from "jsonwebtoken"

const ACCESS_SECRET:Secret = process.env.ACCESS_SECRET || "asdasldklkmpekmdaomsdpaomsd"
const REFRESH_SECRET:Secret = process.env.REFRESH_SECRET || "aksdbqdknwefvbvknq;ekdnvq"


export interface SignAccessArguments{
    email: string;
    reference_id: string;
    phone: string;
}

interface VerifiRefreshTokenArguments extends SignAccessArguments{
    deviceId: string
}

type StringValue = "0" | "1d" | "20h" | "60s" | "15m";
export class Restaurant_JWT{
    static signAccessToken(data:SignAccessArguments,expiresIn: StringValue ){
        const options: SignOptions={expiresIn}
        return jwt.sign({...data},ACCESS_SECRET,  options)
    }
    static signRefreshToken(data:SignAccessArguments,deviceId: string){
        return jwt.sign({ ...data, deviceId }, REFRESH_SECRET, { expiresIn: "7d" });
    }

    static verifyAccessToken(token: string){
         return jwt.verify(token, ACCESS_SECRET) as VerifiRefreshTokenArguments 
    }
    static verifyRefreshToken(token:string){
        return jwt.verify(token,REFRESH_SECRET) as VerifiRefreshTokenArguments 
    }
}