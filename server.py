import http.server
import socketserver
import os

PORT = 5173

class SPA_Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve the file if it exists
        if os.path.exists(self.translate_path(self.path)):
            super().do_GET()
        else:
            # Fallback to index.html for SPA routing
            self.path = '/index.html'
            super().do_GET()

with socketserver.TCPServer(("", PORT), SPA_Handler) as httpd:
    print(f"Serving SPA natively at http://localhost:{PORT}")
    httpd.serve_forever()
