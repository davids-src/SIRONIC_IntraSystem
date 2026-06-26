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
  if (content.includes('variant="default"')) {
    fs.writeFileSync(file, content.replace(/variant="default"/g, 'variant="primary"'));
    console.log("Fixed " + file);
    replacedCount++;
  }
});
console.log("Total files fixed: " + replacedCount);
