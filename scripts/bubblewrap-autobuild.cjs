const path = require('path');
const fs = require('fs');
const bwDir = path.join(process.env.APPDATA, 'npm/node_modules/@bubblewrap/cli/node_modules/@bubblewrap/core');
const cliDir = path.join(process.env.APPDATA, 'npm/node_modules/@bubblewrap/cli');
const { TwaManifest, TwaGenerator, ConsoleLog, BufferedLog, JdkHelper, KeyTool, Config } = require(path.join(bwDir));
const { generateManifestChecksumFile } = require(path.join(cliDir, 'dist/lib/cmds/shared'));

async function main() {
  const javaHome = process.env.JAVA_HOME;
  console.log('Java Home:', javaHome);

  const targetDir = 'C:\\Users\\PC\\Desktop\\New folder (14)\\tiktok-clone\\android-app';
  const manifestFile = 'C:\\Users\\PC\\Desktop\\New folder (14)\\tiktok-clone\\twa-manifest.json';
  const config = new Config(javaHome, 'C:\\Users\\PC\\AppData\\Local\\Android\\Sdk');

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  // Strip BOM if present
  let raw = fs.readFileSync(manifestFile, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  fs.writeFileSync(manifestFile, raw, 'utf8');

  let twaManifest = await TwaManifest.fromFile(manifestFile);
  twaManifest.signingKey.path = path.join(targetDir, twaManifest.signingKey.path);
  twaManifest.generatorApp = 'bubblewrap-cli';

  console.log('Generating TWA project...');
  const twaGenerator = new TwaGenerator();
  const log = new BufferedLog(new ConsoleLog('TWA'));
  await twaGenerator.createTwaProject(targetDir, twaManifest, log, (c, t) => {
    const pct = Math.round(c/t*100);
    process.stdout.write(`\r${pct}%`);
  });
  log.flush();
  console.log('\nProject generated');

  await twaManifest.saveToFile(path.join(targetDir, 'twa-manifest.json'));
  await generateManifestChecksumFile(path.join(targetDir, 'twa-manifest.json'), targetDir);

  console.log('Creating signing key...');
  const jdkHelper = new JdkHelper(process, config);
  const keytool = new KeyTool(jdkHelper);
  await keytool.createSigningKey({
    fullName: 'VELO App',
    organizationalUnit: 'Development',
    organization: 'VELO',
    country: 'US',
    password: 'android',
    keypassword: 'android',
    alias: 'velo-key',
    path: twaManifest.signingKey.path,
  });
  console.log('Signing key created at:', twaManifest.signingKey.path);

  console.log('\nDone! Project ready at:', targetDir);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
