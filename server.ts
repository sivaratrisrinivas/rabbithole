import { serve } from "bun";

const API_KEY = process.env.FIRECRAWL_API_KEY;

console.log("🐇 RabbitHole Server running on http://localhost:3000");

serve({
  port: 3000,
  async fetch(req) {
    // Handle CORS
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(req.url);

    if (url.pathname === "/api/research" && req.method === "POST") {
      try {
        const { query } = await req.json();
        console.log(`Received query: ${query}`);

        if (!API_KEY) {
          return new Response(JSON.stringify({ error: "No API Key found" }), {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }

        // Call Firecrawl Search API
        const firecrawlResponse = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query,
            limit: 10,
            scrapeOptions: {
              formats: ["markdown"]
            }
          }),
        });

        if (!firecrawlResponse.ok) {
          const err = await firecrawlResponse.text();
          console.error("Firecrawl Error:", err);
          return new Response(JSON.stringify({ error: err }), { 
            status: firecrawlResponse.status,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }

        const data = await firecrawlResponse.json();
        
        // Log response structure for debugging
        console.log("Firecrawl response structure:", {
          hasSuccess: 'success' in data,
          hasData: 'data' in data,
          hasWeb: data.data && 'web' in data.data,
          sourcesCount: data.data?.web?.length || data.data?.length || 0
        });

        // Return the full JSON response to the frontend
        return new Response(JSON.stringify(data), {
          headers: { ...headers, "Content-Type": "application/json" },
        });

      } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});