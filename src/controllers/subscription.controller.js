import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// controller to toggle subscription (subscribe / unsubscribe)
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // validation - check if channelId is valid
  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID");
  }

  // check if user is authenticated
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  // edge case: user cannot subscribe to their own channel
  if (channelId.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  // check if channel exists in DB
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel does not exist");
  }

  // check if subscription already exists
  const existingSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  // if already subscribed, remove subscription (unsubscribe)
  if (existingSubscription) {
    await Subscription.findByIdAndDelete(existingSubscription._id);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isSubscribed: false },
          "Unsubscribed successfully"
        )
      );
  }

  // if not subscribed, create subscription entry
  const newSubscription = await Subscription.create({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (!newSubscription) {
    throw new ApiError(500, "Failed to subscribe to channel");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSubscribed: true, subscription: newSubscription },
        "Subscribed successfully"
      )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // validation - check if channelId is valid
  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID");
  }

  // check if channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel does not exist");
  }

  // aggregation pipeline to get all subscribers of the channel
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
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
      $addFields: {
        subscriber: {
          $first: "$subscriber",
        },
      },
    },
    {
      $match: {
        subscriber: { $exists: true, $ne: null },
      },
    },
    {
      $project: {
        _id: 1,
        subscriber: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "Channel subscribers fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  // validation - check if subscriberId is valid
  if (!subscriberId || !isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid Subscriber ID");
  }

  // check if subscriber user exists
  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(404, "Subscriber does not exist");
  }

  // aggregation pipeline to get all channels the user has subscribed to
  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannel",
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
      $addFields: {
        subscribedChannel: {
          $first: "$subscribedChannel",
        },
      },
    },
    {
      $match: {
        subscribedChannel: { $exists: true, $ne: null },
      },
    },
    {
      $project: {
        _id: 1,
        subscribedChannel: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
