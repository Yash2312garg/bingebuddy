export  interface ErrorStatusScreensProps {
    error_status : 500 | 400| 404,
    data:ErrorData 
}

export interface ErrorData {
    message: string | undefined,
    status: number,
    heading: string | undefined,
    isRetry: boolean
}
