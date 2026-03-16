import cron from "node-cron";
import Manuscript from "../Modules/manuscript/manuscript.model.js";
import sendEmail from "../utils/sendEmail.js";

const CRON_EXPRESSION = "* * * * *";
const BATCH_SIZE = 50;

let isJobRunning = false;
let cronTask = null;

const buildPublishedEmailTemplate = ({ researcherName, manuscriptId, publishedAt }) => {
  return `
    <h2>Manuscript Published</h2>
    <p>Dear ${researcherName || "Researcher"},</p>
    <p>Your manuscript <b>${manuscriptId}</b> has been published successfully.</p>
    <p><b>Published At:</b> ${new Date(publishedAt).toLocaleString()}</p>
    <br/>
    <p>Congratulations!</p>
    <p><b>Editorial Team</b></p>
  `;
};

const processSingleManuscript = async (manuscript, now) => {
  // Atomic update to avoid duplicate publish
  const updated = await Manuscript.findOneAndUpdate(
    {
      _id: manuscript._id,
      status: "Accepted",
      publishDate: { $lte: now },
      publishedAt: null,
    },
    {
      $set: {
        status: "Published",
        publishedAt: now,
      },
    },
    {
      new: true,
    }
  );

  if (!updated) {
    return {
      skipped: true,
      manuscriptId: manuscript.manuscriptId,
    };
  }

  const researcher = manuscript.submittedBy;

  if (!researcher?.email) {
    console.warn(
      `⚠️ Manuscript published but researcher email not found: ${updated.manuscriptId}`
    );

    return {
      skipped: false,
      emailed: false,
      manuscriptId: updated.manuscriptId,
    };
  }

  const html = buildPublishedEmailTemplate({
    researcherName: researcher.name,
    manuscriptId: updated.manuscriptId,
    publishedAt: updated.publishedAt,
  });

  try {
    await sendEmail({
      email: researcher.email,
      subject: `Manuscript Published: ${updated.manuscriptId}`,
      html,
    });

    await Manuscript.updateOne(
      { _id: updated._id },
      {
        $set: {
          emailSentAt: new Date(),
          lastEmailError: null,
        },
      }
    );

    return {
      skipped: false,
      emailed: true,
      manuscriptId: updated.manuscriptId,
    };
  } catch (error) {
    await Manuscript.updateOne(
      { _id: updated._id },
      {
        $set: {
          lastEmailError: error.message || "Unknown email error",
        },
      }
    );

    console.error(
      `❌ Email failed for manuscript ${updated.manuscriptId}:`,
      error.message
    );

    return {
      skipped: false,
      emailed: false,
      manuscriptId: updated.manuscriptId,
    };
  }
};

const runPublishAcceptedManuscriptsJob = async () => {
  if (isJobRunning) {
    console.warn("⏳ Previous publish cron cycle is still running. Skipping this cycle.");
    return;
  }

  isJobRunning = true;

  try {
    const now = new Date();

    const manuscripts = await Manuscript.find({
      status: "Accepted",
      publishDate: { $lte: now },
      publishedAt: null,
    })
      .select("_id manuscriptId submittedBy publishDate")
      .populate("submittedBy", "name email")
      .sort({ publishDate: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (!manuscripts.length) {
      return;
    }

    let publishedCount = 0;
    let emailedCount = 0;
    let skippedCount = 0;

    for (const manuscript of manuscripts) {
      const result = await processSingleManuscript(manuscript, now);

      if (result.skipped) {
        skippedCount += 1;
        continue;
      }

      publishedCount += 1;

      if (result.emailed) {
        emailedCount += 1;
      }

      console.log(`✅ Manuscript published: ${result.manuscriptId}`);
    }

    console.log(
      `📝 Publish cron summary -> published: ${publishedCount}, emailed: ${emailedCount}, skipped: ${skippedCount}`
    );
  } catch (error) {
    console.error("❌ Publish cron job error:", error.message);
  } finally {
    isJobRunning = false;
  }
};

export const startPublishAcceptedManuscriptsJob = () => {
  if (cronTask) {
    console.warn("⚠️ Publish manuscript cron is already running.");
    return cronTask;
  }

  cronTask = cron.schedule(
    CRON_EXPRESSION,
    async () => {
      await runPublishAcceptedManuscriptsJob();
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  console.log(`🚀 Publish manuscript cron started with schedule: ${CRON_EXPRESSION}`);

  return cronTask;
};

export const stopPublishAcceptedManuscriptsJob = () => {
  if (!cronTask) return;

  cronTask.stop();
  cronTask = null;

  console.log("🛑 Publish manuscript cron stopped");
};