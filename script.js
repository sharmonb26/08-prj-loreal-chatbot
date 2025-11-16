/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Cloudflare Worker URL
const WORKER_URL = "https://lorealchatbot.sharmonb.workers.dev";

// Store conversation history to maintain context
const conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful L'Oréal beauty advisor. You ONLY answer questions about L'Oréal products, skincare routines, haircare routines, makeup applications, and beauty advice. If someone asks about anything unrelated to L'Oréal products or beauty (such as math, general knowledge, coding, sports, etc.), politely decline and remind them that you can only help with L'Oréal beauty products and routines. Keep responses concise and helpful.",
  },
];

// Set initial message
chatWindow.innerHTML =
  '<div class="msg ai">👋 Hello! How can I help you today?</div>';

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get the user's question
  const userQuestion = userInput.value.trim();

  // Don't submit if empty
  if (!userQuestion) return;

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userQuestion,
  });

  // Add user message to chat window (keep all previous messages)
  chatWindow.innerHTML += `<div class="msg user">${userQuestion}</div>`;

  // Clear the input field
  userInput.value = "";

  // Show loading message
  chatWindow.innerHTML += `<div class="msg ai">Thinking...</div>`;

  // Auto-scroll to bottom to show latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    console.log("Sending request to:", WORKER_URL);
    console.log("With messages:", conversationHistory);

    // Send request to Cloudflare Worker (which securely calls OpenAI API)
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
      }),
    });

    console.log("Response status:", response.status);

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Worker response error:", errorText);
      throw new Error(`Worker error: ${response.status}`);
    }

    // Parse the response
    const data = await response.json();
    console.log("Response from worker:", data);

    // Check if there's an error in the response
    if (data.error) {
      console.error("OpenAI API Error:", data.error);
      throw new Error(data.error.message || "API returned an error");
    }

    // Check if we got a valid response
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Invalid response structure:", data);
      throw new Error("Invalid response from API");
    }

    // Get the AI's response from the data
    const aiResponse = data.choices[0].message.content;

    // Add AI response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    // Replace "Thinking..." with actual AI response
    const messages = chatWindow.querySelectorAll(".msg");
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.textContent === "Thinking...") {
      lastMessage.textContent = aiResponse;
    }

    // Auto-scroll to bottom to show latest message
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    // Handle any errors - replace "Thinking..." with error message
    const messages = chatWindow.querySelectorAll(".msg");
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.textContent === "Thinking...") {
      lastMessage.textContent =
        "Sorry, there was an error connecting to the API. Please try again.";
    }
    console.error("Error details:", error);
  }
});
