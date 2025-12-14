// Test script to check dark mode functionality
// Run this in the browser console on the application

console.log('=== Dark Mode Test ===');

// Check initial theme
console.log('Initial theme in localStorage:', localStorage.getItem('theme'));
console.log('Initial HTML classes:', document.documentElement.className);

// Function to simulate theme toggle clicks
function testThemeToggle() {
  const toggleButton = document.querySelector('button[title*="切换"], button[title*="mode"]');

  if (!toggleButton) {
    console.error('Theme toggle button not found!');
    return;
  }

  console.log('Found theme toggle button');

  // Test 5 cycles of toggling
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      console.log(`\n--- Toggle ${i + 1} ---`);
      console.log('Before click - Theme:', localStorage.getItem('theme'));
      console.log('Before click - HTML classes:', document.documentElement.className);

      toggleButton.click();

      setTimeout(() => {
        console.log('After click - Theme:', localStorage.getItem('theme'));
        console.log('After click - HTML classes:', document.documentElement.className);

        // Check if theme actually changed
        const currentTheme = localStorage.getItem('theme');
        const hasDarkClass = document.documentElement.classList.contains('dark');
        const hasLightClass = document.documentElement.classList.contains('light');

        console.log('Has dark class:', hasDarkClass);
        console.log('Has light class:', hasLightClass);

        if (currentTheme === 'dark' && !hasDarkClass) {
          console.error('ERROR: Theme is dark but no dark class on HTML');
        } else if (currentTheme === 'light' && !hasLightClass) {
          console.error('ERROR: Theme is light but no light class on HTML');
        } else {
          console.log('✓ Theme applied correctly');
        }
      }, 100);
    }, i * 500);
  }
}

// Run the test
testThemeToggle();

// Also check for the theme context value
setTimeout(() => {
  console.log('\n=== Checking React DevTools ===');
  console.log('If you have React DevTools, inspect the ThemeProvider and ThemeToggle components');
  console.log('Check if the theme value is updating correctly');
}, 3000);