// scripts/download-models.js
const fs = require("fs");
const path = require("path");
const https = require("https");

const models = [
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json",
    filename: "tiny_face_detector_model-weights_manifest.json",
  },
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1",
    filename: "tiny_face_detector_model-shard1",
  },
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json",
    filename: "face_landmark_68_model-weights_manifest.json",
  },
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1",
    filename: "face_landmark_68_model-shard1",
  },
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json",
    filename: "face_recognition_model-weights_manifest.json",
  },
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1",
    filename: "face_recognition_model-shard1",
  },
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2",
    filename: "face_recognition_model-shard2",
  },
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json",
    filename: "face_expression_model-weights_manifest.json",
  },
  {
    url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-shard1",
    filename: "face_expression_model-shard1",
  },
];

const downloadDir = path.join(__dirname, "../public/models");

if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

models.forEach((model) => {
  const filePath = path.join(downloadDir, model.filename);
  const file = fs.createWriteStream(filePath);

  https
    .get(model.url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log(`Downloaded: ${model.filename}`);
      });
    })
    .on("error", (err) => {
      fs.unlink(filePath, () => {});
      console.error(`Error downloading ${model.filename}:`, err.message);
    });
});
