import React, { useState } from 'react';
import {
  IonMenu, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonItem, IonLabel,
  IonIcon, IonMenuToggle, IonFooter, useIonRouter
} from '@ionic/react';
import {
  homeOutline,
  settingsOutline,
  trashOutline,
  downloadOutline,
  logInOutline,
  bookOutline
} from 'ionicons/icons';
import useAppVersion from '../hooks/useAppVersion';
import ExportOverlay from './ExportOverlay';
import ImportOverlay from './ImportOverlay';
import WeReadImportOverlay from './WeReadImportOverlay';
import { useApp } from '../data/AppContext';

const SideMenu: React.FC = () => {
  const { fullString: versionString } = useAppVersion();
  const { notebooks, memos, importData, weReadImport } = useApp();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isWeReadImportOpen, setIsWeReadImportOpen] = useState(false);
  const router = useIonRouter();

  // Only show the menu on the home page ("/")
  // Ionic routing uses an empty string or "/" for the root route depending on the exact state
  const disabled = router.routeInfo.pathname !== '/' && router.routeInfo.pathname !== '';

  return (
    <>
      <IonMenu contentId="main" menuId="side-menu" side="start" disabled={disabled}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Menu</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList lines="full">
            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/trash" routerDirection="root">
                <IonIcon icon={trashOutline} slot="start" />
                <IonLabel>Trash Bin</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonItem button onClick={() => setIsExportOpen(true)}>
              <IonIcon icon={downloadOutline} slot="start" />
              <IonLabel>Export Data</IonLabel>
            </IonItem>
            <IonItem button onClick={() => setIsImportOpen(true)}>
              <IonIcon icon={logInOutline} slot="start" />
              <IonLabel>Import Data</IonLabel>
            </IonItem>
            <IonItem button onClick={() => setIsWeReadImportOpen(true)}>
              <IonIcon icon={bookOutline} slot="start" />
              <IonLabel>Import WeRead Notes</IonLabel>
            </IonItem>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/settings" routerDirection="root">
                <IonIcon icon={settingsOutline} slot="start" />
                <IonLabel>Settings</IonLabel>
              </IonItem>
            </IonMenuToggle>
          </IonList>
        </IonContent>
        <IonFooter>
          <IonToolbar>
            <IonTitle size="small" className="ion-text-center">{versionString}</IonTitle>
          </IonToolbar>
        </IonFooter>
      </IonMenu>

      <ExportOverlay
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
      <ImportOverlay
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
      <WeReadImportOverlay
        isOpen={isWeReadImportOpen}
        onClose={() => setIsWeReadImportOpen(false)}
      />
    </>
  );
};

export default SideMenu;
