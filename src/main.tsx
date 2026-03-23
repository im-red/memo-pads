import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './styles.css';

const isNative = Capacitor.isNativePlatform();

async function initCapacitor() {
  if (!isNative) {
    console.info('Running on web, skipping native-only Capacitor setup.');
    return;
  }

  try {
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Dark });
    }

    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
    });

    console.log('Capacitor initialized successfully');
  } catch (error) {
    console.error('Error initializing Capacitor:', error);
  }
}

if (Capacitor.isPluginAvailable('Keyboard')) {
  Keyboard.addListener('keyboardWillShow', info => {
    console.log('keyboard will show with height:', info.keyboardHeight);
  });

  Keyboard.addListener('keyboardWillHide', () => {
    console.log('keyboard will hide');
  });
}

async function bootstrap() {
  await initCapacitor();

  const rootElement = document.getElementById('app');

  if (!rootElement) {
    throw new Error('Unable to find root element with id "app"');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
