export const devLog = (...args: any[]) => {
  // If using Vite:
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'development') {
    console.log(...args);
    return; // Exit the function immediately so it doesn't crash on the next line!
  }
  
  // If using Create React App / Webpack:
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};