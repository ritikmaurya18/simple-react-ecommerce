// API client for the generated NestJS backend.
//
// Centralised features:
//  - Base URL is read from VITE_API_BASE_URL (deploy pipeline sets this).
//    Falls back to the older VITE_API_URL or REACT_APP_API_URL for safety.
//  - Every response goes through a single unwrap so call sites see the
//    payload (response.data.data) plus pagination fields directly.
//  - Bearer token is attached on every non-/auth/* request, sourced from
//    localStorage["auth_token"]. On a 401 for a non-auth endpoint the token
//    is cleared so the user is forced back to the login modal.

const RAW_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.REACT_APP_API_URL as string | undefined) ||
  "";

export const BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

// ---------- Token storage ----------------------------------------------

export const TOKEN_KEY = "auth_token";
export const USERNAME_KEY = "username";

export const getToken = (): string | null => {
  try {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
  } catch {
    return null;
  }
};

export const setToken = (token: string) => {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore quota errors */
  }
};

export const clearToken = () => {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

// ---------- Types ------------------------------------------------------

export interface ApiResult<T> {
  data: T;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface BackendProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  thumbnail: string;
  images: string[];
  category: string;
  brand: string;
  stock: number;
  discountPercentage: number;
}

export interface BackendCategory {
  id: string;
  name: string;
  slug: string;
  url: string;
}

export interface BackendCategoryWithProducts extends BackendCategory {
  products: Array<{
    id: string;
    title: string;
    price: number | null;
    rating: number | null;
    thumbnail: string | null;
    category: string;
    discountPercentage: number | null;
  }>;
}

export interface BackendCartItem {
  id: string;
  product_id: string;
  title: string | null;
  price: number | null;
  thumbnail: string | null;
  category: string | null;
  rating: number | null;
  discountPercentage: number | null;
  quantity: number;
}

export interface BackendWishlistItem {
  id: string;
  product_id: string;
  title: string | null;
  price: number | null;
  thumbnail: string | null;
  category: string | null;
  rating: number | null;
  discountPercentage: number | null;
}

export interface BackendReview {
  id: string;
  product_id: string;
  username: string;
  rating: number;
  review: string;
  created_at: string;
}

export interface SignInResponse {
  message: string;
  token: string;
  user_id: string;
  email: string;
  name: string;
  is_email_verified: number;
  role: string | null;
}

// ---------- Internal fetch helper --------------------------------------

const isAuthEndpoint = (path: string) => path.startsWith("/auth");

const buildUrl = (
  path: string,
  query?: Record<string, unknown>
): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  let url = `${BASE_URL}${cleanPath}`;
  if (query) {
    const params = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
      )
      .join("&");
    if (params) url += `?${params}`;
  }
  return url;
};

async function request<T>(
  method: string,
  path: string,
  options: { query?: Record<string, unknown>; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const url = buildUrl(path, options.query);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!isAuthEndpoint(path)) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body:
      options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  // Token is only considered "stale" when a non-auth endpoint rejects with 401.
  // Auth endpoints surface the error to the login form.
  if (res.status === 401 && !isAuthEndpoint(path)) {
    clearToken();
  }

  const payload = await res.json().catch(() => ({} as Record<string, any>));

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && payload.message) ||
      res.statusText ||
      `Request failed with status ${res.status}`;
    throw new Error(String(message));
  }

  // Centralised envelope unwrap: backend returns
  //   { message, data, [total, page, limit, totalPages] }
  // We expose the unwrapped `data` plus the pagination fields directly.
  if (payload && typeof payload === "object" && "data" in payload) {
    return {
      data: payload.data as T,
      total: payload.total,
      page: payload.page,
      limit: payload.limit,
      totalPages: payload.totalPages,
    };
  }

  // Defensive fallback for endpoints that don't follow the envelope (rare).
  return { data: payload as T };
}

// ---------- Raw HTTP wrappers ------------------------------------------

export const api = {
  get: <T,>(path: string, query?: Record<string, unknown>) =>
    request<T>("GET", path, { query }),
  post: <T,>(path: string, body?: unknown) =>
    request<T>("POST", path, { body }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>("PUT", path, { body }),
  del: <T,>(path: string, query?: Record<string, unknown>) =>
    request<T>("DELETE", path, { query }),
};

// ---------- Resource helpers -------------------------------------------

export const productsApi = {
  list: (params?: {
    limit?: number;
    page?: number;
    category?: string;
    q?: string;
  }) => api.get<BackendProduct[]>("/products", params),
  get: (id: string) => api.get<BackendProduct>(`/products/${id}`),
};

export const categoriesApi = {
  list: (params?: { limit?: number; page?: number }) =>
    api.get<BackendCategory[]>("/categories", params),
  bySlug: (
    slug: string,
    params?: { page?: number; limit?: number }
  ) => api.get<BackendCategoryWithProducts>(`/categories/${slug}`, params),
};

export const cartApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<BackendCartItem[]>("/cart", params),
  add: (product_id: string, quantity: number) =>
    api.post<{ id: string; product_id: string; quantity: number }>(
      "/cart",
      { product_id, quantity }
    ),
  update: (id: string, quantity: number) =>
    api.put<{ id: string; product_id: string; quantity: number }>(
      `/cart/${id}`,
      { quantity }
    ),
  remove: (id: string) => api.del<{ id: string }>(`/cart/${id}`),
  empty: () => api.del<{ id: string }>("/cart"),
};

export const wishlistApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<BackendWishlistItem[]>("/wishlist", params),
  add: (product_id: string) =>
    api.post<{ id: string; product_id: string }>("/wishlist", {
      product_id,
    }),
  remove: (id: string) => api.del<{ id: string }>(`/wishlist/${id}`),
};

export const reviewsApi = {
  list: (params: { product_id?: string; page?: number; limit?: number }) =>
    api.get<BackendReview[]>("/reviews", params),
  add: (body: {
    product_id: string;
    username: string;
    rating: number;
    review: string;
  }) => api.post<BackendReview>("/reviews", body),
};

export const authApi = {
  signIn: (email: string, password: string) =>
    api.post<SignInResponse>("/auth/signin", { email, password }),
  signUp: (email: string, password: string, name?: string) =>
    api.post<{
      message: string;
      user_id: string;
      email: string;
      name: string;
    }>("/auth/signup", { email, password, name }),
};

// ---------- Legacy endpoint map ----------------------------------------
// Kept so the few components that still destructure API_ENDPOINTS keep
// compiling. New code should use the typed helpers above.
export const API_ENDPOINTS = {
  PRODUCTS: `${BASE_URL}/products`,
  PRODUCTS_CATEGORIES: `${BASE_URL}/categories`,
  PRODUCTS_SEARCH: `${BASE_URL}/products`,
  PRODUCTS_CATEGORY: `${BASE_URL}/categories`,
  PRODUCTS_ID: `${BASE_URL}/products/:id`,
  PRODUCTS_CATEGORY_ID: `${BASE_URL}/categories/:id`,
  PRODUCTS_CATEGORY_ID_PRODUCTS: `${BASE_URL}/categories/:id/products`,
  PRODUCTS_CATEGORY_ID_PRODUCTS_ID: `${BASE_URL}/categories/:id/products/:id`,
  PRODUCTS_CATEGORY_ID_PRODUCTS_ID_PRODUCTS: `${BASE_URL}/categories/:id/products/:id/products`,
  USER: `${BASE_URL}/user/:id`,
};