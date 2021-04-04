import React from 'react';
import { TabsLayout } from './layouts/Tabs/TabsLayout';
import { Dashboard } from './layouts/Dashboard/Dashboard';
import { detailMode } from './utils/config';
// @ts-ignore
import SnackbarProvider from 'react-simple-snackbar'

function App() {
  // The default and more refined layout is this one
  if (detailMode === 'modal') return (
    <SnackbarProvider>
      <Dashboard />
    </SnackbarProvider>
  );

  // Rejected layout that might be useful for prototyping a Tabs approach to detail views
  if (detailMode === 'tabs') return (
    <SnackbarProvider>
      <TabsLayout />
    </SnackbarProvider>
  );
  
  return null;
}

export default App;
