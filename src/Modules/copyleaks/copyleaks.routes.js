import express from "express";
import Manuscript from "../manuscript/manuscript.model.js";

const router = express.Router();

router.post("/webhook/:status", async (req, res) => {
    try {
        const status = req.params.status;
        const scanId = req.body.scanId;

        console.log("Webhook:", status);
        console.log("FULL BODY:", req.body);

        if (!scanId) return res.send("No scanId");

        if (status === "completed") {
            const score = req.body.results?.internet?.percent || 0;

            await Manuscript.findOneAndUpdate(
                { scanId },
                {
                    plagiarismScore: score,
                    plagiarismStatus: "completed",
                }
            );
        }

        res.send("OK");
    } catch (err) {
        console.error(err);
        res.send("Error");
    }
});

export default router;