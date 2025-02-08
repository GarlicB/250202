const fs = require("fs");
const path = require("path");

// 입력 디렉토리 (js 폴더)
const inputDir = "./js";
// 출력 파일 이름
const outputFile = "result.js";

function mergeJsFiles(inputDir, outputFile) {
  let combinedCode = "";

  // 디렉토리 내의 모든 파일 목록을 가져옵니다.
  const files = fs.readdirSync(inputDir);

  // 파일 목록을 순회하며 .js 파일만 처리합니다.
  files.forEach((file) => {
    const filePath = path.join(inputDir, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      // 디렉토리일 경우 재귀적으로 탐색
      combinedCode += mergeJsFiles(filePath, outputFile);
    } else if (path.extname(file) === ".js") {
      try {
        // 파일 내용을 읽어 combinedCode에 추가합니다.
        const fileContent = fs.readFileSync(filePath, "utf-8");
        combinedCode += `\n// File: ${filePath}\n${fileContent}\n`;
        console.log(`Merged: ${filePath}`);
      } catch (err) {
        console.error(`Error reading file ${filePath}: ${err}`);
      }
    }
  });

  return combinedCode;
}

// 병합 시작
const allCode = mergeJsFiles(inputDir, outputFile);

// 결과 파일에 코드를 씁니다.
fs.writeFileSync(outputFile, allCode, "utf-8");
console.log(`Successfully merged all .js files into ${outputFile}`);

function initializeTouchEvents() {
  const container = document.querySelector(".container");
  let startX, startY;

  container.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  container.addEventListener("touchmove", (e) => {
    e.preventDefault(); // 스크롤 방지
    const deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - startY;

    // 터치 드래그로 요소 이동
    handleDrag(deltaX, deltaY);
  });
}
