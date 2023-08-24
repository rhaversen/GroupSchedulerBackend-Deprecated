// Third-party libraries
import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

// Helper function to recursively sanitize the objects
function sanitizeObject(obj: Record<string, any>) {
    for (const key in obj) {
        // Ensure that the key is a property of the object itself and not from the prototype chain
        if (obj.hasOwnProperty(key)) {
            // If the property is an object and not null, call the function recursively
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            } else {
                // Convert the value to a string, then trim any leading/trailing whitespace
                let value = String(obj[key]).trim();
                // Escape the value to remove any potential harmful HTML or JavaScript content
                obj[key] = validator.escape(value);
            }
        }
    }
}

// Sanitize middleware to cleanse the incoming request body
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
    sanitizeObject(req.body); // Sanitize the request body
    sanitizeObject(req.query); // Sanitize the query parameters
    sanitizeObject(req.params); // Sanitize the URL parameters
    next(); // Proceed to the next middleware or request handler
};
