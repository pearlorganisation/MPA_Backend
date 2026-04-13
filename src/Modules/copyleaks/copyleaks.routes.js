import express from "express";
import Manuscript from "../manuscript/manuscript.model.js";

const router = express.Router();

router.post("/webhook/:status", async (req, res) => {
    try {
        const status = req.params.status;

        const scanId = req.body?.scannedDocument?.scanId;

        if (!scanId) return res.status(400).send("No scanId");

        if (status === "completed") {
            const score = req.body.results?.score?.aggregatedScore || 0;

            //  update + return updated doc
            const updated = await Manuscript.findOneAndUpdate(
                { scanId },
                {
                    plagiarismScore: score,
                    plagiarismStatus: "completed",
                },
                { new: true } 
            );

            console.log("UPDATED DOC:", updated);
        }

        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error");
    }
});

export default router;