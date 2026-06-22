import { FC, useEffect } from "react";
import { useAppDispatch } from "../redux/hooks";
import {
  updateNewList,
  updateFeaturedList,
} from "../redux/features/productSlice";
import { Product } from "../models/Product";
import LatestProducts from "../components/LatestProducts";
import HeroSection from "../components/HeroSection";
import Features from "../components/Features";
import TrendingProducts from "../components/TrendingProducts";
import Banner from "../components/Banner";
import { productsApi } from "../api";

const Home: FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const result = await productsApi.list({ limit: 24 });
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
        dispatch(updateFeaturedList(products.slice(0, 8)));
        dispatch(updateNewList(products.slice(8, 16)));
      } catch (err) {
        console.error("Home: failed to load products", err);
      }
    };
    fetchProducts();
  }, [dispatch]);

  return (
    <div className="dark:bg-slate-800">
      <HeroSection />
      <Features />
      <TrendingProducts />
      <Banner />
      <LatestProducts />
      <br />
    </div>
  );
};

export default Home;