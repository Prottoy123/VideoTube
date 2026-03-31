import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skipValue = (pageNumber - 1) * limitNumber;

  const sortOptions = {};
  sortOptions[sortBy] = sortType === "desc" ? -1 : 1;

  const pipeline = [
    {
      $match: {
        isPublished: true,
        ...(query && { title: { $regex: query, $options: "i" } }),
      },
    },
    {
      $sort: sortOptions, 
    },
    {
      $skip: skipValue, 
    },
    {
      $limit: limitNumber,
    },
    {
      $project: {
        title: 1,
        description: 1,
        thumbnail: 1,
        videoFile: 1,
        views: 1,
        owner: 1,
      },
    },
  ];

  const ShowVideo = await Video.aggregate(pipeline);

  return res
    .status(200)
    .json(new ApiResponse(200, ShowVideo, "Videos fetched successfully"));
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
    throw new ApiError(200, "videoId required");
  }

  const getVideo = await Video.findById(videoId);
  if (!getVideo ) {
    throw new ApiError(404, "video not found in the database");
  }

  if (
    !getVideo.isPublished &&
    getVideo.owner.toString() !== req.user?._id.toString()
  ) {
    throw new ApiError(
      403,
      "This video is private and only accessible by the owner"
    );
  }
  
  return res
    .status(200)
    .json(new ApiResponse(200, getVideo, "video Found Successfully"));

  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video Id Is required");
  }
  //TODO: update video details like title, description, thumbnail
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "title or description required");
  }

  const oldthumbnail = req.video?.thumdbnail;

  const thumbnail = req.file?.path;
  if (!thumbnail) {
    throw new ApiError(400, "thumbnail is required");
  }

  const uploadThumbnail = await uploadOnCloudinary(thumbnail);
  if (!uploadThumbnail) {
    throw new ApiError(400, "upload thumbnail failed");
  }

  if (Video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const updatedvideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumdbnail: uploadThumbnail.url,
      },
    },
    { new: true }
  );

  if (oldthumbnail) {
    const publicId = oldthumbnail.split("/").slice(-1)[0].split(".")[0];
    await deleteFromCloudinary(publicId);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedvideo, "video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video

  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  //finding the video in the DB
  const deleteVideo = await Video.findById(videoId);

  if (!deleteVideo) {
    throw new ApiError(401, "videoId doesnt match");
  }

  //Owner Check
  if (deleteVideo.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Validation Failed");
  }

  //extract the public id from the video
  const videoPublicId = deleteVideo.videoFIle.split("/").pop().split(".")[0];
  const thumbnailPublicId = deleteVideo.thumdbnail.split("/").pop().split(".")[0];

  //delete the video in cloudinary using the public id
  await deleteFromCloudinary(videoPublicId, { resource_type: "video" });// we have to specify the resource type as video because cloudinary treats videos and images differently and if we dont specify the resource type it will try to delete the video as an image and it will throw an error.
  await deleteFromCloudinary(thumbnailPublicId );

  //delete from the Database
  await Video.findByIdAndDelete(videoId);
  await Comment.deleteMany({ video: videoId });
  await Like.deleteMany({ video: videoId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video Delete Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
if (!videoId) {
  throw new ApiError(400,"VideoId required")
}

const foundVideo = await Video.findById(videoId);

if (foundVideo.video.toString() !== req.user?._id.toString()) {
  throw new ApiError(400, "unable to to validate");
}

const toggleStatus = await findByIdAndUpdate(
  videoId,
  {
    $set: {
      isPublished: !foundVideo.isPublished, // just change the value of the toggle
    },
  },
  {
    new: true,
  }
);

return res
.status(200)
.json(new ApiResponse(200,toggleStatus,"Status Changed"))


});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
