// === CONFIG (LOCAL USE ONLY) ===
const OPENAI_API_KEY = "sk-xxxxxxxxxxxxxxxxxxxxxxxx"; // Replace with your real key

// === DOM Elements ===
const chatButton = document.getElementById("chat-button");
const chatContainer = document.getElementById("chat-container");
const closeChatBtn = document.getElementById("close-chat");
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");

// Case 1: Image-only
const imageOnlyInput = document.getElementById("image-only-input");
const imageOnlySubmit = document.getElementById("image-only-submit");

// Case 2: Text-only (already above)
// Case 3: Both image + text
const bothImageInput = document.getElementById("both-image-input");
const bothTextInput = document.getElementById("both-text-input");
const bothSubmit = document.getElementById("both-submit");

// === Chat Toggle ===
chatButton.addEventListener("click", () => {
  const isHidden = chatContainer.classList.toggle("hidden");
  chatButton.setAttribute("aria-expanded", !isHidden);
  if (!isHidden) userInput.focus();
});

closeChatBtn.addEventListener("click", () => {
  chatContainer.classList.add("hidden");
  chatButton.setAttribute("aria-expanded", false);
});

// === Helpers ===
function appendMessage(text, sender = "bot") {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");
  messageDiv.classList.add(sender === "bot" ? "bot-message" : "user-message");
  messageDiv.textContent = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendUserImage(base64) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", "user-message");
  const img = document.createElement("img");
  img.src = base64;
  img.alt = "Uploaded query image";
  img.style.maxWidth = "150px";
  img.style.borderRadius = "12px";
  img.style.marginTop = "0.3rem";
  messageDiv.appendChild(img);
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// === Core AI Request ===
async function askAI(messageContent) {
  appendMessage("⏳ Thinking...", "bot");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // supports text + images
        messages: [
          {
            role: "system",
            content:
              "You are Terra Tech assistant. Only answer agriculture-related questions. If the question is unrelated, politely say you only assist with farming.",
          },
          {
            role: "user",
            content: messageContent,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    // Remove "Thinking..." message
    const thinkingMsg = [...chatBox.children].find(
      (div) => div.textContent === "⏳ Thinking..."
    );
    if (thinkingMsg) chatBox.removeChild(thinkingMsg);

    if (data.choices && data.choices.length > 0) {
      appendMessage(data.choices[0].message.content.trim(), "bot");
    } else {
      appendMessage("⚠️ Sorry, I could not process your request.", "bot");
    }
  } catch (error) {
    console.error(error);
    appendMessage("❌ Error connecting to AI service.", "bot");
  }
}

// === Case 2: Text-only ===
sendButton.addEventListener("click", async () => {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  userInput.value = "";

  await askAI([{ type: "text", text }]);
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendButton.click();
});

// === Case 1: Image-only ===
imageOnlySubmit.addEventListener("click", async () => {
  if (!imageOnlyInput.files || imageOnlyInput.files.length === 0) {
    alert("Please upload an image for your query.");
    return;
  }
  const base64Image = await fileToBase64(imageOnlyInput.files[0]);

  appendUserImage(base64Image);
  imageOnlyInput.value = "";

  await askAI([{ type: "image_url", image_url: { url: base64Image } }]);
});

// === Case 3: Text + Image ===
bothSubmit.addEventListener("click", async () => {
  if (
    (!bothImageInput.files || bothImageInput.files.length === 0) &&
    !bothTextInput.value.trim()
  ) {
    alert("Please upload an image and/or enter text for your query.");
    return;
  }

  let messageContent = [];
  const text = bothTextInput.value.trim();
  if (text) {
    messageContent.push({ type: "text", text });
    appendMessage(text, "user");
    bothTextInput.value = "";
  }
  if (bothImageInput.files && bothImageInput.files.length > 0) {
    const base64Image = await fileToBase64(bothImageInput.files[0]);
    messageContent.push({ type: "image_url", image_url: { url: base64Image } });
    appendUserImage(base64Image);
    bothImageInput.value = "";
  }

  await askAI(messageContent);
});
