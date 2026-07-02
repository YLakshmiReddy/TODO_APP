import java.util.ArrayList;
import java.util.List;

public class Task {
    private double id;
    private String text;
    private String description;
    private String category;
    private boolean completed;
    private String priority;
    private String dueDate;
    private String createdAt;
    private List<Subtask> subtasks;
    private int focusSessions;

    public Task() {
        this.subtasks = new ArrayList<>();
    }

    public Task(double id, String text, String description, String category, boolean completed, 
                String priority, String dueDate, String createdAt, List<Subtask> subtasks, int focusSessions) {
        this.id = id;
        this.text = text;
        this.description = description;
        this.category = category;
        this.completed = completed;
        this.priority = priority;
        this.dueDate = dueDate;
        this.createdAt = createdAt;
        this.subtasks = subtasks != null ? subtasks : new ArrayList<>();
        this.focusSessions = focusSessions;
    }

    public double getId() {
        return id;
    }

    public void setId(double id) {
        this.id = id;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public List<Subtask> getSubtasks() {
        return subtasks;
    }

    public void setSubtasks(List<Subtask> subtasks) {
        this.subtasks = subtasks != null ? subtasks : new ArrayList<>();
    }

    public int getFocusSessions() {
        return focusSessions;
    }

    public void setFocusSessions(int focusSessions) {
        this.focusSessions = focusSessions;
    }
}
