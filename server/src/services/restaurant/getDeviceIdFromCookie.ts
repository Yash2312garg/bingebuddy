import { Request, Response } from "express";
import crypto from "crypto";
import { DeviceIdCookies } from "../../cookies/devideId.cookies";

export class DeviceIdCookie {

  static createNewDeviceId(res: Response, deviceId?: string) {
    
    const id = deviceId || crypto.randomUUID();

    DeviceIdCookies.setDeviceIdCookie(res,id)
    return id;
  }

  static getDeviceId(req: Request): string | null {
    const deviceId = DeviceIdCookies.getDeviceIdCookie(req);
    return deviceId || null;
  }

  static getOrCreateDeviceId(req: Request, res: Response): string {
    let deviceId = this.getDeviceId(req);

    if (!deviceId) {
      deviceId = this.createNewDeviceId(res);
    }
    return deviceId;
  }

  static clearDeviceId(res: Response) {
    DeviceIdCookies.clearDeviceIdCookie(res);
  }
}
