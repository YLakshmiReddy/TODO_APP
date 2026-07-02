import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class StatsService {

    public static String getStatsJson() {
        List<Task> tasks = TaskRepository.getAll();
        int total = tasks.size();
        int completed = 0;
        int active = 0;
        int overdue = 0;

        Map<String, Integer> categories = new HashMap<>();
        Map<String, Integer> priorities = new HashMap<>();
        priorities.put("High", 0);
        priorities.put("Medium", 0);
        priorities.put("Low", 0);

        LocalDate today = LocalDate.now();

        for (Task t : tasks) {
            if (t.isCompleted()) {
                completed++;
            } else {
                active++;
            }

            // Check overdue
            String dueDateStr = t.getDueDate();
            if (dueDateStr != null && !dueDateStr.trim().isEmpty() && !t.isCompleted()) {
                try {
                    LocalDate dueDate = LocalDate.parse(dueDateStr.trim());
                    if (dueDate.isBefore(today)) {
                        overdue++;
                    }
                } catch (DateTimeParseException e) {
                    // Ignore malformed dates
                }
            }

            // Category tracking
            String category = t.getCategory();
            if (category == null || category.trim().isEmpty()) {
                category = "Uncategorized";
            } else {
                category = category.trim();
            }
            categories.put(category, categories.getOrDefault(category, 0) + 1);

            // Priority tracking
            String priority = t.getPriority();
            if (priority != null && !priority.trim().isEmpty()) {
                priority = priority.trim();
                if (priorities.containsKey(priority)) {
                    priorities.put(priority, priorities.get(priority) + 1);
                } else {
                    priorities.put(priority, priorities.getOrDefault(priority, 0) + 1);
                }
            }
        }

        double completionPercentage = total > 0 ? ((double) completed / total) * 100.0 : 0.0;

        // Manually build JSON
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"total\":").append(total).append(",");
        sb.append("\"completed\":").append(completed).append(",");
        sb.append("\"active\":").append(active).append(",");
        sb.append("\"overdue\":").append(overdue).append(",");
        sb.append("\"completionPercentage\":").append(String.format(java.util.Locale.US, "%.1f", completionPercentage)).append(",");

        // Categories map
        sb.append("\"categories\":{");
        int catIndex = 0;
        for (Map.Entry<String, Integer> entry : categories.entrySet()) {
            sb.append(JsonUtils.toJsonString(entry.getKey())).append(":").append(entry.getValue());
            if (catIndex < categories.size() - 1) {
                sb.append(",");
            }
            catIndex++;
        }
        sb.append("},");

        // Priorities map
        sb.append("\"priorities\":{");
        int prioIndex = 0;
        for (Map.Entry<String, Integer> entry : priorities.entrySet()) {
            sb.append(JsonUtils.toJsonString(entry.getKey())).append(":").append(entry.getValue());
            if (prioIndex < priorities.size() - 1) {
                sb.append(",");
            }
            prioIndex++;
        }
        sb.append("}");

        sb.append("}");
        return sb.toString();
    }
}
