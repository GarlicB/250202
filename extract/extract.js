#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const jsFolderPath = path.join(__dirname, "js");
const resultFilePath = path.join(__dirname, "result.js");

let resultContent = "";

try {
  const files = fs.readdirSync(jsFolderPath);
  files.forEach((file) => {
    if (path.extname(file) === ".js") {
      const filePath = path.join(jsFolderPath, file);
      const code = fs.readFileSync(filePath, "utf8");
      resultContent += `// --- ${file} ---\n${code}\n\n`;
    }
  });
  fs.writeFileSync(resultFilePath, resultContent, "utf8");
  console.log(`모든 파일의 코드가 ${resultFilePath}에 저장되었습니다.`);
} catch (error) {
  console.error("파일 처리 중 오류 발생:", error);
}
