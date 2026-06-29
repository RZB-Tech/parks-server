declare interface CustomError extends Pick<Error, 'name' | 'stack'> {
    message: number | string,
    type: string
}