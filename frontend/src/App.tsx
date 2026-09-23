import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ViewerPage } from './pages/ViewerPage';
import { useViewer } from './state/viewer';
import { ViewerProvider } from './state/ViewerProvider';

/**
 * Das äußere Auffangnetz (Issue #73). Es liegt **innerhalb** des Providers:
 * so kennt die Fehlerseite den einen Umstand, den die Meldung braucht — ob
 * überhaupt eine Datei geladen war — und der Neuaufbau setzt den Stand nicht
 * zurück, weil der Zustand über dem Netz liegt.
 */
function ViewerMitNetz() {
  const { lv } = useViewer();
  return (
    <ErrorBoundary bereich="app" dateiGeladen={lv !== null}>
      <ViewerPage />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ViewerProvider>
      <ViewerMitNetz />
    </ViewerProvider>
  );
}

export default App;
