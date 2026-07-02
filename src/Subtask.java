public class Subtask {
    private double id;
    private String text;
    private boolean completed;

    public Subtask() {}

    public Subtask(double id, String text, boolean completed) {
        this.id = id;
        this.text = text;
        this.completed = completed;
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

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
