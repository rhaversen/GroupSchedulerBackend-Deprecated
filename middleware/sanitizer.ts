import validator from 'validator'

// Helper function
function sanitizeObject (obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key])
            } else {
                obj[key] = validator.escape(String(obj[key]))
            }
        }
    }
}

// Sanitize middleware
export const sanitizeInput = (req, res, next) => {
    sanitizeObject(req.body)
    next()
}
