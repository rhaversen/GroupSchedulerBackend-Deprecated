// Third-party libraries
import { RequestHandler, type Request, type Response, type NextFunction } from 'express'

type AsyncMiddleware<TRequest = Request> = (req: TRequest, res: Response, next: NextFunction) => Promise<void>;

const asyncErrorHandler = <TRequest = Request>(fn: AsyncMiddleware<TRequest>): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // We can safely cast here because we control the function that's being passed in
            Promise.resolve(fn(req as TRequest, res, next)).catch(next)
        } catch (err) {
            next(err)
        }
    };
};

export default asyncErrorHandler;
