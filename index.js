require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { run } = require("./mongoDB");

const PORT = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors({ origin: ["http://localhost:5173","https://camp-aid.netlify.app"], credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("app is running");
});

run(app).catch(console.dir);

app.listen(PORT, () => {
  console.log("app is running on port");
});
