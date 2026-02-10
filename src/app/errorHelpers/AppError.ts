/**
 * AppError is a custom error class that extends the built-in Error class in JavaScript.
 *
 * It is designed to provide a standardized way to handle errors in an application, allowing developers to include additional information such as the HTTP status code and a custom error message.
 *
 * The constructor of the AppError class takes three parameters:
 */
class AppError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string, stack = "") {
    //! Call the parent class constructor with the error message
    super(message); // Error("My Error Message")
    this.statusCode = statusCode;

    if (stack) {
      this.stack = stack;
    } else {
      //! Capture the stack trace for the error, excluding the constructor function from the stack trace
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
