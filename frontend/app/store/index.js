import { configureStore } from "@reduxjs/toolkit";
import profilesReducer from "./profiles/profileSlice";

export const store = configureStore({
  reducer: {
    profiles: profilesReducer,
  },
});
