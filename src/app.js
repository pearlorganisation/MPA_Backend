import userRoutes from "./Modules/user/user.routes.js";
import manuscriptRoutes from "./Modules/manuscript/manuscript.routes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://mpa-admin-pannel.vercel.app",
      "http://localhost:3001",
      "https://mpa-frontend-dun.vercel.app"
    ], // frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/manuscripts", manuscriptRoutes);

// Default Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is Working Correctly",
  });
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR MIDDLEWARE:", err);

  res.status(500).json({
    success: false,
    message: err.message,
    stack: err.stack,
  });
});

export default app;
