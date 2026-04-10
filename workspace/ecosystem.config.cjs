const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = __dirname;

function hasPackageJson(dirPath) {
  return fs.existsSync(path.join(dirPath, 'package.json'));
}

function npmApp({ name, cwd, args, env }) {
  return {
    name,
    cwd,
    script: 'npm',
    args,
    interpreter: 'none',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 2000,
    kill_timeout: 5000,
    time: true,
    env,
  };
}

function shellApp({ name, cwd, args, env }) {
  return {
    name,
    cwd,
    script: 'bash',
    args,
    interpreter: 'none',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 2000,
    kill_timeout: 5000,
    time: true,
    env,
  };
}

const apps = [
  npmApp({
    name: 'prism-agent-api',
    cwd: workspaceRoot,
    args: 'run start',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || '4433',
    },
  }),
  shellApp({
    name: 'prism-agent-site',
    cwd: workspaceRoot,
    args: 'scripts/start-site.sh',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      SITE_BASE_PATH: process.env.SITE_BASE_PATH || '/site',
    },
  }),
];

const bundledServices = [
  {
    name: 'prism-agent-discord-bot',
    cwd: workspaceRoot,
    args: 'scripts/start-discord-bot.sh',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    launcher: 'shell',
    packageDir: path.join(workspaceRoot, 'services', 'discord-bot'),
  },
  {
    name: 'prism-agent-prism-memory',
    cwd: workspaceRoot,
    args: 'services/prism-memory/scripts/start-api.sh',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    launcher: 'shell',
    packageDir: path.join(workspaceRoot, 'services', 'prism-memory'),
  },
  {
    name: 'prism-agent-prism-memory-workers',
    cwd: workspaceRoot,
    args: 'services/prism-memory/scripts/start-workers.sh',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    launcher: 'shell',
    packageDir: path.join(workspaceRoot, 'services', 'prism-memory'),
  },
];

for (const service of bundledServices) {
  if (hasPackageJson(service.packageDir)) {
    apps.push(service.launcher === 'shell' ? shellApp(service) : npmApp(service));
  }
}

module.exports = { apps };