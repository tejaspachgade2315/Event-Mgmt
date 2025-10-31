const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

async function login(req, res) {
  try {
    const { name, password } = req.body;
    if (!name) return res.status(400).send("name is required");

    const user = await User.findOne({ name });
    if (!user) {
      return res.status(400).send("User not found");
    }

    if (user.password) {
      if (!password) {
        return res.status(400).send("password is required for this account");
      }
      const matched = await bcrypt.compare(password, user.password);
      if (!matched) {
        return res.status(400).send("Invalid credentials");
      }
    } else {
      return res.status(400).send("This account has no password. Ask an admin to set one.");
    }

    const tokenData = {
      userId: user._id,
      isAdmin: !!user.isAdmin,
      name: user.name
    };

    const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: '1d' });

    const response = {
      message: "Login successful",
      success: true,
      token
    };

    res.setHeader("Authorization", "Bearer " + token);
    return res.status(200).send(response);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
}

const register = async (req, res) => {
  try {
    const loggedInUser = req.user;
    const user = await User.findById(loggedInUser.userId);
    console.log(loggedInUser)
    if (!user) {
      return res.status(404).send("User not found");
    }
    console.log(!loggedInUser.isAdmin)
    if (!loggedInUser.isAdmin) {
      console.log("Hello")
      return res.status(403).send("Unauthorized");
    }

    const { name, isAdmin = false, password } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).send("name is required");
    }

    if (isAdmin === true && !password) {
      return res.status(400).send("password is required for admin accounts");
    }

    const existingUser = await User.findOne({ name: name.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    let hashedPassword = undefined;
    if (password) {
      const salt = await bcrypt.genSalt(12);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const newUser = new User({
      name,
      isAdmin: !!isAdmin,
      password: hashedPassword
    });

    const savedUser = await newUser.save();
    if (!savedUser) {
      return res.status(500).send("User registration failed. Please try again.");
    }

    const userObj = savedUser.toObject();
    delete userObj.password;

    res.status(201).json({
      message: "User created successfully",
      user: userObj
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }, '-password').lean();
    res.status(200).json({ users });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { login, register, getAllUsers };
