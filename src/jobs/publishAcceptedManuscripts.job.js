import cron from "node-cron";
import Manuscript from "../Modules/manuscript/manuscript.model.js";
import sendEmail from "../utils/sendEmail.js";
import { buildPublishedEmail } from "../utils/emailTemplates.js"; // Importing the email template

// Calculate Volume and Issue based on publish date
const getVolumeIssue = (publishDate) => {
  const date = new Date(publishDate);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const baseYear = 2026;
  const volume = year - baseYear + 1;

  let issue = 1;
  let issueLabel = "";

  // Determine the issue number and label based on the quarter
  if (month <= 3) {
    issue = 1;
    issueLabel = "Jan–Mar";
  } else if (month <= 6) {
    issue = 2;
    issueLabel = "Apr–Jun";
  } else if (month <= 9) {
    issue = 3;
    issueLabel = "Jul–Sep";
  } else {
    issue = 4;
    issueLabel = "Oct–Dec";
  }

  return { volume, issue, issueLabel };
};

const CRON_EXPRESSION = "* * * * *"; // Runs every minute
const BATCH_SIZE = 50; // Process 50 manuscripts at a time

let isJobRunning = false;
let cronTask = null;

// Process a single manuscript to update its status and send an email
const processSingleManuscript = async (manuscript, now) => {
  // Use manuscript publish date or current date if not available
  const publishDate = manuscript.publishDate || now;

  // Get calculated volume and issue
  const { volume, issue, issueLabel } = getVolumeIssue(publishDate);

  // Find the last published paper in the same volume and issue to determine the next sequence
  const lastPaper = await Manuscript.findOne({
    volume,
    issue,
    status: "Published",
  })
    .sort({ paperSequence: -1 })
    .select("paperSequence")
    .lean();

  const nextSequence = lastPaper ? lastPaper.paperSequence + 1 : 1;

  // Update manuscript status to "Published"
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
        volume,
        issue,
        issueLabel,
        paperSequence: nextSequence,
        paperNumber: `${volume}.${issue}.${nextSequence}`,
      },
    },
    {
      new: true, // Return the updated document
    }
  );

  // If not updated, skip processing
  if (!updated) {
    return {
      skipped: true,
      manuscriptId: manuscript.manuscriptId,
    };
  }

  const researcher = manuscript.submittedBy;

  // Handle missing researcher email gracefully
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

  // Generate HTML using the imported email template
  const html = buildPublishedEmail(
    researcher.name || "Researcher",
    updated.manuscriptId,
    updated.publishedAt
  );

  try {
    // Send the published notification email
    await sendEmail({
      email: researcher.email,
      subject: `🎉 Congratulations! Your Manuscript ${updated.manuscriptId} is Published`,
      html,
    });

    // Update the record with successful email timestamp
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
    // Log and save email sending error
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

// Main Cron Job Function to fetch and process accepted manuscripts
const runPublishAcceptedManuscriptsJob = async () => {
  // Prevent concurrent executions
  if (isJobRunning) {
    console.warn("⏳ Previous publish cron cycle is still running. Skipping this cycle.");
    return;
  }

  isJobRunning = true;

  try {
    const now = new Date();

    // Fetch accepted manuscripts whose publish date has arrived
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

    // Exit if no manuscripts need publishing
    if (!manuscripts.length) {
      return;
    }

    let publishedCount = 0;
    let emailedCount = 0;
    let skippedCount = 0;

    // Process each manuscript sequentially
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
    // Release the lock
    isJobRunning = false;
  }
};

// Start the Cron Job
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
      timezone: "Asia/Kolkata",
    }
  );

  console.log(`🚀 Publish manuscript cron started with schedule: ${CRON_EXPRESSION}`);

  return cronTask;
};

// Stop the Cron Job safely
export const stopPublishAcceptedManuscriptsJob = () => {
  if (!cronTask) return;

  cronTask.stop();
  cronTask = null;

  console.log("🛑 Publish manuscript cron stopped");
};