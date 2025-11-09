const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const routes = [
  // User routes
  { path: '/home', filename: 'user-home.png', waitFor: 1000 },
  { path: '/today', filename: 'user-today.png', waitFor: 1000 },
  { path: '/workout', filename: 'user-workout.png', waitFor: 1000 },
  { path: '/workout/monday', filename: 'user-workout-day.png', waitFor: 1500 },
  { path: '/workout/today', filename: 'user-workout-today.png', waitFor: 1500 },
  { path: '/diet', filename: 'user-diet.png', waitFor: 1000 },
  { path: '/plans', filename: 'user-plans.png', waitFor: 1000 },
  { path: '/progress', filename: 'user-progress.png', waitFor: 1000 },
  { path: '/profile', filename: 'user-profile.png', waitFor: 1000 },
  { path: '/settings', filename: 'user-settings.png', waitFor: 1000 },
  
  // Admin routes
  { path: '/dashboard', filename: 'admin-dashboard.png', waitFor: 1000 },
  { path: '/analytics', filename: 'admin-analytics.png', waitFor: 1000 },
  { path: '/users', filename: 'admin-users.png', waitFor: 1000 },
  { path: '/users/1', filename: 'admin-user-detail.png', waitFor: 1000 },
  { path: '/users/add', filename: 'admin-users-add.png', waitFor: 1000 },
  { path: '/generate', filename: 'admin-generate.png', waitFor: 1000 },
  { path: '/generate/workout', filename: 'admin-generate-workout.png', waitFor: 1000 },
  { path: '/generate/diet', filename: 'admin-generate-diet.png', waitFor: 1000 },
];

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...');
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOT_DIR}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  for (const route of routes) {
    try {
      const url = `${BASE_URL}${route.path}`;
      console.log(`📸 Capturing: ${route.path} -> ${route.filename}`);
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for additional time if specified
      if (route.waitFor) {
        await new Promise(resolve => setTimeout(resolve, route.waitFor));
      }
      
      const screenshotPath = path.join(SCREENSHOT_DIR, route.filename);
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      
      console.log(`✅ Saved: ${route.filename}`);
    } catch (error) {
      console.error(`❌ Failed to capture ${route.path}:`, error.message);
    }
  }

  await browser.close();
  console.log('🎉 Screenshot capture complete!');
  console.log(`📂 All screenshots saved in: ${SCREENSHOT_DIR}`);
}

// Check if dev server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch (error) {
    return false;
  }
}

(async () => {
  console.log('🔍 Checking if dev server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Dev server is not running!');
    console.error('Please start the dev server first:');
    console.error('  cd gym-app && npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Dev server is running');
  await captureScreenshots();
})();
