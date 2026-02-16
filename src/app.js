import userRoutes from "./Modules/user/user.routes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000","https://mpa-admin-pannel.vercel.app"], // frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//Routes
app.use("/api/v1/users", userRoutes);

// Default Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is Working Correctly",
  });
});

export default app;
