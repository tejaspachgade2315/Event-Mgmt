import { getToken } from "@/lib/token";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  profiles: [],
  loading: false,
  error: null,
};

export const fetchProfiles = createAsyncThunk(
  "profiles/fetchProfiles",
  async (_, { rejectWithValue }) => {
    try {
      const token = getToken("authToken");
      if (!token) return rejectWithValue("Unauthorized");

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/auth/all-users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.data.users;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const profilesSlice = createSlice({
  name: "profiles",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfiles.fulfilled, (state, action) => {
        state.loading = false;
        state.profiles = action.payload;
      })
      .addCase(fetchProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default profilesSlice.reducer;
