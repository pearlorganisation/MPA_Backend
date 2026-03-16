import dotenv from "dotenv";
dotenv.config();
import "./src/config/passport.js";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { startPublishAcceptedManuscriptsJob } from "./src/jobs/publishAcceptedManuscripts.job.js";


// Connect Database
connectDB();

const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startPublishAcceptedManuscriptsJob();
});
