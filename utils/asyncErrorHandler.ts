// Third-party libraries
import { RequestHandler, type Request, type Response, type NextFunction } from 'express'

type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncErrorHandler = (fn: AsyncMiddleware): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            Promise.resolve(fn(req, res, next)).catch(next);
        } catch (err) {
            next(err);
        }
    };
};  

export default asyncErrorHandler