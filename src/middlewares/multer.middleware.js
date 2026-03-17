import multer from "multer";

const storage = multer.diskStorage({ // this is used to set the storage engine for multer. multer.diskStorage is used to store the uploaded files on the disk. it takes an object as a parameter which has two properties, destination and filename. destination is used to set the destination folder where the uploaded files will be stored and filename is used to set the name of the uploaded file.
  destination: function (req, file, cb) { // this is used to set the destination folder where the uploaded files will be stored. cb is a callback function which takes two parameters, first is the error and second is the destination folder path. here we are setting the destination folder path to ./public/temp which means that the uploaded files will be stored in the temp folder inside the public folder.
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) { //
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage: storage });