/**
 * BizBook AI Business Assistant Component
 * Grounded in verified database records with zero hallucination
 */

const aiMessages = [
  {
    role: 'assistant',
    text: 'Hello! I am your **BizBook AI Business Assistant**. I analyze your real sales, expenses, and inventory data directly from your verified accounting ledger to answer your business questions with 100% precision.\n\nTap any suggested prompt below or type your question.'
  }
];

function renderAiView() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'AI Business Assistant';

  container.innerHTML = `
    <div class="card" style="max-width: 900px; margin: 0 auto; padding: 0; overflow: hidden;">
      <div class="ai-chat-container" style="height: 680px; border: none; border-radius: 0;">
        <!-- Header -->
        <div class="ai-chat-header">
          <div style="width: 38px; height: 38px; background: var(--blue-primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff;">
            <svg style="width: 22px; height: 22px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <div>
            <div style="font-weight: 800; color: var(--navy-dark); display: flex; align-items: center; gap: 8px;">
              BizBook AI Financial Intelligence
              <span class="ai-badge">Ledger Verified</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Grounded in double-entry books • 0% hallucination</div>
          </div>
        </div>

        <!-- Chat History -->
        <div class="ai-chat-messages" id="ai-messages-list">
          ${aiMessages.map(m => `
            <div class="chat-bubble ${m.role}">
              ${formatAiMarkdown(m.text)}
            </div>
          `).join('')}
        </div>

        <!-- Suggested Prompt Chips -->
        <div class="ai-suggestions">
          <div class="ai-suggestion-chip" onclick="askAiPrompt('What were my sales this month?')">
            📊 Sales this month?
          </div>
          <div class="ai-suggestion-chip" onclick="askAiPrompt('Which product made me the most profit?')">
            🏆 Most profitable product?
          </div>
          <div class="ai-suggestion-chip" onclick="askAiPrompt('Who owes me money?')">
            ⏳ Who owes me money?
          </div>
          <div class="ai-suggestion-chip" onclick="askAiPrompt('Which products are running low?')">
            ⚠️ Low stock products?
          </div>
          <div class="ai-suggestion-chip" onclick="askAiPrompt('Why is my profit lower this month?')">
            💡 Explain my profitability
          </div>
          <div class="ai-suggestion-chip" onclick="askAiPrompt('How much did I spend on transportation?')">
            🚚 Transportation spend?
          </div>
        </div>

        <!-- Input Bar -->
        <form class="ai-input-bar" onsubmit="event.preventDefault(); handleAiSubmit();">
          <input type="text" id="ai-user-input" class="form-control" placeholder="Ask anything about your numbers (e.g. 'How much did I sell today?')..." style="font-size: 0.92rem;">
          <button type="submit" class="btn btn-primary" id="ai-send-btn" style="min-width: 90px;">
            Ask
          </button>
        </form>
      </div>
    </div>
  `;

  scrollAiToBottom();
}

function askAiPrompt(question) {
  const input = document.getElementById('ai-user-input');
  if (input) {
    input.value = question;
    handleAiSubmit();
  }
}

async function handleAiSubmit() {
  const input = document.getElementById('ai-user-input');
  const sendBtn = document.getElementById('ai-send-btn');
  if (!input || !input.value.trim()) return;

  const question = input.value.trim();
  input.value = '';

  // Append user message
  aiMessages.push({ role: 'user', text: question });
  updateAiMessagesView();

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Thinking...';
  }

  try {
    const res = await API.post('/ai/ask', { question });
    aiMessages.push({ role: 'assistant', text: res.answer });
  } catch (err) {
    aiMessages.push({ role: 'assistant', text: `⚠️ Unable to retrieve financial calculation: ${err.message}` });
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Ask';
    }
    updateAiMessagesView();
  }
}

function updateAiMessagesView() {
  const list = document.getElementById('ai-messages-list');
  if (!list) return;

  list.innerHTML = aiMessages.map(m => `
    <div class="chat-bubble ${m.role}">
      ${formatAiMarkdown(m.text)}
    </div>
  `).join('');

  scrollAiToBottom();
}

function scrollAiToBottom() {
  const list = document.getElementById('ai-messages-list');
  if (list) {
    list.scrollTop = list.scrollHeight;
  }
}

function formatAiMarkdown(text) {
  // Convert markdown bolding and bullet points to HTML
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/• (.*)/g, '<li style="margin-left: 18px; margin-bottom: 4px;">$1</li>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
  return html;
}
