import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URL;

public class TestZerotrac {
    public static void main(String[] args) throws Exception {
        URL url = new URL("https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/ratings.txt");
        BufferedReader reader = new BufferedReader(new InputStreamReader(url.openStream()));
        String line;
        int count = 0;
        while ((line = reader.readLine()) != null && count < 10) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("Rating ")) continue;
            
            String[] parts = trimmed.split("\\t");
            if (parts.length < 5) continue;
            
            Double rating = Double.parseDouble(parts[0]);
            String titleSlug = parts[4];
            System.out.println("Slug: " + titleSlug + " -> Rating: " + rating);
            count++;
        }
    }
}
