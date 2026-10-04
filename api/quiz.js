import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export default function handler(req, res) {
  try {
    // Path to your CSV file
    const csvPath = path.join(process.cwd(), "data", "flpt.csv"); // ← change this if needed
    const fileContent = fs.readFileSync(csvPath, "utf8");

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Get query parameters
    const { category, subject, difficulty, random } = req.query;

    let filtered = records;

    if (category) {
      filtered = filtered.filter(q => q.Category?.toLowerCase() === category.toLowerCase());
    }
    if (subject) {
      filtered = filtered.filter(q => q.Subject?.toLowerCase() === subject.toLowerCase());
    }
    if (difficulty) {
      filtered = filtered.filter(q => q.Difficulty?.toLowerCase() === difficulty.toLowerCase());
    }

    if (filtered.length === 0) {
      return res.status(404).json({ error: "No questions found" });
    }

    // Return one random question
    if (random === "true" || !req.query.id) {
      const question = filtered[Math.floor(Math.random() * filtered.length)];
      return res.status(200).json(question);
    }

    // Or return all filtered questions
    res.status(200).json(filtered);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load questions" });
  }
}
