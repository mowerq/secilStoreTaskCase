import { configureStore } from "@reduxjs/toolkit";
import editCollectionReducer from "./slices/editCollectionSlice";

export const store = configureStore({
  reducer: {
    editCollection: editCollectionReducer,
  },
});

// Infer RootState and AppDispatch types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
