import { type IUser } from './models/User.js'

declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser
    }
}

declare namespace Express {
    export interface Request {
      cookies: { [key: string]: string };
    }
  }
  