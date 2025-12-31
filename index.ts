/**
 * New Year 2026 - Bun Server
 * High-performance native Bun file server
 */

const publicDir = "./public";

// MIME types for static files
const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;
    
    // Default to index.html for root
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }
    
    // Build file path
    const filePath = `${publicDir}${pathname}`;
    
    try {
      const file = Bun.file(filePath);
      
      // Check if file exists
      if (await file.exists()) {
        // Get file extension for MIME type
        const ext = pathname.substring(pathname.lastIndexOf(".")).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";
        
        return new Response(file, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-cache",
          },
        });
      }
      
      // 404 for missing files
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Error serving file:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`
🎆 ═══════════════════════════════════════════════════════════════ 🎆
   
   🌟 Happy New Year 2026 Server is running! 🌟
   
   🚀 Server: http://localhost:${server.port}
   
   ✨ Open your browser and celebrate!
   
🎆 ═══════════════════════════════════════════════════════════════ 🎆
`);