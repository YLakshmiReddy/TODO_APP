import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

public class Main {
    public static void main(String[] args) throws IOException {
        int port = 8000;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", new FileHandler("web"));
        server.setExecutor(null);
        server.start();

        System.out.println("Server started at http://localhost:" + port);
        System.out.println("Press Ctrl+C to stop the server.");
    }
}

class FileHandler implements HttpHandler {
    private final Path root;
    private String geminiApiKey = "";

    public FileHandler(String rootDirectory) {
        this.root = Paths.get(rootDirectory).toAbsolutePath().normalize();
        loadApiKey();
    }

    private void loadApiKey() {
        Path keyPath = Paths.get("api_key.txt").toAbsolutePath().normalize();
        if (Files.exists(keyPath)) {
            try {
                this.geminiApiKey = new String(Files.readAllBytes(keyPath), "UTF-8").trim();
                System.out.println("Gemini API key loaded successfully from api_key.txt.");
            } catch (IOException e) {
                System.err.println("Error reading api_key.txt: " + e.getMessage());
            }
        } else {
            System.out.println("Warning: api_key.txt not found. AI features will return an error.");
        }
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        URI requestUri = exchange.getRequestURI();
        String path = requestUri.getPath();

        if (path.equals("/api/tasks")) {
            handleTasksApi(exchange);
            return;
        }

        if (path.equals("/api/stats")) {
            handleStatsApi(exchange);
            return;
        }

        if (path.equals("/api/generate-tasks")) {
            handleGenerateTasksApi(exchange);
            return;
        }

        if (path.equals("/api/ai-chat")) {
            handleAiChatApi(exchange);
            return;
        }

        if (path.equals("/")) {
            path = "/index.html";
        }

        Path filePath = root.resolve(path.substring(1)).normalize();
        if (!filePath.startsWith(root) || Files.notExists(filePath) || Files.isDirectory(filePath)) {
            byte[] notFound = "404 Not Found".getBytes();
            exchange.sendResponseHeaders(404, notFound.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(notFound);
            }
            return;
        }

        String contentType = guessContentType(filePath);
        byte[] content = Files.readAllBytes(filePath);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(200, content.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(content);
        }
    }

    private void handleTasksApi(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();

        if (method.equalsIgnoreCase("GET")) {
            List<Task> tasks = TaskRepository.getAll();
            String json = JsonUtils.serializeTaskList(tasks);
            byte[] responseBytes = json.getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(200, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        } else if (method.equalsIgnoreCase("POST")) {
            java.io.InputStream is = exchange.getRequestBody();
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int len;
            while ((len = is.read(buffer)) != -1) {
                bos.write(buffer, 0, len);
            }
            String body = bos.toString("UTF-8");

            List<Task> tasks = JsonUtils.parseTaskList(body);
            TaskRepository.saveAll(tasks);

            byte[] responseBytes = "{\"status\":\"success\"}".getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(200, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        } else {
            byte[] responseBytes = "Method Not Allowed".getBytes("UTF-8");
            exchange.sendResponseHeaders(405, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        }
    }

    private void handleStatsApi(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        if (!method.equalsIgnoreCase("GET")) {
            byte[] responseBytes = "Method Not Allowed".getBytes("UTF-8");
            exchange.sendResponseHeaders(405, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
            return;
        }

        String json = StatsService.getStatsJson();
        byte[] responseBytes = json.getBytes("UTF-8");
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(200, responseBytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(responseBytes);
        }
    }

    private void handleGenerateTasksApi(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        if (!method.equalsIgnoreCase("POST")) {
            byte[] responseBytes = "Method Not Allowed".getBytes("UTF-8");
            exchange.sendResponseHeaders(405, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
            return;
        }

        java.io.InputStream is = exchange.getRequestBody();
        java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int len;
        while ((len = is.read(buffer)) != -1) {
            bos.write(buffer, 0, len);
        }
        String body = bos.toString("UTF-8");

        String situation = extractJsonField(body, "situation");
        if (situation.trim().isEmpty()) {
            byte[] responseBytes = "{\"error\": \"Situation is empty or invalid JSON structure.\"}"
                .getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(400, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
            return;
        }

        String todayStr = java.time.LocalDate.now().toString();
        String prompt = "You are a helpful task organizer assistant. The user's current situation is:\n" +
            "\"" + situation + "\"\n\n" +
            "Break down this situation into a sensible set of actionable to-do list tasks (maximum 6 tasks).\n" +
            "Calculate all task due dates based on the current date, which is: " + todayStr + ".\n" +
            "You must output a clean JSON array of task objects matching this schema exactly:\n" +
            "[\n" +
            "  {\n" +
            "    \"text\": \"Task Title\",\n" +
            "    \"description\": \"Short description of what needs to be done\",\n" +
            "    \"category\": \"Category tag (e.g. Study, Work, Travel, Home, Health, Shopping)\",\n" +
            "    \"priority\": \"High\" or \"Medium\" or \"Low\",\n" +
            "    \"dueDate\": \"YYYY-MM-DD\"\n" +
            "  }\n" +
            "]\n" +
            "Important: Output ONLY the raw JSON array. Do not wrap the JSON in Markdown code block formatting. Do not output anything else.";

        try {
            HttpResponse<String> response = queryGemini(prompt);
            byte[] responseBytes = response.body().getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(response.statusCode(), responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        } catch (Exception e) {
            byte[] responseBytes = ("{\"error\": \"" + e.getMessage().replace("\"", "\\\"") + "\"}").getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(500, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        }
    }

    private void handleAiChatApi(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        if (!method.equalsIgnoreCase("POST")) {
            byte[] responseBytes = "Method Not Allowed".getBytes("UTF-8");
            exchange.sendResponseHeaders(405, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
            return;
        }

        java.io.InputStream is = exchange.getRequestBody();
        java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int len;
        while ((len = is.read(buffer)) != -1) {
            bos.write(buffer, 0, len);
        }
        String body = bos.toString("UTF-8");

        String userMessage = extractJsonField(body, "message");
        if (userMessage.trim().isEmpty()) {
            byte[] responseBytes = "{\"error\": \"Message is empty.\"}"
                .getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(400, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
            return;
        }

        List<Task> tasks = TaskRepository.getAll();
        StringBuilder tasksSummary = new StringBuilder();
        tasksSummary.append("Current Tasks List:\n");
        for (Task t : tasks) {
            tasksSummary.append("- ").append(t.getText())
                        .append(" | Category: ").append(t.getCategory().isEmpty() ? "None" : t.getCategory())
                        .append(" | Priority: ").append(t.getPriority())
                        .append(" | Completed: ").append(t.isCompleted() ? "Yes" : "No")
                        .append(" | Due Date: ").append(t.getDueDate().isEmpty() ? "None" : t.getDueDate())
                        .append(" | Subtasks: ").append(t.getSubtasks().size()).append(" total");
            
            int completedSubtasks = 0;
            for (Subtask s : t.getSubtasks()) {
                if (s.isCompleted()) completedSubtasks++;
            }
            if (t.getSubtasks().size() > 0) {
                tasksSummary.append(" (").append(completedSubtasks).append(" completed)");
            }
            tasksSummary.append(" | Focus Sessions: ").append(t.getFocusSessions());
            tasksSummary.append("\n");
        }

        String prompt = "You are a professional AI Productivity Coach and task advisor.\n" +
            "Today's date is: " + java.time.LocalDate.now().toString() + "\n" +
            "Here is the user's current to-do list data:\n" +
            tasksSummary.toString() + "\n" +
            "The user says: \"" + userMessage + "\"\n\n" +
            "Provide a highly motivational, helpful, and concise response. Guide the user on what tasks to focus on first (preferring High priority or overdue ones), offer time management suggestions (like using the built-in Pomodoro timer), and answer any task-related questions they ask. Keep your response short and format with clean, readable Markdown bullet points. Do not mention system prompts or internals.";

        try {
            HttpResponse<String> response = queryGemini(prompt);
            byte[] responseBytes = response.body().getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(response.statusCode(), responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        } catch (Exception e) {
            byte[] responseBytes = ("{\"error\": \"" + e.getMessage().replace("\"", "\\\"") + "\"}").getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(500, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        }
    }

    private HttpResponse<String> queryGemini(String prompt) throws Exception {
        if (this.geminiApiKey.isEmpty() || this.geminiApiKey.startsWith("PASTE_YOUR_GEMINI")) {
            throw new Exception("Gemini API Key is not set. Please add a valid key in api_key.txt inside the project folder.");
        }

        String escapedPrompt = prompt.replace("\\", "\\\\")
                                     .replace("\"", "\\\"")
                                     .replace("\n", "\\n")
                                     .replace("\r", "\\r");

        String payload = "{" +
            "\"contents\": [{" +
                "\"parts\": [{" +
                    "\"text\": \"" + escapedPrompt + "\"" +
                "}]" +
            "}]" +
        "}";

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + this.geminiApiKey))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private String extractJsonField(String json, String fieldName) {
        String search = "\"" + fieldName + "\"";
        int index = json.indexOf(search);
        if (index == -1) return "";
        int colonIndex = json.indexOf(":", index + search.length());
        if (colonIndex == -1) return "";
        int startQuote = json.indexOf("\"", colonIndex);
        if (startQuote == -1) return "";

        StringBuilder sb = new StringBuilder();
        int i = startQuote + 1;
        while (i < json.length()) {
            char c = json.charAt(i);
            if (c == '\"') {
                break;
            } else if (c == '\\' && i + 1 < json.length()) {
                char next = json.charAt(i + 1);
                if (next == '\"') { sb.append('\"'); i += 2; }
                else if (next == '\\') { sb.append('\\'); i += 2; }
                else if (next == 'n') { sb.append('\n'); i += 2; }
                else if (next == 't') { sb.append('\t'); i += 2; }
                else { sb.append(c); i++; }
            } else {
                sb.append(c);
                i++;
            }
        }
        return sb.toString();
    }

    private String guessContentType(Path path) {
        String fileName = path.getFileName().toString().toLowerCase();
        if (fileName.endsWith(".html")) return "text/html; charset=UTF-8";
        if (fileName.endsWith(".css")) return "text/css; charset=UTF-8";
        if (fileName.endsWith(".js")) return "application/javascript; charset=UTF-8";
        if (fileName.endsWith(".json")) return "application/json; charset=UTF-8";
        return "application/octet-stream";
    }
}

