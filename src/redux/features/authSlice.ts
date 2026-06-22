import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthSlice } from "../../models/AuthSlice";
import { authApi, clearToken, setToken } from "../../api";

interface LoginProps {
  username: string;
  password: string;
}

const readStoredUsername = (): string => {
  try {
    return typeof window !== "undefined"
      ? window.localStorage.getItem("username") ?? ""
      : "";
  } catch {
    return "";
  }
};

// Session is restored from both the username and the JWT token; either alone
// is enough to consider the user logged in locally.
const hasStoredSession = (): boolean => {
  try {
    if (typeof window === "undefined") return false;
    const username = window.localStorage.getItem("username");
    const token = window.localStorage.getItem("auth_token");
    return Boolean(
      (username && username !== "") || (token && token !== "")
    );
  } catch {
    return false;
  }
};

const initialState: AuthSlice = {
  isLoggedIn: hasStoredSession(),
  modalOpen: false,
  username: readStoredUsername(),
};

// Best-effort backend signin. We attempt it first; if the backend has no
// matching account the doLogin reducer falls back to the hardcoded demo
// credentials (atuny0 / 9uQFF1Lh) so the original UX still works against
// deployments where no backend user was seeded.
export const loginUser = createAsyncThunk<
  { username: string; success: boolean; message?: string },
  { username: string; password: string }
>("auth/loginUser", async (creds, { rejectWithValue }) => {
  // The backend accepts email; treat the entered value as an email when it
  // looks like one, otherwise fall through to doLogin's local check.
  if (!creds.username.includes("@")) {
    return rejectWithValue("not_an_email") as any;
  }
  try {
    const result = await authApi.signIn(creds.username, creds.password);
    if (result.data?.token) {
      setToken(result.data.token);
    }
    const displayName = result.data?.name || creds.username;
    try {
      window.localStorage.setItem("username", displayName);
    } catch {
      /* ignore */
    }
    return {
      username: displayName,
      success: true,
      message: result.data?.message,
    };
  } catch (err: any) {
    return rejectWithValue(err?.message || "signin_failed");
  }
});

export const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    updateModal: (state, action: PayloadAction<boolean>) => {
      return { ...state, modalOpen: action.payload };
    },
    doLogin: (state, action: PayloadAction<LoginProps>) => {
      if (
        action.payload.username === "atuny0" &&
        action.payload.password === "9uQFF1Lh"
      ) {
        try {
          window.localStorage.setItem("username", "atuny0");
        } catch {
          /* ignore */
        }
        return {
          ...state,
          username: "atuny0",
          modalOpen: false,
          isLoggedIn: true,
        };
      } else {
        return state;
      }
    },
    setLoggedIn: (
      state,
      action: PayloadAction<{ username: string; token?: string }>
    ) => {
      const username = action.payload.username;
      try {
        window.localStorage.setItem("username", username);
      } catch {
        /* ignore */
      }
      if (action.payload.token) {
        setToken(action.payload.token);
      }
      return {
        ...state,
        username,
        modalOpen: false,
        isLoggedIn: true,
      };
    },
    doLogout: (state) => {
      try {
        window.localStorage.removeItem("username");
      } catch {
        /* ignore */
      }
      clearToken();
      return { ...state, username: "", isLoggedIn: false };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, action) => {
        if (action.payload?.success) {
          return {
            ...state,
            username: action.payload.username,
            modalOpen: false,
            isLoggedIn: true,
          };
        }
      })
      .addCase(loginUser.rejected, () => {
        // Keep the existing local-only login flow as a fallback so the
        // hardcoded demo creds still work when the backend rejects them.
      });
  },
});

export const { updateModal, doLogin, setLoggedIn, doLogout } =
  authSlice.actions;
export default authSlice.reducer;