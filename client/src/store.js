import { configureStore, createSlice } from "@reduxjs/toolkit";

const session = createSlice({
  name: "session",
  initialState: { user: null, ready: false, unavailable: false },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.ready = true;
      state.unavailable = false;
    },
    clearUser(state) {
      state.user = null;
      state.ready = true;
      state.unavailable = false;
    },
    setAuthUnavailable(state) {
      state.ready = true;
      state.unavailable = true;
    },
  },
});

export const { setUser, clearUser, setAuthUnavailable } = session.actions;
export const store = configureStore({ reducer: { session: session.reducer } });
