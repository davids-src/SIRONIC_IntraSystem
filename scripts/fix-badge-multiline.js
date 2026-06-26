const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = dir + "/" + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("apps/crm/app");
let replacedCount = 0;
files.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  // Match <Badge ... variant="primary" ... > across newlines
  // A regex that finds <Badge and later variant="primary" inside the tag
  let newContent = content.replace(
    /<Badge([^>]*)variant="primary"([^>]*)>/g,
    '<Badge$1variant="default"$2>',
  );
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log("Fixed Badge multiline in " + file);
    replacedCount++;
  }
});
console.log("Total Badge files fixed: " + replacedCount);
