import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    //using middleware to upload the files on the localpath.

    { name: "avatar", maxCount: 1 }, //separate object field to for the file upload.

    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login".post(loginUser));

router.route("/logout").post(verifyJWT, logoutUser);

export default router;
