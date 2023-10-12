/* import csrf from 'csrf';
import { type Request, type Response, type NextFunction } from 'express'

const tokens = new csrf();

const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers['csrf-token']) {
        res.status(403).json({ message: "CSRF token missing" });
        return;
    }

    if (!tokens.verify(process.env.CSRF_SECRET as string, req.headers['csrf-token'] as string) || req.headers['csrf-token'] !== req.session.csrfToken) {
        res.status(403).json({ message: "CSRF token invalid" });
        return;
    }

    next();
};

export default csrfProtection; */
