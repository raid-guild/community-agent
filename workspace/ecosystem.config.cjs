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
  npmApp({
    name: 'prism-agent-site',
    cwd: path.join(workspaceRoot, 'portfolio-site'),
    args: 'run start:site',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      SITE_BASE_PATH: process.env.SITE_BASE_PATH || '/site',
    },
  }),
];

const optionalServices = [
  {
    name: 'prism-agent-discord-bot',
    cwd: path.join(workspaceRoot, 'services', 'discord-bot'),
    args: 'run start',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
  },
  {
    name: 'prism-agent-prism-memory',
    cwd: path.join(workspaceRoot, 'services', 'prism-memory'),
    args: 'run start',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
  },
  {
    name: 'prism-agent-prism-memory-workers',
    cwd: path.join(workspaceRoot, 'services', 'prism-memory'),
    args: 'run start:workers',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
  },
];

for (const service of optionalServices) {
  const shouldStart = service.name === 'prism-agent-discord-bot'
    ? hasPackageJson(service.cwd) && Boolean(process.env.DISCORD_BOT_TOKEN)
    : service.name === 'prism-agent-prism-memory-workers'
      ? hasPackageJson(service.cwd) && process.env.PRISM_WORKERS_ENABLED !== '0'
    : hasPackageJson(service.cwd);

  if (shouldStart) {
    apps.push(npmApp(service));
  }
}

module.exports = { apps };