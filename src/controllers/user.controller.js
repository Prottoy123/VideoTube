import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {

  // get user details from frontend
  const { fullName, email, username, password } = req.body;
  console.log("email", email);

  // validation - not empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  // to check if the username or email is present on db.
  const existedUser = await User.findOne({ // this findOne is mongoose method and the User is model imported from user.model.js
    
    $or: [{ username }, { email }], // this $or is used to check either username or email exist in db. if any of them exist then it will return that user.
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // create user object - create entry in db
  const user = await User.create({
    //here User.create is mongoose method & the User is model imported from user.model.js
    fullName,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    username: username.toLowerCase(),
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select( // this select is used to exclude the password and refresh token from the response.
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "something went wrong registring a user");
  }

  // return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  //username or email
  //find the user
  //password check
  //access and refresh token generate and give them to user
  //send cookie
  //response

  const { email, username, password } = req.body; //req body -> data

  if (!username && !email) {
    throw new ApiError(400, "username or email is required"); //username or email
  }

  //find the user(DB query)
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); //password check

  if (!isPasswordValid) {
    throw new ApiError(401, "password incorrect");
  }

  //access and refresh token generate and give them to user
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

     const loggedInUser = await User.findById(user._id).select(
       "-password -refreshToken"
     );


  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req,res)=>{
  await User.findByIdAndUpdate(req.user._id,
    {
      $set:{
        refreshToken:undefined
      }
    },
    {
      new:true
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"User Logged Out Successfully"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{

  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401,"unauthorized request")
  }

 try {
   const decodedToken = jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
   )
 
   const user = await User.findById(decodedToken?._id)
 
     if (!user) {
       throw new ApiError(401, "Invalid refresh Token");
     }
 
     if (incomingRefreshToken !== user?.refreshToken) {
       throw new ApiError(401,"refresh token is expired")
     }
 
     const {accessToken,newRefreshToken} =  await generateAccessAndRefreshTokens(user._id)
 
     const options = {
       httpOnly:true,
       secure:true
     }
     return res
       .status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("RefreshToken", newRefreshToken, options)
       .json(new ApiResponse(200, 
         { accessToken:newRefreshToken },
       "Access Token Refreshed"
       ));
 } catch (error) {
  throw new ApiError(401,error?.message || "invalid Refresh Token")
 }

})

// update controller

const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword,confPassword} = req.body

  // if (newPassword ===confPassword) {
  //   throw new ApiError(400,"Password Doesnt Match")
  // }

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (isPasswordCorrect) {
    throw new ApiError(400,"Invalid Password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave:false})

  return res
  .status(200
  .json(new ApiResponse(200,{},"Password Saved Successfully"))
  )

})

const getCurrentUser = asyncHandler (async (req,res)=>{
  return res
  .status(200)
  .json(200,req.user,"Current User fetched Successfully")
})

const UpdateAccountDetails = asyncHandler(async(req,res)=>{
  const {fullName,email} = req.body

  if (!fullName || !email) {
    throw new ApiError(400,"All Fields Are Required")
  }
 
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{ 
        // these two types can be used
        fullName,
        email:email
      }
    },
    {new:true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Accont details Updated Successfully"))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
const avatarLocalpath = req.file?.path

if (!avatarLocalpath) {
  throw new ApiError(400,"Avatar file is missing")
}

const avatar = await uploadOnCloudinary(avatarLocalpath)

if (!avatar.url) {
    throw new ApiError(400, "Error While Uploading on Avatar");
}

const user = await User.findByIdAndUpdate(req.user?._id,
  {
    $set:{
      avatar:avatar.url
    }
  },
  {new:true}
).select("-password")

return res
.status(200)
.json(200,user,"Avatar updated successfully")

})

const updateUserCoverImage =asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400,"CoverImage doesnt found")
  }

   const coverImage = await uploadOnCloudinary(coverImageLocalPath.url);

   if (!coverImage.url) {
     throw new ApiError(400, "Error While Uploading on Avatar");
   }
   
  const user =  User.findByIdAndUpdate(req.user?._id,
    {
    $set:{
coverImage:coverImage.url
    }
    },
    {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(200,user,"coverImage Updated Successfully")
})



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  UpdateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
