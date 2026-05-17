require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "frontend")));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   CREATE UPLOADS FOLDER
========================= */

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

/* =========================
   MONGODB CONNECTION
========================= */

mongoose.connect(
    process.env.MONGO_URL || "mongodb://127.0.0.1:27017/makeFriendsDB"
)

.then(() => {
    console.log("MongoDB Connected ✅");
})

.catch((err) => {
    console.log(err);
});

/* =========================
   MULTER STORAGE
========================= */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "uploads");
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }

});

const upload = multer({ storage });

/* =========================
   SCHEMAS
========================= */

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    username: {
        type: String,
        required: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    bio: {
        type: String,
        default: ""
    },
     profilePic: {
        type: String,
        default: "/images/default-profile.png"
    },

    followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
}],

following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
}],

followRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
}]

});

const postSchema = new mongoose.Schema({

    userId: {
        type: String,
        required: true
    },

    username: {
        type: String,
        required: true
    },

    userProfilePic: {
        type: String,
        default: ""
    },

    content: {
        type: String,
        default: ""
    },

    media: {
        type: String,
        default: ""
    },

    mediaType: {
        type: String,
        default: ""
    },

    likes: [{
        type: String
    }],

    comments: [

        {
            userId: String,
            username: String,
            text: String,

            createdAt: {
                type: Date,
                default: Date.now
            }
        }

    ],

    createdAt: {
        type: Date,
        default: Date.now
    }

});

const User = mongoose.model("User", userSchema);

const Post = mongoose.model("Post", postSchema);

/* =========================
   PAGE ROUTES
========================= */

/*
   NOW SIGNUP PAGE OPENS FIRST
*/

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "signup.html")
    );

});

/*
   LOGIN PAGE
*/

app.get("/login", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "signin.html")
    );

});

/*
   SIGNUP PAGE
*/

app.get("/signup", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "signup.html")
    );

});

/*
   HOME PAGE AFTER LOGIN
*/

/* =========================
   UPDATE PROFILE PIC
========================= */

app.post(
    "/upload-profile-pic",
    upload.single("profilePic"),

    async (req, res) => {

        try {

            const { userId } = req.body;

            const user = await User.findById(userId);

            if (!user) {

                return res.status(404).json({
                    error: "User not found"
                });

            }

            if (req.file) {

                user.profilePic =
                    `/uploads/${req.file.filename}`;

                await user.save();

            }

            res.json({
                success: true,
                profilePic: user.profilePic
            });

        }

        catch (err) {

            res.status(500).json({
                error: err.message
            });

        }

    }
);

/*
   PROFILE PAGE
*/

app.get("/profile", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "profile.html")
    );

});
app.get("/all-posts", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "AllPosts.html")
    );

});

app.get("/home", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "home.html")
    );

});

/*
   FOLLOWERS PAGE
*/

app.get("/followers", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "followers.html")
    );

});

/*
   FOLLOWING PAGE
*/

app.get("/following", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "following.html")
    );

});

/* =========================
   SIGNUP API
========================= */

app.post("/signup", async (req, res) => {

    try {

        const {
            name,
            username,
            email,
            password,
            bio
        } = req.body;

        if (
            !name ||
            !username ||
            !email ||
            !password
        ) {

            return res.json({
                success: false,
                message: "Fill all fields"
            });

        }

        const existingUser = await User.findOne({

            $or: [
                { email },
                { username }
            ]

        });

        if (existingUser) {

            return res.json({
                success: false,
                message: "User already exists"
            });

        }

        const hashedPassword =
        await bcrypt.hash(password, 10);

        const user = await User.create({

            name,
            username,
            email,
            password: hashedPassword,
            bio

        });

        const token = jwt.sign(

            {
                id: user._id
            },

            process.env.JWT_SECRET || "secret"

        );

        res.json({

            success: true,

            token,

            user

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

});

/* =========================
   LOGIN API
========================= */

app.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        const user =
        await User.findOne({ email });

        if (!user) {

            return res.json({
                error: "User not found"
            });

        }

        const isMatch =
        await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

            return res.json({
                error: "Wrong password"
            });

        }

        const token = jwt.sign(

            {
                id: user._id
            },

            process.env.JWT_SECRET || "secret"

        );

        res.json({

            token,
            user

        });

    }

    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

/* =========================
   CREATE POST
========================= */

/* =========================
   CREATE POST
========================= */

app.post(
    "/create-post",
    upload.single("media"),

    async (req, res) => {

        try {

            const user =
            await User.findById(req.body.userId);

            if(!user){

                return res.status(404).json({
                    error: "User not found"
                });

            }

            const post =
            await Post.create({

                userId: user._id,

                username: user.username,

                userProfilePic: user.profilePic,

                content: req.body.content,

                media: req.file
                    ? `/uploads/${req.file.filename}`
                    : "",

                mediaType: req.file
                    ? req.file.mimetype
                    : "",

                likes: [],

                comments: []

            });

            res.json({
                success: true,
                post
            });

        }

        catch(err){

            res.status(500).json({
                error: err.message
            });

        }

    }
);


/* =========================
   LIKE POST
========================= */

app.post("/like-post/:id", async (req, res) => {

    try {

        const { userId } = req.body;

        const post =
        await Post.findById(req.params.id);

        if(!post){

            return res.status(404).json({
                error: "Post not found"
            });

        }

        const alreadyLiked =
        post.likes.includes(userId);

        if(alreadyLiked){

            post.likes.pull(userId);

        }

        else{

            post.likes.push(userId);

        }

        await post.save();

        res.json({

            success: true,
            likes: post.likes.length

        });

    }

    catch(err){

        res.status(500).json({
            error: err.message
        });

    }

});

/* =========================
   COMMENT POST
========================= */

app.post("/comment-post/:id", async (req, res) => {

    try {

        const {
            userId,
            username,
            text
        } = req.body;

        const post =
        await Post.findById(req.params.id);

        if(!post){

            return res.status(404).json({
                error: "Post not found"
            });

        }

        post.comments.push({

            userId,
            username,
            text

        });

        await post.save();

        res.json({
            success: true
        });

    }

    catch(err){

        res.status(500).json({
            error: err.message
        });

    }

});
/* =========================
   GET POSTS
========================= */

app.get("/posts", async (req, res) => {

    try {
        
        const posts =
        await Post.find()
        .sort({ createdAt: -1 });

        res.json(posts);

    }

    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

/* =========================
   DELETE POST
========================= */

app.delete("/delete-post/:id", async (req, res) => {

    try {

        const post =
        await Post.findById(req.params.id);

        if (!post) {

            return res.status(404).json({
                error: "Post not found"
            });

        }

        if (post.media) {

            const filePath =
            path.join(__dirname, post.media);

            if (fs.existsSync(filePath)) {

                fs.unlinkSync(filePath);

            }

        }

        await Post.findByIdAndDelete(
            req.params.id
        );

        res.json({
            success: true
        });

    }

    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

/* =========================
   FOLLOW / UNFOLLOW
========================= */

app.post("/follow", async (req, res) => {

    try {

        const {
            currentUserId,
            targetUserId
        } = req.body;

        const currentUser =
        await User.findById(currentUserId);

        const targetUser =
        await User.findById(targetUserId);

        if (!currentUser || !targetUser) {

            return res.status(404).json({
                error: "User not found"
            });

        }

        const isFollowing =
        currentUser.following.includes(
            targetUserId
        );

        if (isFollowing) {

            currentUser.following.pull(
                targetUserId
            );

            targetUser.followers.pull(
                currentUserId
            );

        }

        else {

            currentUser.following.push(
                targetUserId
            );

            targetUser.followers.push(
                currentUserId
            );

        }

        await currentUser.save();

        await targetUser.save();

        res.json({

            following: !isFollowing

        });

    }

    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

/* =========================
   SEND FOLLOW REQUEST
========================= */

app.post("/send-follow-request", async (req, res) => {

    try {

        const {
            currentUserId,
            targetUserId
        } = req.body;

        const targetUser =
        await User.findById(targetUserId);

        if(!targetUser){

            return res.status(404).json({
                error: "User not found"
            });

        }

        if(
            targetUser.followRequests.includes(currentUserId)
        ){

            return res.json({
                message: "Already requested"
            });

        }

        targetUser.followRequests.push(currentUserId);

        await targetUser.save();

        res.json({
            success: true
        });

    }

    catch(err){

        res.status(500).json({
            error: err.message
        });

    }

});

/* =========================
   ACCEPT FOLLOW REQUEST
========================= */

app.post("/accept-follow-request", async (req, res) => {

    try {

        const {
            currentUserId,
            requesterId
        } = req.body;

        const currentUser =
        await User.findById(currentUserId);

        const requester =
        await User.findById(requesterId);

        if(!currentUser || !requester){

            return res.status(404).json({
                error: "User not found"
            });

        }

        currentUser.followRequests.pull(requesterId);

        currentUser.followers.push(requesterId);

        requester.following.push(currentUserId);

        await currentUser.save();

        await requester.save();

        res.json({
            success: true
        });

    }

    catch(err){

        res.status(500).json({
            error: err.message
        });

    }

});

/* =========================
   GET FOLLOWERS
========================= */

// app.get("/followers/:id", async (req, res) => {

//     try {

//         const user =
//         await User.findById(req.params.id)
//         .populate("followers");

//         res.json(user.followers);

//     }

//     catch (err) {

//         res.status(500).json({
//             error: err.message
//         });

//     }

// });

/* =========================
   GET FOLLOWING
========================= */

app.get("/following-users/:id", async (req, res) => {

    try {

        const user =
        await User.findById(req.params.id)
        .populate("following");

        res.json(user.following);

    }

    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


/* =========================
   GET USER PROFILE
========================= */

app.get("/user/:id", async (req, res) => {

    try {

        const user =
        await User.findById(req.params.id);

        if(!user){

            return res.status(404).json({
                error: "User not found"
            });

        }

        const posts =
        await Post.find({
            userId: user._id
        }).sort({ createdAt: -1 });

        res.json({
            user,
            posts
        });

    }

    catch(err){

        res.status(500).json({
            error: err.message
        });

    }

});

app.get("/follow-status/:targetId/:currentId", async (req, res) => {

    try {

        const targetUser = await User.findById(req.params.targetId);

        const isFollowing = targetUser.followers.some(
            id => id.toString() === req.params.currentId
        );

        res.json({
            isFollowing
        });

    } catch(err) {
        res.status(500).json({ error: err.message });
    }

});
/* =========================
   START SERVER
========================= */

/* =========================
   GET FOLLOWERS USERS (FIX FOR FRONTEND)
========================= */

app.get("/followers-users/:id", async (req, res) => {

    try {

        const user = await User.findById(req.params.id)
            .populate("followers", "name username profilePic");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user.followers);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   GET FOLLOWING USERS (KEEP SAME STYLE)
========================= */

app.get("/following-users/:id", async (req, res) => {

    try {

        const user = await User.findById(req.params.id)
            .populate("following", "name username profilePic");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user.following);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(8080, () => {

    console.log(
        "Running 🚀 http://localhost:8080"
    );

});