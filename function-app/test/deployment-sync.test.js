const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");

test("VM synchronization installs every managed runtime file and reapplies the stack", async (t) => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "ayn-vm-sync-"));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  const project = path.join(fixture, "project");
  const bin = path.join(fixture, "bin");
  const vmRoot = path.join(fixture, "vm");
  await fs.mkdir(bin, { recursive: true });
  await fs.mkdir(path.join(project, "scripts"), { recursive: true });
  await fs.mkdir(path.join(project, "terraform"), { recursive: true });
  const managed = ["compose.azure.yaml", "Caddyfile", "logstash/pipeline/logstash.conf", "filebeat/filebeat.yml", "kibana/objects.ndjson", "scripts/setup.sh", "scripts/validate.sh"];
  for (const file of [...managed, "scripts/configure-analytics.sh", "scripts/run-remote.sh"]) {
    await fs.mkdir(path.dirname(path.join(project, file)), { recursive: true });
    await fs.copyFile(path.join(root, file), path.join(project, file));
    if (file.endsWith(".sh")) await fs.chmod(path.join(project, file), 0o755);
  }
  await fs.writeFile(path.join(project, "terraform/.analytics-function.zip"), "synthetic package");
  await fs.writeFile(path.join(project, "scripts/validate-analytics.sh"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const capture = path.join(fixture, "remote.sh");
  const dockerLog = path.join(fixture, "docker.log");
  const mock = async (name, code) => fs.writeFile(path.join(bin, name), "#!/usr/bin/env node\n" + code, { mode: 0o755 });
  await mock("terraform", "process.stdout.write('synthetic');");
  await mock("az", "const fs = require('node:fs'); const args = process.argv.slice(2); if (args.includes('run-command')) { const script = args[args.indexOf('--scripts') + 1]; fs.writeFileSync(process.env.SYNC_CAPTURE, script); console.log(script.match(/REMOTE_OK_[0-9]+_[0-9]+/)[0]); } else if (args.includes('function') && args.includes('list')) { console.log('synthetic/incidentExport'); } else { console.log('synthetic'); }");
  await mock("cloud-init", "process.exit(0);");
  await mock("docker", "const fs = require('node:fs'); const args = process.argv.slice(2); fs.appendFileSync(process.env.SYNC_DOCKER_LOG, JSON.stringify(args) + '\\n'); if(args.includes('ps')) console.log(JSON.stringify({Health:'healthy'}));");
  const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH, SKIP_FUNCTION_DEPLOY: "true", SYNC_CAPTURE: capture, SYNC_DOCKER_LOG: dockerLog };
  const configured = spawnSync("bash", [path.join(project, "scripts/configure-analytics.sh")], { env, encoding: "utf8" });
  assert.equal(configured.status, 0, configured.stderr);
  const remote = (await fs.readFile(capture, "utf8")).replaceAll("/opt/ayn-al-sijill", vmRoot);
  const applied = spawnSync("bash", ["-c", remote], { env, encoding: "utf8" });
  assert.equal(applied.status, 0, applied.stderr);
  for (const file of managed) {
    assert.deepEqual(await fs.readFile(path.join(vmRoot, file)), await fs.readFile(path.join(project, file)), file);
  }
  const commands = (await fs.readFile(dockerLog, "utf8")).trim().split("\n").map(JSON.parse);
  assert.ok(commands.some((args) => args.includes("up") && ["elasticsearch", "logstash", "kibana", "filebeat", "caddy"].every((service) => args.includes(service))));
  assert.ok(commands.some((args) => args.includes("--force-recreate") && ["logstash", "filebeat", "caddy"].every((service) => args.includes(service))));
  assert.ok(commands.some((args) => args.includes("run") && args.includes("kibana-setup")));
});
