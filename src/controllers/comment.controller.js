import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// controller to get all comments for a video with pagination
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // validation - check if videoId is valid
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  // check if video exists in DB
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video does not exist");
  }

  // edge case: prevent access to comments on unpublished/private videos by non-owners
  if (
    !video.isPublished &&
    video.owner?.toString() !== req.user?._id?.toString()
  ) {
    throw new ApiError(
      403,
      "This video is private and only accessible by the owner"
    );
  }

  // sanitize pagination params
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  // aggregation pipeline to fetch comments with owner info and like metrics
  const commentsAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: req.user?._id
              ? {
                  $in: [
                    new mongoose.Types.ObjectId(req.user._id),
                    "$likes.likedBy",
                  ],
                }
              : false,
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // filter out comments whose owner account no longer exists
      $match: {
        owner: { $exists: true, $ne: null },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        likesCount: 1,
        isLiked: 1,
        owner: 1,
      },
    },
  ]);

  const comments = await Comment.aggregatePaginate(commentsAggregate, {
    page: pageNumber,
    limit: limitNumber,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, comments, "Video comments fetched successfully")
    );
});

// controller to add a comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body || {};

  // check if user is authenticated
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  // validation - check if videoId is valid
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  // validation - check if content is non-empty string
  if (!content || typeof content !== "string" || content.trim() === "") {
    throw new ApiError(400, "Comment content is required");
  }

  // check if video exists in DB
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video does not exist");
  }

  // edge case: prevent commenting on private videos by non-owners
  if (
    !video.isPublished &&
    video.owner?.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "Cannot comment on a private video");
  }

  // create comment entry in DB
  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(500, "Failed to add comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

// controller to update an existing comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body || {};

  // check if user is authenticated
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  // validation - check if commentId is valid
  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Comment ID");
  }

  // validation - check if updated content is non-empty string
  if (!content || typeof content !== "string" || content.trim() === "") {
    throw new ApiError(400, "Comment content is required");
  }

  // check if comment exists in DB
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment does not exist");
  }

  // authorization - only the comment owner can update the comment
  if (comment.owner?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content.trim(),
      },
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(500, "Failed to update comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

// controller to delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // check if user is authenticated
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  // validation - check if commentId is valid
  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Comment ID");
  }

  // check if comment exists in DB
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment does not exist");
  }

  // authorization - only the comment owner can delete the comment
  if (comment.owner?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deletedComment) {
    throw new ApiError(500, "Failed to delete comment");
  }

  // clean up likes associated with the deleted comment
  await Like.deleteMany({ comment: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
