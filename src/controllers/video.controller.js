import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video

  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoLocalpath = req.file?.path;
  if (!videoLocalpath) {
    throw new ApiError(400, "Video file is required");
  }

  const uploadVideo = await uploadOnCloudinary(videoLocalpath);
  if (!uploadVideo) {
    throw new ApiError(400, "upload video cant find");
  }

  const video = await Video.create({
    title,
    description,
    videoFIle: uploadVideo.url,
    duration: uploadVideo.duration,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video upload successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  
  if (!videoId) {
    throw new ApiError (200, "videoId required")
  }

  const getVideo = await Video.findById(videoId)
  if (!getVideo) {
    throw new ApiError(404,"video not found in the database")
  }
  return res
  .status(200)
  .json(new ApiResponse(200,getVideo,"video Found Successfully"))

  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400,"Video Id Is required")
  }
  //TODO: update video details like title, description, thumbnail
  const {title,description} = req.body
  if (!title || !description) {
    throw new ApiError(400,"title or description required")
  }

  const oldthumbnail = req.video?.thumdbnail

  const thumbnail = req.file?.path
  if (!thumbnail) {
    throw new ApiError(400,"thumbnail is required")
  }

  const uploadThumbnail = await uploadOnCloudinary(thumbnail)
  if (!uploadThumbnail) {
    throw new ApiError(400,"upload thumbnail failed")
  }

  if (Video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const updatedvideo = await Video.findByIdAndUpdate(videoId,{
    $set:{
      title,
      description,
      thumdbnail: uploadThumbnail.url
    }
  },
  { new:true},
)

 if (oldthumbnail) {
   const publicId = oldthumbnail.split("/").slice(-1)[0].split(".")[0];
   await deleteFromCloudinary(publicId);
 }

  return res
  .status(200)
  .json(new ApiResponse(200,updatedvideo,"video updated successfully"))

});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
