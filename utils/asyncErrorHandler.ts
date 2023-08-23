// Third-party libraries
import { type Request, type Response, type NextFunction } from 'express'

type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncErrorHandler = (fn: AsyncMiddleware) => (req: Request, res: Response, next: NextFunction) =>
  Promise
    .resolve(fn(req, res, next))
    .catch(next);

export default asyncErrorHandler