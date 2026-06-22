import { FC, useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { addProducts } from "../redux/features/productSlice";
import { Product } from "../models/Product";
import { updateLoading } from "../redux/features/homeSlice";
import SortProducts from "../components/SortProducts";
import PaginatedProducts from "../components/PaginatedProducts";
import { productsApi } from "../api";

const AllProducts: FC = () => {
  const dispatch = useAppDispatch();
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const allProducts = useAppSelector(
    (state) => state.productReducer.allProducts
  );
  const isLoading = useAppSelector((state) => state.homeReducer.isLoading);

  useEffect(() => {
    const fetchProducts = async () => {
      dispatch(updateLoading(true));
      try {
        const result = await productsApi.list({ limit: 500 });
        const products: Product[] = Array.isArray(result.data)
          ? result.data.map((p) => ({
              id: parseInt(p.id, 10),
              title: p.title,
              price: p.price,
              rating: p.rating,
              thumbnail: p.thumbnail,
              images: p.images,
              category: p.category,
              brand: p.brand,
              stock: p.stock,
              discountPercentage: p.discountPercentage,
              description: p.description,
            }))
          : [];
        dispatch(addProducts(products));
      } catch (err) {
        console.error("AllProducts: failed to load products", err);
      } finally {
        dispatch(updateLoading(false));
      }
    };

    if (allProducts.length === 0) fetchProducts();
  }, [allProducts, dispatch]);

  useEffect(() => {
    setCurrentProducts(allProducts);
  }, [allProducts]);

  return (
    <div className="container mx-auto min-h-[83vh] p-4 font-karla">
      <div className="grid grid-cols-4 gap-1">
        <div className="col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg dark:text-white">PRODUCTS</span>
            <SortProducts products={currentProducts} onChange={setCurrentProducts} />
          </div>

          <PaginatedProducts products={currentProducts} isLoading={isLoading} initialRows={5} />
        </div>
      </div>
    </div>
  );
};

export default AllProducts;