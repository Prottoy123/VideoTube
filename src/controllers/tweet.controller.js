import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


//need to add middleware in the route and need to check the code
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(401, "Content Required");
  }
  const uploadTweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!uploadTweet) {
    throw new ApiError(500, "Failed to upload content");
  }

  return res
    .status(200)
    .json(ApiResponse(200, uploadTweet, "Content Uploaded Successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets

  const userId = req.params.userId;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

const UserTweet = await Tweet.find({ owner: userId }).populate("owner", "name email");

  if (!UserTweet) {
    throw new ApiError(404, "No tweets found for this user");
  }
  return res
    .status(200)
    .json(ApiResponse(200, UserTweet, "User Tweets Retrieved Successfully"));

});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
