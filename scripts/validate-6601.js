const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];

function filesIn(directory) {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory()) {
			return entry.name === ".git" ? [] : filesIn(path.join(directory, entry.name));
		}
		return [path.join(directory, entry.name)];
	});
}

function checkLocalLinks(file) {
	const source = fs.readFileSync(file, "utf8");
	const links = [...source.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);
	for (const link of links) {
		if (/^(?:https?:|mailto:|#|data:|javascript:)/i.test(link)) continue;
		const target = link.split(/[?#]/, 1)[0];
		if (target && !fs.existsSync(path.resolve(path.dirname(file), target))) {
			failures.push(`${path.relative(root, file)} -> ${link}`);
		}
	}
}

for (const file of filesIn(root)) {
	if (file.endsWith(".html")) checkLocalLinks(file);
}

for (const schema of ["form6601/form6601-json-schema.json"]) {
	try {
		JSON.parse(fs.readFileSync(path.join(root, schema), "utf8"));
	} catch (error) {
		failures.push(`${schema} -> invalid JSON (${error.message})`);
	}
}

if (failures.length) {
	console.error(`6601 validation failed with ${failures.length} issue(s):`);
	failures.forEach((failure) => console.error(`- ${failure}`));
	process.exitCode = 1;
} else {
	console.log("6601 validation passed: local HTML links and JSON schemas are valid.");
}
