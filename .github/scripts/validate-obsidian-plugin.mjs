import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredManifestFields = {
	id: "string",
	name: "string",
	version: "string",
	minAppVersion: "string",
	description: "string",
	isDesktopOnly: "boolean",
};

const errors = [];

function readJson(relativePath) {
	const fullPath = path.join(root, relativePath);
	try {
		return JSON.parse(fs.readFileSync(fullPath, "utf8"));
	} catch (error) {
		errors.push(`${relativePath} is missing or invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}

function assert(condition, message) {
	if (!condition) {
		errors.push(message);
	}
}

function isSemver(value) {
	return /^\d+\.\d+\.\d+$/.test(value);
}

const manifest = readJson("manifest.json");
const versions = readJson("versions.json");
const packageJson = readJson("package.json");

if (manifest) {
	for (const [field, expectedType] of Object.entries(requiredManifestFields)) {
		assert(
			typeof manifest[field] === expectedType,
			`manifest.json field "${field}" must be a ${expectedType}`,
		);
	}

	if (typeof manifest.id === "string") {
		assert(
			/^[a-z0-9][a-z0-9-]*$/.test(manifest.id),
			"manifest.json id should use lowercase letters, numbers, and hyphens only",
		);
	}

	if (typeof manifest.version === "string") {
		assert(isSemver(manifest.version), "manifest.json version must be SemVer x.y.z without a leading v");
	}

	if (typeof manifest.minAppVersion === "string") {
		assert(manifest.minAppVersion.trim().length > 0, "manifest.json minAppVersion cannot be empty");
	}

	if (packageJson && typeof packageJson.name === "string") {
		assert(
			packageJson.name === manifest.id,
			`package.json name (${packageJson.name}) should match manifest.json id (${manifest.id})`,
		);
	}

	if (packageJson && typeof packageJson.version === "string") {
		assert(
			packageJson.version === manifest.version,
			`package.json version (${packageJson.version}) should match manifest.json version (${manifest.version})`,
		);
	}
}

if (manifest && versions) {
	assert(
		Object.prototype.hasOwnProperty.call(versions, manifest.version),
		`versions.json must include an entry for ${manifest.version}`,
	);

	if (Object.prototype.hasOwnProperty.call(versions, manifest.version)) {
		assert(
			versions[manifest.version] === manifest.minAppVersion,
			`versions.json maps ${manifest.version} to ${versions[manifest.version]}, but manifest.json minAppVersion is ${manifest.minAppVersion}`,
		);
	}

	for (const [version, minAppVersion] of Object.entries(versions)) {
		assert(isSemver(version), `versions.json key "${version}" must be SemVer x.y.z`);
		assert(typeof minAppVersion === "string" && minAppVersion.trim().length > 0, `versions.json value for ${version} must be a non-empty string`);
	}
}

for (const artifact of ["main.js", "manifest.json"]) {
	const fullPath = path.join(root, artifact);
	assert(fs.existsSync(fullPath), `${artifact} must exist after npm run build`);
	if (fs.existsSync(fullPath)) {
		assert(fs.statSync(fullPath).size > 0, `${artifact} must not be empty`);
	}
}

if (fs.existsSync(path.join(root, "styles.css"))) {
	assert(fs.statSync(path.join(root, "styles.css")).size > 0, "styles.css exists but is empty");
}

if (errors.length > 0) {
	console.error("Obsidian plugin validation failed:");
	for (const error of errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log("Obsidian plugin metadata and release artifacts look valid.");
