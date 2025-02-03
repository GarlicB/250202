#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const jsFolderPath = path.join(__dirname, "js");
const inputFilePath = path.join(__dirname, "input.js");

try {
  const inputContent = fs.readFileSync(inputFilePath, "utf8");
  const regex = /\/\/\s+---\s+(.*?)\s+---\n([\s\S]*?)(?=\/\/\s+---\s+|$)/g;
  let match;
  while ((match = regex.exec(inputContent)) !== null) {
    const fileName = match[1].trim();
    const code = match[2];
    fs.writeFileSync(path.join(jsFolderPath, fileName), code, "utf8");
    console.log(`${fileName} 업데이트 완료`);
  }
  console.log("모든 파일 업데이트 완료");
} catch (error) {
  console.error("파일 처리 중 오류 발생:", error);
}
