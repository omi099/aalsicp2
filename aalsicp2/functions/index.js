const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const serverless = require("serverless-http");
const router = express.Router();

const app = express();

app.set("views", "views");
app.set("view engine", "ejs");
app.engine("ejs", require("ejs").__express);

const TOKEN_ENV_NAME = "TOKEN";

const readTokenFromFile = () => {
  return process.env[TOKEN_ENV_NAME];
};

const writeTokenToFile = (token) => {
  process.env[TOKEN_ENV_NAME] = token;
  console.log("Token written to environment variable successfully.");
};

const removeTokenFromFile = () => {
  delete process.env[TOKEN_ENV_NAME];
  console.log("Token removed from environment variable successfully.");
};

router.get("/.netlify/functions/index", async (req, res) => {
  const token = readTokenFromFile();

  if (token) {
    setTimeout(async () => {
      removeTokenFromFile();
      const newToken = await generateNewToken();
      res.render("index", { token: newToken });
    }, 5000);

    return res.render("index", { token });
  }

  const newToken = await generateNewToken();
  return res.render("index", { token: newToken });
});

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
module.exports = app;
module.exports.handler = serverless(app);
