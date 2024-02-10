const express = require("express");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const serverless = require('serverless-http');
const router = express.Router()
const ejs = require('ejs')

const app = express();

app.use(express.static(path.join(__dirname)));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const TOKEN_FILE_PATH = path.join(__dirname, "token.txt");

// Function to read the token from the file
const readTokenFromFile = () => {
  try {
    const token = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
    return token;
  } catch (error) {
    console.error(`Error reading token from file: ${error.message}`);
    return null;
  }
};

// Function to write a new token to the file
const writeTokenToFile = (token) => {
  try {
    fs.writeFileSync(TOKEN_FILE_PATH, token, "utf-8");
    console.log("Token written to file successfully.");
  } catch (error) {
    console.error(`Error writing token to file: ${error.message}`);
  }
};

// Function to generate a new token
const generateToken = () => {
  const payload = {
    // Add any additional payload data if needed
  };

  const options = {
    expiresIn: "7d", // Token expiration in 5 seconds
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

// Function to remove the token from the file
const removeTokenFromFile = () => {
  try {
    fs.unlinkSync(TOKEN_FILE_PATH);
    console.log("Token removed from file successfully.");
  } catch (error) {
    console.error(`Error removing token from file: ${error.message}`);
  }
};

router.get("/", async (req, res) => {
  // Check if the token file exists
  if (fs.existsSync(TOKEN_FILE_PATH)) {
    const token = readTokenFromFile();

    if (token) {
      // Schedule the token removal and generation after 5 seconds
      setTimeout(async () => {
        // Remove the token from the file
        removeTokenFromFile();

        // Generate a new token
        const newToken = await generateNewToken();

        // Render the index page with the new token
        res.render("views/index.ejs", { token: newToken });
      }, 5000);

      return res.render("index.ejs", { token });
    }
  }

  // If no token or file doesn't exist, generate a new token
  const newToken = await generateNewToken();

  // Render the index page with the new token
  return res.render("index.ejs", { token: newToken });
});

// Function to generate a new token and handle file writing
const generateNewToken = async () => {
  const refreshToken = process.env.REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("Refresh token not found in environment variables.");
  }

  const headers = {
    Host: "api.classplusapp.com",
    "user-agent": "Mobile-Android",
    "app-version": "1.4.45.1",
    "api-version": "21",
    "device-id": "123",
    "device-details": "real",
    region: "IN",
    "accept-language": "EN",
    "content-type": "application/json; charset=UTF-8",
    "accept-encoding": "gzip",
  };

  const data = {
    refreshToken: refreshToken,
    orgId: 298976,
  };

  try {
    const response = await axios.post(
      "https://api.classplusapp.com/users/refreshAccessToken",
      data,
      { headers }
    );

    if (response.status === 200) {
      const token = response.data.data.token;

      if (token) {
        const tokenStartIndex = token.indexOf("eyJ");
        if (tokenStartIndex !== -1) {
          const formattedToken = token.slice(tokenStartIndex);

          // Write the new token to the file
          writeTokenToFile(formattedToken);

          return formattedToken;
        } else {
          throw new Error(
            "Token starting with 'eyJ' not found in the response."
          );
        }
      } else {
        throw new Error("Token not found in the response.");
      }
    } else {
      throw new Error(`Request failed with status code: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Error: ${error.message}`);
  }
};

// Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

app.use('/.netlify/functions/index', router);
module.exports.handler = serverless(app);
