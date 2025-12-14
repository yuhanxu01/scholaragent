import React from 'react';

export const SimpleTestPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>Simple Test Page</h1>
      <p>If you can see this, routing is working!</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
};