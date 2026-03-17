class ApiResponse { // to create a custom response format for the API. it takes three parameters, first is the status code of the response, second is the data of the response and third is the message of the response. here we are setting the default value for message in case it is not provided when creating an instance of ApiResponse.
    constructor(statusCode,data,message = "success")
    {
        this.statusCode= statusCode
        this.data = data
        this.message = message
        this.success =  statusCode <400
    }
}


export {ApiResponse}