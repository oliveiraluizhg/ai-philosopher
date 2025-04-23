# AI Philosopher

A modern AI-powered philosophical assistant that combines classical wisdom with contemporary understanding. Built with TypeScript, Express, and LangChain, this application provides philosophical insights.

## Features

- **Stoic Wisdom**: Get personalized philosophical advice based on Stoic principles
- **RAG Implementation**: Uses Retrieval Augmented Generation with classical philosophical books

## Prerequisites

- Node.js >= 23.10.0
- OpenAI API key
- Classical philosophical books (included in the `src/data/books` directory)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ai-philosopher.git
cd ai-philosopher
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```bash
OPENAI_API_KEY=your_api_key_here
PORT=3000 # Optional, defaults to 3000
```

4. Build the project:

```bash
npm run build
```

## Usage

1. Start the server:

```bash
npm start
```

For development with hot-reloading:

```bash
npm run dev
```

2. The API will be available at `http://localhost:3000`

## API Endpoints

### GET /health

Health check endpoint.

### POST /api/wisdom

Get philosophical wisdom based on Stoic principles.

```json
{
  "query": "How should I deal with failure?"
}
```

## Project Structure

```
ai-philosopher/
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── services/
│   │   ├── aiService.ts
│   │   └── vectorStoreService.ts
│   ├── routes/
│   │   └── api.ts
│   └── main.ts
├── texts/
│   └── meditations.txt
├── dist/
├── node_modules/
├── .env
├── package.json
└── README.md
```

## Future

- Sentiment Analysis: Add mood detection to adapt tone - "This theme has negative sentiment, adjusting to provide comfort rather than challenge."
- Citation Metadata: Include in output - "Source: Meditations by Marcus Aurelius, Book 5, Verse 16."
