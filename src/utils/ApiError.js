class ApiError extends Error{
    constructor( // this constructor is used to create a custom error class which extends the built-in Error class. it takes four parameters, first is the status code of the error, second is the message of the error, third is the array of errors and fourth is the stack trace of the error. here we are setting the default values for message, errors and stack trace in case they are not provided when creating an instance of ApiError.
        statusCode,
        message="something went wrong",
        errors=[],
        stack=""
    ){
        super(message)
        this.statusCode=statusCode
        this.data=null
        this.message=message
        this.success=false
        this.errors= errors
    }
}

export {ApiError}