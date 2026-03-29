import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log("file is uploaded on cloudinary", response.result);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved file as the operation failed
    return null;
  }
};

const deleteFromCloudinary = async (publicId)=>{
  try {
    const response = await cloudinary.uploader.destroy(publicId,{
      resource_type:"image"
    })
    console.log("file is deleted from cloudinary",response.result)
    return response;
  } catch (error) {
    throw new ApiError(500, "Error while deleting the file from cloudinary");
    return null;
  }
}

export { uploadOnCloudinary, deleteFromCloudinary };
