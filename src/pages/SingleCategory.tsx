import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Product } from "../models/Product";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { updateLoading } from "../redux/features/homeSlice";
import SortProducts from "../components/SortProducts";
import PaginatedProducts from "../components/PaginatedProducts";
import { categoriesApi } from "../api";

const SingleCategory: FC = () => {
  const dispatch = useAppDispatch();
  const { slug } = useParams();
  const [productList, setProductList] = useState<Product[]>([]);
  const isLoading = useAppSelector((state) => state.homeReducer.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!slug) return;
      dispatch(updateLoading(true));
      try {
        const result = await categoriesApi.bySlug(slug, { limit: 500 });
        const products: Product[] = (result.data?.products ?? []).map(
          (p) => ({
            id: parseInt(p.id, 10),
            title: p.title,
            price: p.price ?? 0,
            rating: p.rating ?? 0,
            thumbnail: p.thumbnail ?? undefined,
            category: p.category,
            discountPercentage: p.discountPercentage ?? undefined,
          })
        );
        setProductList(products);
      } catch (err) {
        console.error("SingleCategory: failed to load", err);
        setProductList([]);
      } finally {
        dispatch(updateLoading(false));
      }
    };

    fetchProducts();
  }, [slug, dispatch]);

  return (
    <div className="container mx-auto min-h-[83vh] p-4 font-karla">
      <div className="flex items-center justify-between space-x-2 text-lg dark:text-white">
        <div>
          <button onClick={() => { navigate('/categories') }}>Categories</button>
          <span> {">"} </span>
          <span className="font-bold">{slug}</span>
        </div>
        <SortProducts products={productList} onChange={setProductList} />
      </div>
      <PaginatedProducts products={productList} isLoading={isLoading} initialRows={5} />
    </div>
  );
};

export default SingleCategory;