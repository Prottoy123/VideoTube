import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    Credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); // this is used to parse the json data from the request body and limit the size of the json data to 16kb. this is done to prevent the denial of service attack by sending large json data in the request body.
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // this is used to parse the urlencoded data from the request body and limit the size of the urlencoded data to 16kb. this is done to prevent the denial of service attack by sending large urlencoded data in the request body.
app.use(express.static("public")); // this is used to serve the static files from the public folder. this is done to serve the uploaded files like avatar and cover image from the public folder. when we upload the files using multer middleware, it will save the files in the public folder and we can access those files using the url like http://localhost:5000/avatar/filename or http://localhost:5000/coverImage/filename.
app.use(cookieParser()); // this is used to parse the cookies from the request header and make it available in the req.cookies object. this is done to get the refresh token from the cookies when we want to refresh the access token using the refresh token. we can get the refresh token from the req.cookies.refreshToken and use it to generate a new access token.



//Routes

import userRouter from './routes/user.routes.js'

//routes declaration
app.use("/api/v1/users",userRouter)

export { app };
