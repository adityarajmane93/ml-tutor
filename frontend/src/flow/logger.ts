export const devLog = (...args: any[]) => {
  // If you are using Vite:
  if (import.meta.env.MODE === 'development') {
    console.log(...args);
  }
  
  // If you are using Create React App / Webpack:
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};