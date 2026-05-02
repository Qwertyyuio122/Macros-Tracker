import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import type { AuthedRequest } from "../middleware/requireUser.js";
import { requireUser } from "../middleware/requireUser.js";
import { db } from "../db.js";
import { manualFoodSchema } from "../validation.js";
import { estimateManualFood, estimateImageFood, FoodEstimationError } from "../services/foodPipeline.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(file.originalname) || ".jpg"}`;
    cb(null, safe);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

export const foodRouter = Router();

foodRouter.post("/manual", requireUser, async (req: AuthedRequest, res) => {
  const parsed = manualFoodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const userId = req.userId!;
  const { text, date } = parsed.data;
  const entryDate = date ?? utcToday();

  let totals;
  let meta;
  let description: string;
  try {
    const r = await estimateManualFood(text);
    totals = r.totals;
    meta = r.meta;
    description = r.description;
  } catch (e) {
    if (e instanceof FoodEstimationError) {
      res.status(422).json({ error: e.message, code: e.code });
      return;
    }
    throw e;
  }

  const insert = db.prepare(
    `INSERT INTO food_entries (user_id, entry_date, source, description, image_path, nutrients_json)
     VALUES (?, ?, 'manual', ?, NULL, ?)`
  );
  const info = insert.run(userId, entryDate, description, JSON.stringify(totals));

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    entry_date: entryDate,
    source: "manual",
    description,
    nutrients: totals,
    analysis: meta,
  });
});

foodRouter.post("/image", requireUser, upload.single("photo"), async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Upload a JPG, PNG, or WebP image using the photo field." });
    return;
  }

  const dateRaw = typeof req.body?.date === "string" ? req.body.date : undefined;
  const entryDate =
    dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : utcToday();

  try {
    const buf = fs.readFileSync(file.path);
    const imageBase64 = buf.toString("base64");
    const mime = file.mimetype;

    let totals;
    let meta;
    let description: string;
    try {
      const r = await estimateImageFood(imageBase64, mime);
      totals = r.totals;
      meta = r.meta;
      description = r.description;
    } catch (e) {
      if (e instanceof FoodEstimationError) {
        res.status(422).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }

    const insert = db.prepare(
      `INSERT INTO food_entries (user_id, entry_date, source, description, image_path, nutrients_json)
       VALUES (?, ?, 'image', ?, ?, ?)`
    );
    const info = insert.run(userId, entryDate, description, file.filename, JSON.stringify(totals));

    res.status(201).json({
      id: Number(info.lastInsertRowid),
      entry_date: entryDate,
      source: "image",
      description,
      nutrients: totals,
      analysis: meta,
    });
  } finally {
    fs.unlink(file.path, () => undefined);
  }
});

foodRouter.delete("/:id", requireUser, (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const info = db.prepare(`DELETE FROM food_entries WHERE id = ? AND user_id = ?`).run(id, userId);
  if (info.changes === 0) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.status(204).send();
});

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}
