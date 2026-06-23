#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { join } from 'path';
import { homedir, platform, arch } from 'os';
import { get } from 'https';

const RUNNER_VERSION = '2.316.1';

function getRunnerAsset() {
  const p = platform();
  const a = arch();

  if (p === 'linux') {
    if (a === 'x64') return `actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz`;
    if (a === 'arm64') return `actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz`;
    if (a === 'arm') return `actions-runner-linux-arm-${RUNNER_VERSION}.tar.gz`;
  } else if (p === 'darwin') {
    if (a === 'x64') return `actions-runner-osx-x64-${RUNNER_VERSION}.tar.gz`;
    if (a === 'arm64') return `actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz`;
  } else if (p === 'win32') {
    if (a === 'x64') return `actions-runner-win-x64-${RUNNER_VERSION}.zip`;
  }

  throw new Error(`Unsupported platform: ${p}/${a}`);
}

function downloadFollowRedirects(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl) => {
      get(currentUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed with status ${res.statusCode} for ${currentUrl}`));
          return;
        }
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    };

    follow(url);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: npx gh-self-runner <token> [repo-url]');
    console.log('');
    console.log('Arguments:');
    console.log('  token     GitHub Actions runner registration token (required)');
    console.log('  repo-url  Repository or organisation URL (optional, auto-detected from git remote)');
    console.log('');
    console.log('Examples:');
    console.log('  npx gh-self-runner AABBCC1234567890');
    console.log('  npx gh-self-runner AABBCC1234567890 https://github.com/my-org/my-repo');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const token = args[0];
  let repoUrl = args[1];

  if (!repoUrl) {
    try {
      const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      repoUrl = remote
        .replace(/^git@github\.com:/, 'https://github.com/')
        .replace(/\.git$/, '');
      console.log(`Auto-detected repo URL: ${repoUrl}`);
    } catch {
      console.error('Error: No repo URL provided and no git remote found.');
      console.error('Usage: npx gh-self-runner <token> <repo-url>');
      process.exit(1);
    }
  }

  const runnerDir = join(homedir(), '.gh-self-runner');
  const asset = getRunnerAsset();
  const downloadUrl = `https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${asset}`;
  const assetPath = join(runnerDir, asset);

  mkdirSync(runnerDir, { recursive: true });

  const configScript = platform() === 'win32'
    ? join(runnerDir, 'config.cmd')
    : join(runnerDir, 'config.sh');

  if (!existsSync(configScript)) {
    console.log(`Downloading GitHub Actions runner v${RUNNER_VERSION}...`);
    await downloadFollowRedirects(downloadUrl, assetPath);
    console.log('Download complete.');

    console.log('Extracting runner...');
    if (asset.endsWith('.zip')) {
      execSync(`powershell -Command "Expand-Archive -Path '${assetPath}' -DestinationPath '${runnerDir}'"`, { stdio: 'inherit' });
    } else {
      execSync(`tar xzf "${assetPath}" -C "${runnerDir}"`, { stdio: 'inherit' });
    }
    console.log('Extraction complete.');
  } else {
    console.log('Runner already installed, skipping download.');
  }

  console.log('Configuring runner...');
  const configCmd = platform() === 'win32'
    ? `"${configScript}" --url "${repoUrl}" --token "${token}" --unattended --replace`
    : `"${configScript}" --url "${repoUrl}" --token "${token}" --unattended --replace`;

  execSync(configCmd, { cwd: runnerDir, stdio: 'inherit' });
  console.log('Configuration complete.');

  console.log('Starting runner...');
  const runScript = platform() === 'win32'
    ? join(runnerDir, 'run.cmd')
    : join(runnerDir, 'run.sh');

  const runner = spawn(runScript, [], { cwd: runnerDir, stdio: 'inherit' });

  runner.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
