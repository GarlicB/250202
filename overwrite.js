const fs = require("fs");
const path = require("path");

// 입력 파일 (result.js)
const inputFile = "result.js";
// 출력 디렉토리 (js 폴더)
const outputDir = "./";

function updateJsFiles(inputFile, outputDir) {
  try {
    const fileContent = fs.readFileSync(inputFile, "utf-8");
    const fileRegex = /\/\/ File: (.*\.js)\n([\s\S]*?)(?=\/\/ File:|$)/g;
    let match;

    while ((match = fileRegex.exec(fileContent)) !== null) {
      const filePath = match[1];
      const fileCode = match[2].trim();

      const absoluteFilePath = path.resolve(outputDir, filePath); // 절대 경로로 변환
      const dirName = path.dirname(absoluteFilePath); // 디렉토리 경로 추출

      // 디렉토리가 존재하지 않으면 생성
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
        console.log(`Created directory: ${dirName}`);
      }

      // 파일 내용 쓰기
      fs.writeFileSync(absoluteFilePath, fileCode, "utf-8");
      console.log(`Updated: ${absoluteFilePath}`);
    }

    console.log("Successfully updated all .js files from result.js");
  } catch (err) {
    console.error(`Error processing file: ${err}`);
  }
}

// 파일 업데이트 시작
updateJsFiles(inputFile, outputDir);

// 모바일 반응형 스타일 추가
const mobileStyles = `
  @media screen and (max-width: 768px) {
    .container {
      width: 100%;
      padding: 10px;
    }
    
    .button {
      min-width: 44px; /* 터치 타겟 크기 최적화 */
      min-height: 44px;
      margin: 8px;
      padding: 12px 20px;
    }
    
    .input-field {
      font-size: 16px; /* iOS에서 자동 확대 방지 */
      padding: 12px;
    }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);
