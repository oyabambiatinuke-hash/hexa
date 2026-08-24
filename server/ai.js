import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/ai", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions:
        "You are HEXA AI, the intelligent assistant inside HEXA Notes. Be helpful, clear, accurate and friendly.",
      input: message,
    });

    res.json({
      reply: response.output_text,
    });

  } catch (error) {
    console.error("HEXA AI ERROR:", error);

    res.status(500).json({
      error: "HEXA AI could not process the request.",
    });
  }
});

app.listen(3001, () => {
  console.log("HEXA AI is running on http://localhost:3001");
});