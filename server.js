import dotenv from "dotenv";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";

dotenv.config();

// Connect Database
connectDB();

const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
