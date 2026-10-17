import React, { createContext, useContext, useSyncExternalStore } from 'react';

const StoreContext = createContext(null);

export function Provider({ store, children }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Redux store is missing from the React tree.');
  return store;
}

export function useDispatch() {
  return useStore().dispatch;
}

export function useSelector(selector) {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
