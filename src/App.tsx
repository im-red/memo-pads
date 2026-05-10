import React, { useEffect } from 'react';
import { Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { SplashScreen } from '@capacitor/splash-screen';
import { useIonRouter } from '@ionic/react';
import { AppProvider } from './data/AppContext';
import { BackButtonEvent } from '@ionic/core';
import { App as CapacitorApp } from '@capacitor/app';
import HomePage from './pages/HomePage';
import NotebookPage from './pages/NotebookPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import TrashBinPage from './pages/TrashBinPage';
import SideMenu from './components/SideMenu';
import { Capacitor } from '@capacitor/core';

setupIonicReact({
  mode: 'md',
});

// Component that handles back button - must be inside IonReactRouter
const BackButtonHandler: React.FC = () => {
  const ionRouter = useIonRouter();

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = (event: Event) => {
      const backButtonEvent = event as BackButtonEvent;
      backButtonEvent.detail.register(-1, () => {
        if (!ionRouter.canGoBack()) {
          CapacitorApp.exitApp();
        }
      });
    };

    document.addEventListener('ionBackButton', handleBackButton);

    return () => {
      document.removeEventListener('ionBackButton', handleBackButton);
    };
  }, [ionRouter]);

  return null;
};

const App: React.FC = () => {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (err) {
        console.warn('Error hiding splash screen', err);
      }
    };
    hideSplash();
  }, []);

  return (
    <IonApp>
      <AppProvider>
        <IonReactRouter>
          <BackButtonHandler />
          <SideMenu />
          <IonRouterOutlet id="main">
            <Route exact path="/" component={HomePage} />
            <Route exact path="/notebook/:id" component={NotebookPage} />
            <Route exact path="/settings" component={SettingsPage} />
            <Route exact path="/about" component={AboutPage} />
            <Route exact path="/trash" component={TrashBinPage} />
          </IonRouterOutlet>
        </IonReactRouter>
      </AppProvider>
    </IonApp>
  );
};

export default App;
