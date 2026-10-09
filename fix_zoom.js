const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Add import
code = code.replace("import ReactMarkdown", "import ReactMarkdown from 'react-markdown';\nimport { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';");
// Wait, ReactMarkdown is already imported.
// Let's just use string replacement carefully.
