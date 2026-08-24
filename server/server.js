import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

const PORT = 3001;

// =====================================================
// HEXA AI CONFIGURATION
// =====================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cheapest suitable model for HEXA writing tasks.
// Change this one line later if you want a stronger model.
const AI_MODEL = "gpt-5.4-nano";

// Safety limits
const MAX_PROMPT_LENGTH = 2000;
const MAX_DOCUMENT_LENGTH = 12000;
const MAX_OUTPUT_TOKENS = 500;

// Simple in-memory rate limiter
const requests = new Map();

const MAX_REQUESTS_PER_MINUTE = 5;

function allowedRequest(ip) {
  const now = Date.now();
  const minute = 60 * 1000;

  const previous = requests.get(ip) || [];

  const recent = previous.filter(
    timestamp => now - timestamp < minute
  );

  if (recent.length >= MAX_REQUESTS_PER_MINUTE) {
    requests.set(ip, recent);
    return false;
  }

  recent.push(now);
  requests.set(ip, recent);

  return true;
}

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({
    app: "HEXA Foundation AI",
    status: "online",
    model: AI_MODEL,
  });
});

// =====================================================
// AI ENDPOINT
// =====================================================

app.post("/api/ai", async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown";

    // -------------------------------------------------
    // RATE LIMIT
    // -------------------------------------------------

    if (!allowedRequest(ip)) {
      return res.status(429).json({
        error:
          "HEXA AI is temporarily limiting requests. Please wait a minute and try again.",
      });
    }

    // -------------------------------------------------
    // READ REQUEST
    // -------------------------------------------------

    let {
      prompt = "",
      documentTitle = "",
      documentContent = "",
    } = req.body || {};

    prompt = String(prompt).trim();
    documentTitle = String(documentTitle).trim();
    documentContent = String(documentContent).trim();

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!prompt) {
      return res.status(400).json({
        error: "Please tell HEXA AI what you want it to create.",
      });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({
        error:
          `Your AI instruction is too long. Please keep it under ${MAX_PROMPT_LENGTH} characters.`,
      });
    }

    // Prevent enormous documents from consuming tokens
    if (documentContent.length > MAX_DOCUMENT_LENGTH) {
      documentContent =
        documentContent.substring(0, MAX_DOCUMENT_LENGTH) +
        "\n\n[Document truncated for cost protection.]";
    }

    // -------------------------------------------------
    // BUILD A SMALL, EFFICIENT PROMPT
    // -------------------------------------------------

    const systemPrompt = `
You are HEXA AI, the writing assistant inside HEXA Foundation.

Help users with:
- professional documents
- reports
- letters
- proposals
- summaries
- academic writing
- grammar improvement
- conclusions
- introductions

Be concise and useful.

Do not explain your reasoning.
Do not repeat the user's instructions.
Return only the useful result.

If the user asks for a section of a document, write that section directly.
`;

    const userPrompt = `
Task:
${prompt}

Document title:
${documentTitle || "Untitled Document"}

Existing document:
${documentContent || "[No existing content]"}
`;

    // -------------------------------------------------
    // OPENAI REQUEST
    // -------------------------------------------------

    const response = await openai.responses.create({
      model: AI_MODEL,

      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],

      // IMPORTANT:
      // Prevents unnecessarily large responses.
      max_output_tokens: MAX_OUTPUT_TOKENS,

      // Avoid expensive reasoning for simple writing tasks.
      reasoning: {
        effort: "none",
      },
    });

    // -------------------------------------------------
    // RETURN RESULT
    // -------------------------------------------------

    const text =
      response.output_text?.trim() ||
      "HEXA AI did not return any text.";

    res.json({
      success: true,
      text,
      model: AI_MODEL,
    });

  } catch (error) {

    console.error("HEXA AI ERROR:", error);

    // -------------------------------------------------
    // HANDLE NO-CREDIT ERROR
    // -------------------------------------------------

    if (
      error?.status === 429 ||
      error?.code === "insufficient_quota"
    ) {
      return res.status(429).json({
        error:
          "HEXA AI has no API credits available. Add API credits to continue using AI.",
      });
    }

    // -------------------------------------------------
    // HANDLE API RATE LIMIT
    // -------------------------------------------------

    if (
      error?.status === 429
    ) {
      return res.status(429).json({
        error:
          "HEXA AI is temporarily busy. Please wait a moment and try again.",
      });
    }

    // -------------------------------------------------
    // GENERAL ERROR
    // -------------------------------------------------

    res.status(500).json({
      error:
        "HEXA AI could not complete the request. Please try again.",
    });
  }
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("        HEXA FOUNDATION AI");
  console.log("======================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Model:  ${AI_MODEL}`);
  console.log("Status: ONLINE");
  console.log("======================================");
  console.log("");
});