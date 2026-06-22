import { Product } from "./Product";

export interface CartItem extends Product {
  quantity?: number;
  // Backend cart row UUID. Set when the item was persisted via POST /cart so
  // that subsequent PUT /cart/:id and DELETE /cart/:id calls can target it.
  cartRowId?: string;
}