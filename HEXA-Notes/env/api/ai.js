import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { message } = req.body;

    const response = await client.responses.create({
      model: "gpt-5.6",
      input: message,
    });

    res.status(200).json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "HEXA AI failed to respond.",
    });
  }
} 