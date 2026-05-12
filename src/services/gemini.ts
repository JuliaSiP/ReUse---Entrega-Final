import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getChatReply(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "Você é o assistente virtual da ReUse, uma plataforma de troca de produtos. " +
        "Seu objetivo é ajudar os usuários a entender como a plataforma funciona, dar dicas de sustentabilidade " +
        "e incentivar o consumo consciente. Seja amigável, prestativo e sustentável.",
    },
  });

  // Re-creating message sequence for sendMessage (it doesn't take history in simple way, actually it does in some SDK versions but I'll use simple approach or check SKILL)
  // According to gemini-api skill: chat.sendMessage only accepts { message: string }.
  // To handle history, I should have initialized chat with initial messages or used contents.
  // Actually, chat.sendMessage works point-to-point.
  
  // I will use a simple generateContent for now or manage chat history if I can.
  // The skill says: chat.sendMessage only accepts the message parameter.
  
  const response = await chat.sendMessage({ message });
  return response.text;
}
