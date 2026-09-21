import type { Response } from 'express';


type ErrorType = Error | null;

export function return_response(_err: ErrorType, message: string, code: number, res: Response): Response {
    
    switch (code) {
        case 500:
            return res.status(500).json({ error: message || 'Internal Server Error' });

        case 404:
            return res.status(404).json({ error: message || 'Not Found' });

        default:
            return res.status(code).json({ message: message });
    }
}

