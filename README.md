# Delphi

> **Think Deeper, Clearer, Better.**

Delphi is a modern, AI-powered thinking companion designed to help you "Know Thyself." Unlike traditional chatbots, Delphi acts as a "human soul inquisitor," using first-principles thinking to challenge your assumptions, expose cognitive biases, and push you toward deeper self-reflection.

## ✨ Features

- **Philosophical Depth**: Specialized system prompting that avoids small talk and dives straight into meaningful inquiry.
- **Liquid Glass UI**: A premium, minimalistic interface with smooth Framer Motion animations and "liquid glass" visual effects.
- **Mobile Optimized**: Custom viewport handling and responsive design for a seamless experience on any device.
- **Streaming Responses**: Real-time message streaming for a natural conversation flow.
- **Privacy First**: Deployed on Netlify with serverless functions to keep your API keys secure.

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Styling**: [Vanilla CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) + [Framer Motion](https://www.framer.com/motion/)
- **Backend**: [Netlify Functions](https://www.netlify.com/products/functions/) (TypeScript)
- **AI Engine**: [OpenRouter](https://openrouter.ai/) (supporting Claude 3.5 Sonnet and other LLMs)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A [Netlify](https://www.netlify.com/) account
- An [OpenRouter](https://openrouter.ai/) API Key

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/delphi.git
   cd delphi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add your OpenRouter API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENROUTER_API_KEY
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

### Deployment

Deploying to Netlify is the easiest way to get Delphi live:

1. Push your code to GitHub.
2. Connect your repo to Netlify.
3. Add the `OPENROUTER_API_KEY` to your environment variables in the Netlify Dashboard (**Site Settings > Build & deploy > Environment variables**).
4. Netlify will automatically detect the `netlify.toml` and deploy your app.

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

Crafted with ❤️ by [Jimmy Zhang](https://jimmyzhang.org).
