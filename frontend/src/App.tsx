import { ViewerPage } from './pages/ViewerPage';
import { ViewerProvider } from './state/ViewerProvider';

function App() {
  return (
    <ViewerProvider>
      <ViewerPage />
    </ViewerProvider>
  );
}

export default App;
