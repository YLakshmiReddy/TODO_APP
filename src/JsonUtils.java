import java.util.*;

public class JsonUtils {

    public static List<Task> parseTaskList(String json) {
        if (json == null || json.trim().isEmpty()) {
            return new ArrayList<>();
        }
        Object parsedObj = new JsonParser(json).parse();
        List<Task> tasks = new ArrayList<>();
        if (parsedObj instanceof List) {
            List<?> list = (List<?>) parsedObj;
            for (Object item : list) {
                if (item instanceof Map) {
                    tasks.add(mapToTask((Map<?, ?>) item));
                }
            }
        }
        return tasks;
    }

    public static String serializeTaskList(List<Task> tasks) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < tasks.size(); i++) {
            sb.append(serializeTask(tasks.get(i)));
            if (i < tasks.size() - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    public static String serializeTask(Task t) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"id\":").append(formatDouble(t.getId())).append(",");
        sb.append("\"text\":").append(toJsonString(t.getText())).append(",");
        sb.append("\"description\":").append(toJsonString(t.getDescription())).append(",");
        sb.append("\"category\":").append(toJsonString(t.getCategory())).append(",");
        sb.append("\"completed\":").append(t.isCompleted()).append(",");
        sb.append("\"priority\":").append(toJsonString(t.getPriority())).append(",");
        sb.append("\"dueDate\":").append(toJsonString(t.getDueDate())).append(",");
        sb.append("\"createdAt\":").append(toJsonString(t.getCreatedAt())).append(",");
        sb.append("\"focusSessions\":").append(t.getFocusSessions()).append(",");
        sb.append("\"subtasks\":").append(serializeSubtaskList(t.getSubtasks()));
        sb.append("}");
        return sb.toString();
    }

    private static String serializeSubtaskList(List<Subtask> subtasks) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < subtasks.size(); i++) {
            Subtask s = subtasks.get(i);
            sb.append("{");
            sb.append("\"id\":").append(formatDouble(s.getId())).append(",");
            sb.append("\"text\":").append(toJsonString(s.getText())).append(",");
            sb.append("\"completed\":").append(s.isCompleted());
            sb.append("}");
            if (i < subtasks.size() - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    public static String toJsonString(String val) {
        if (val == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("\"");
        for (int i = 0; i < val.length(); i++) {
            char c = val.charAt(i);
            switch (c) {
                case '\"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20 || (c >= 0x7F && c <= 0x9F)) {
                        String hex = Integer.toHexString(c);
                        sb.append("\\u");
                        for (int k = 0; k < 4 - hex.length(); k++) {
                            sb.append('0');
                        }
                        sb.append(hex.toUpperCase());
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append("\"");
        return sb.toString();
    }

    private static String formatDouble(double d) {
        // Javascript dates/numbers don't have scientific notation usually or need exact representation.
        // If it's a whole number, format without decimal point.
        if (d == (long) d) {
            return String.format(Locale.US, "%d", (long) d);
        } else {
            return String.format(Locale.US, "%f", d).replaceAll("0+$", "");
        }
    }

    private static Task mapToTask(Map<?, ?> map) {
        Task t = new Task();
        t.setId(asDouble(map.get("id")));
        t.setText(asString(map.get("text")));
        t.setDescription(asString(map.get("description")));
        t.setCategory(asString(map.get("category")));
        t.setCompleted(asBoolean(map.get("completed")));
        t.setPriority(asString(map.get("priority")));
        t.setDueDate(asString(map.get("dueDate")));
        t.setCreatedAt(asString(map.get("createdAt")));
        t.setFocusSessions(asInt(map.get("focusSessions")));

        List<Subtask> subtasks = new ArrayList<>();
        Object subtasksObj = map.get("subtasks");
        if (subtasksObj instanceof List) {
            for (Object subObj : (List<?>) subtasksObj) {
                if (subObj instanceof Map) {
                    subtasks.add(mapToSubtask((Map<?, ?>) subObj));
                }
            }
        }
        t.setSubtasks(subtasks);
        return t;
    }

    private static Subtask mapToSubtask(Map<?, ?> map) {
        Subtask s = new Subtask();
        s.setId(asDouble(map.get("id")));
        s.setText(asString(map.get("text")));
        s.setCompleted(asBoolean(map.get("completed")));
        return s;
    }

    private static double asDouble(Object obj) {
        if (obj instanceof Number) {
            return ((Number) obj).doubleValue();
        }
        if (obj instanceof String) {
            try {
                return Double.parseDouble((String) obj);
            } catch (NumberFormatException e) {
                return 0.0;
            }
        }
        return 0.0;
    }

    private static int asInt(Object obj) {
        if (obj instanceof Number) {
            return ((Number) obj).intValue();
        }
        if (obj instanceof String) {
            try {
                return Integer.parseInt((String) obj);
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return 0;
    }

    private static String asString(Object obj) {
        if (obj == null) return "";
        return obj.toString();
    }

    private static boolean asBoolean(Object obj) {
        if (obj instanceof Boolean) {
            return (Boolean) obj;
        }
        if (obj instanceof String) {
            return Boolean.parseBoolean((String) obj);
        }
        return false;
    }

    // Mini JSON Parser class (recursive descent)
    private static class JsonParser {
        private final String src;
        private int ptr = 0;

        public JsonParser(String src) {
            this.src = src;
        }

        public Object parse() {
            skipWhitespace();
            if (ptr >= src.length()) {
                return null;
            }
            return parseValue();
        }

        private Object parseValue() {
            skipWhitespace();
            if (ptr >= src.length()) {
                throw new RuntimeException("Unexpected end of JSON string");
            }
            char c = src.charAt(ptr);
            if (c == '{') {
                return parseObject();
            } else if (c == '[') {
                return parseArray();
            } else if (c == '\"') {
                return parseString();
            } else if (c == 't' || c == 'f') {
                return parseBoolean();
            } else if (c == 'n') {
                return parseNull();
            } else if (Character.isDigit(c) || c == '-' || c == '.') {
                return parseNumber();
            } else {
                throw new RuntimeException("Unexpected character in JSON: '" + c + "' at position " + ptr);
            }
        }

        private Map<String, Object> parseObject() {
            Map<String, Object> map = new LinkedHashMap<>();
            consume('{');
            skipWhitespace();
            if (ptr < src.length() && src.charAt(ptr) == '}') {
                ptr++;
                return map;
            }
            while (true) {
                skipWhitespace();
                if (ptr >= src.length() || src.charAt(ptr) != '\"') {
                    throw new RuntimeException("Expected JSON string key in object at position " + ptr);
                }
                String key = parseString();
                skipWhitespace();
                consume(':');
                Object val = parseValue();
                map.put(key, val);
                skipWhitespace();
                if (ptr < src.length() && src.charAt(ptr) == '}') {
                    ptr++;
                    break;
                }
                consume(',');
            }
            return map;
        }

        private List<Object> parseArray() {
            List<Object> list = new ArrayList<>();
            consume('[');
            skipWhitespace();
            if (ptr < src.length() && src.charAt(ptr) == ']') {
                ptr++;
                return list;
            }
            while (true) {
                Object val = parseValue();
                list.add(val);
                skipWhitespace();
                if (ptr < src.length() && src.charAt(ptr) == ']') {
                    ptr++;
                    break;
                }
                consume(',');
            }
            return list;
        }

        private String parseString() {
            consume('\"');
            StringBuilder sb = new StringBuilder();
            while (ptr < src.length()) {
                char c = src.charAt(ptr++);
                if (c == '\"') {
                    return sb.toString();
                } else if (c == '\\') {
                    if (ptr >= src.length()) {
                        throw new RuntimeException("Unescaped backslash at end of string");
                    }
                    char escaped = src.charAt(ptr++);
                    switch (escaped) {
                        case '\"': sb.append('\"'); break;
                        case '\\': sb.append('\\'); break;
                        case '/': sb.append('/'); break;
                        case 'b': sb.append('\b'); break;
                        case 'f': sb.append('\f'); break;
                        case 'n': sb.append('\n'); break;
                        case 'r': sb.append('\r'); break;
                        case 't': sb.append('\t'); break;
                        case 'u':
                            if (ptr + 4 > src.length()) {
                                throw new RuntimeException("Invalid unicode hex escape sequence");
                            }
                            String hex = src.substring(ptr, ptr + 4);
                            ptr += 4;
                            sb.append((char) Integer.parseInt(hex, 16));
                            break;
                        default:
                            sb.append(escaped);
                    }
                } else {
                    sb.append(c);
                }
            }
            throw new RuntimeException("Unterminated string");
        }

        private Boolean parseBoolean() {
            if (ptr + 4 <= src.length() && src.substring(ptr, ptr + 4).equals("true")) {
                ptr += 4;
                return Boolean.TRUE;
            }
            if (ptr + 5 <= src.length() && src.substring(ptr, ptr + 5).equals("false")) {
                ptr += 5;
                return Boolean.FALSE;
            }
            throw new RuntimeException("Expected boolean at position " + ptr);
        }

        private Object parseNull() {
            if (ptr + 4 <= src.length() && src.substring(ptr, ptr + 4).equals("null")) {
                ptr += 4;
                return null;
            }
            throw new RuntimeException("Expected null at position " + ptr);
        }

        private Double parseNumber() {
            int start = ptr;
            if (ptr < src.length() && src.charAt(ptr) == '-') {
                ptr++;
            }
            while (ptr < src.length()) {
                char c = src.charAt(ptr);
                if (Character.isDigit(c) || c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-') {
                    ptr++;
                } else {
                    break;
                }
            }
            String numStr = src.substring(start, ptr);
            try {
                return Double.parseDouble(numStr);
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid number format: " + numStr + " at position " + start);
            }
        }

        private void consume(char expected) {
            skipWhitespace();
            if (ptr >= src.length()) {
                throw new RuntimeException("Expected '" + expected + "' but reached end of string");
            }
            char actual = src.charAt(ptr++);
            if (actual != expected) {
                throw new RuntimeException("Expected '" + expected + "' but got '" + actual + "' at position " + (ptr - 1));
            }
        }

        private void skipWhitespace() {
            while (ptr < src.length()) {
                char c = src.charAt(ptr);
                if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
                    ptr++;
                } else {
                    break;
                }
            }
        }
    }
}
