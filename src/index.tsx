import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { LibP2PProvider } from './LibP2PContext';


ReactDOM.render(
  <React.StrictMode>
    <LibP2PProvider>
      <App /> 
    </LibP2PProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

