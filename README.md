# RabbitHole 🐇

**Discover knowledge through exploration**

RabbitHole is a beautiful, interactive research tool that transforms your questions into visual knowledge graphs. Enter any query, and watch as it branches out into sources and converges into a comprehensive report.

## 📹 Demo

Watch how RabbitHole works:

<div>
  <a href="https://www.loom.com/share/e9e5de73335b4a349228f65308cbd06c">
    <p>RABBITHOLE - Watch Video</p>
  </a>
  <a href="https://www.loom.com/share/e9e5de73335b4a349228f65308cbd06c">
    <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/e9e5de73335b4a349228f65308cbd06c-e5f5d2a1cdeb156e-full-play.gif#t=0.1" alt="RabbitHole Demo Video">
  </a>
</div>

## What is RabbitHole?

RabbitHole is a web application that helps you explore complex topics by:

- **Visualizing research** as an interactive node graph
- **Connecting sources** to show how information flows
- **Synthesizing findings** into a comprehensive final report
- **Exporting results** as a clean PDF document

Instead of reading through multiple tabs and articles, RabbitHole shows you the big picture at a glance.

## Why RabbitHole?

Research can be overwhelming. When you search for something online, you get:
- Multiple articles to read
- Different perspectives to compare
- Information scattered across websites
- No clear way to see connections

RabbitHole solves this by:
- **Visualizing connections** between sources
- **Showing the research flow** from question to answer
- **Creating a synthesis** so you don't have to piece it together yourself
- **Making it beautiful** with a clean, minimal design

## How It Works

1. **Enter your question** in the search bar (e.g., "Who founded Python?")
2. **RabbitHole searches** the web using Firecrawl API
3. **Sources appear** as nodes connected to your question
4. **A final report** synthesizes all findings at the bottom
5. **Click any node** to read detailed information
6. **Download the report** as a PDF when you're done

The graph shows three levels:
- **Root Node** (top): Your original question
- **Source Nodes** (middle): Websites and articles found
- **Final Report** (bottom): Synthesized answer combining all sources

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (JavaScript runtime)
- A [Firecrawl API key](https://firecrawl.dev) (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd rabbit-hole
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up your API key**
   
   Create a `.env` file in the root directory:
   ```env
   FIRECRAWL_API_KEY=your-api-key-here
   ```

4. **Start the backend server**
   ```bash
   bun server.ts
   ```
   
   The server will run on `http://localhost:3000`

5. **Start the frontend** (in a new terminal)
   ```bash
   bun run dev
   ```
   
   The app will open at `http://localhost:5173`

### Usage

1. Open `http://localhost:5173` in your browser
2. Type your research question in the search bar
3. Click "Explore" or press Enter
4. Wait for the graph to appear (usually 15-30 seconds)
5. Click any node to read more details
6. Click the Final Report node to see the synthesized answer
7. Download the PDF if you want to save it

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Graph Visualization**: React Flow (@xyflow/react)
- **Backend**: Bun server
- **API**: Firecrawl (web scraping and search)
- **Styling**: Tailwind CSS
- **PDF Export**: jsPDF + html2canvas

## Project Structure

```
rabbit-hole/
├── src/
│   ├── components/
│   │   └── ResearchGraph.tsx  # Main graph component
│   ├── lib/
│   │   └── graph-utils.ts     # Graph transformation logic
│   └── index.css              # Global styles
├── server.ts                  # Bun backend server
└── package.json
```

## Features

- ✅ Interactive node graph visualization
- ✅ Real-time web research using Firecrawl
- ✅ Markdown content extraction
- ✅ Beautiful, minimal UI design
- ✅ PDF export functionality
- ✅ Responsive layout
- ✅ Dark theme

