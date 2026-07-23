"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { submitReviewAction, deleteReviewAction } from "@/app/actions/reviews";

export interface RatingInfo {
  rate: number;
  count: number;
  totalPoints: number;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  experience: string | null;
  reviewer_email: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email?: string;
  } | null;
}

interface RatingsContextType {
  ratings: Record<string, RatingInfo>;
  productReviews: Record<string, Review[]>;
  hasMoreReviews: Record<string, boolean>;
  isLoadingReviews: boolean;
  loadProductReviews: (productId: string, loadMore?: boolean) => Promise<void>;
  getProductReviews: (productId: string) => Review[];
  getUserReview: (productId: string) => Review | null;
  updateRating: (productId: string, rating: number, experience?: string) => Promise<{ success?: boolean; error?: string }>;
  deleteUserReview: (productId: string) => Promise<{ success?: boolean; error?: string }>;
  isReviewed: (productId: string) => boolean;
}

const RatingsContext = createContext<RatingsContextType | undefined>(undefined);
const AVATAR_BUCKET = "avatars";

const getAvatarPath = (value: any) => {
  if (!value) return "";
  const rawValue = String(value);

  try {
    const url = new URL(rawValue);
    const marker = `/${AVATAR_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    }
  } catch {
    // Stored value may already be a storage path.
  }

  return rawValue.split("?")[0];
};

const resolveAvatarUrl = async (storedValue: any) => {
  const path = getAvatarPath(storedValue);
  if (!path) return "";

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (!error && data?.signedUrl) return data.signedUrl;

  const { data: publicData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);

  return publicData?.publicUrl || storedValue;
};

const addProfilesToReviews = async (reviews: any[], sessionUser: any): Promise<Review[]> => {
  if (!reviews?.length) return [];

  const userIds = [...new Set(reviews.map((review) => review.user_id).filter(Boolean))];
  let profilesById: Record<string, any> = {};

  if (userIds.length) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (error) {
      console.warn("Failed to fetch review profiles:", error.message);
    } else {
      const resolvedProfiles = await Promise.all(
        (profiles || []).map(async (profile) => ({
          ...profile,
          avatar_url: await resolveAvatarUrl(profile.avatar_url),
        })),
      );

      profilesById = resolvedProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
    }
  }

  return reviews.map((review) => ({
    ...review,
    reviewer_email:
      review.reviewer_email ||
      review.email ||
      (sessionUser?.id === review.user_id ? sessionUser.email : ""),
    profiles: profilesById[review.user_id] || null,
  }));
};

export function RatingsProvider({ children }: { children: React.ReactNode }) {
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const [productReviews, setProductReviews] = useState<Record<string, Review[]>>({});
  const [hasMoreReviews, setHasMoreReviews] = useState<Record<string, boolean>>({});
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setUserSession(sessionData.session);
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserSession(session);
    });

    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  /**
   * lazy load reviews for a specific product in paginated batches.
   * Fetches PAGE_SIZE + 1 reviews (21 rows) to check if more reviews exist,
   * rendering only the first PAGE_SIZE (20 rows) and setting hasMore accordingly.
   * Explicitly orders reviews by 'created_at' DESC to show newest reviews first.
   */
  const loadProductReviews = async (productId: string, loadMore = false) => {
    setIsLoadingReviews(true);
    try {
      const currentReviews = loadMore ? (productReviews[productId] || []) : [];
      const offset = currentReviews.length;

      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false }) // Explicit ordering newest first
        .range(offset, offset + PAGE_SIZE); // Fetch PAGE_SIZE + 1 items

      if (error) {
        console.error('Failed to fetch product reviews:', error);
        return;
      }

      const hasMore = (reviews || []).length > PAGE_SIZE;
      const pageReviews = hasMore ? reviews.slice(0, PAGE_SIZE) : (reviews || []);

      const { data: sessionData } = await supabase.auth.getSession();
      const reviewsWithProfiles = await addProfilesToReviews(pageReviews, sessionData.session?.user);

      const mergedReviews = [...currentReviews, ...reviewsWithProfiles];

      setProductReviews(prev => ({
        ...prev,
        [productId]: mergedReviews
      }));

      setHasMoreReviews(prev => ({
        ...prev,
        [productId]: hasMore
      }));

      // Calculate initial client ratings state from all ratings of this product
      const { data: allRatings } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId);

      if (allRatings) {
        const count = allRatings.length;
        const totalPoints = allRatings.reduce((sum, r) => sum + r.rating, 0);
        setRatings(prev => ({
          ...prev,
          [productId]: { count, rate: count > 0 ? totalPoints / count : 0, totalPoints }
        }));
      }
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const getProductReviews = (productId: string) => {
    return productReviews[productId] || [];
  };

  const getUserReview = (productId: string) => {
    if (!userSession?.user?.id) return null;
    const reviews = productReviews[productId] || [];
    return reviews.find(r => r.user_id === userSession.user.id) || null;
  };

  /**
   * MUTATION DESIGN NOTE:
   * Direct cache invalidation calls are removed from RatingsProvider.
   * The RatingsProvider delegates writes to submitReviewAction/deleteReviewAction Server Actions
   * which execute mutations and call revalidateTag(...) inside the server execution block.
   */
  const updateRating = async (productId: string, rating: number, experience?: string) => {
    if (!userSession?.user?.id) return { error: "Not authenticated" };

    const res = await submitReviewAction(productId, rating, experience);

    if (res.error) {
      return { error: res.error };
    }

    if (res.success && res.data) {
      // Reload reviews and update client aggregates on success
      await loadProductReviews(productId, false);
      return { success: true };
    }

    return { error: "Failed to save review" };
  };

  const deleteUserReview = async (productId: string) => {
    if (!userSession?.user?.id) return { error: "Not authenticated" };

    const res = await deleteReviewAction(productId);

    if (res.error) {
      return { error: res.error };
    }

    if (res.success) {
      // Reload reviews and update client aggregates on success
      await loadProductReviews(productId, false);
      return { success: true };
    }

    return { error: "Failed to delete review" };
  };

  const isReviewed = (productId: string) => {
    return getUserReview(productId) !== null;
  };

  const value = {
    ratings,
    productReviews,
    hasMoreReviews,
    isLoadingReviews,
    loadProductReviews,
    getProductReviews,
    getUserReview,
    updateRating,
    deleteUserReview,
    isReviewed,
  };

  return (
    <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>
  );
}

export function useRatings() {
  const context = useContext(RatingsContext);
  if (context === undefined) {
    throw new Error("useRatings must be used within a RatingsProvider");
  }
  return context;
}
