import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

public class TaskRepository {
    private static final Path dataPath = Paths.get("tasks.json").toAbsolutePath();

    public static synchronized List<Task> getAll() {
        if (!Files.exists(dataPath)) {
            return new ArrayList<>();
        }
        try {
            String json = new String(Files.readAllBytes(dataPath), "UTF-8");
            return JsonUtils.parseTaskList(json);
        } catch (IOException e) {
            System.err.println("Error reading tasks database: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public static synchronized void saveAll(List<Task> tasks) {
        try {
            String json = JsonUtils.serializeTaskList(tasks);
            Files.write(dataPath, json.getBytes("UTF-8"));
        } catch (IOException e) {
            System.err.println("Error writing tasks database: " + e.getMessage());
        }
    }
}
