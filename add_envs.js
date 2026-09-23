const { execSync } = require('child_process');

const envs = [
  { name: 'QSTASH_URL', value: 'https://qstash-us-east-1.upstash.io' },
  { name: 'QSTASH_TOKEN', value: 'eyJVc2VySUQiOiJhNmQzNDc1Yy0xZDlkLTQ4YTMtYTMzMS05ZDg4MjI4NjllYmUiLCJQYXNzd29yZCI6ImM2NDBjNmU3YzE2ZDRjMmJiYWU4ODk2Y2Q4OWM4NGFhIn0=' },
  { name: 'QSTASH_CURRENT_SIGNING_KEY', value: 'sig_6am5oNdk2Gnz5hoD9ZqT7sThYKdq' },
  { name: 'QSTASH_NEXT_SIGNING_KEY', value: 'sig_5yj6HzALBsX3y5yVNdkKzzPCY6pP' }
];

// Add to all environments
const targets = ['production', 'preview', 'development'];

for (const env of envs) {
  for (const target of targets) {
    console.log(`Adding ${env.name} to ${target}...`);
    try {
      execSync(`npx vercel env add ${env.name} ${target}`, { input: env.value, stdio: ['pipe', 'inherit', 'inherit'] });
    } catch (e) {
      console.log(`Failed to add ${env.name} to ${target}, it might already exist. Trying update...`);
      try {
        execSync(`npx vercel env update ${env.name} ${target}`, { input: env.value, stdio: ['pipe', 'inherit', 'inherit'] });
      } catch (err) {
        console.error(`Failed to update ${env.name} on ${target}`);
      }
    }
  }
}
