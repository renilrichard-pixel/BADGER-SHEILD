"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

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

const buildAggregates = (reviews: Review[]): Record<string, RatingInfo> => {
  const aggregated: Record<string, RatingInfo> = {};

  reviews.forEach((review) => {
    if (!aggregated[review.product_id]) {
      aggregated[review.product_id] = { rate: 0, count: 0, totalPoints: 0 };
    }

    aggregated[review.product_id].count += 1;
    aggregated[review.product_id].totalPoints += review.rating;
    aggregated[review.product_id].rate =
      aggregated[review.product_id].totalPoints / aggregated[review.product_id].count;
  });

  return aggregated;
};

export function RatingsProvider({ children }: { children: React.ReactNode }) {
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    const fetchAllReviews = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setUserSession(sessionData.session);

      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*');

      if (error) {
        console.error('Failed to fetch reviews:', error);
        return;
      }

      const reviewsWithProfiles = await addProfilesToReviews(reviews || [], sessionData.session?.user);
      setAllReviews(reviewsWithProfiles);
      setRatings(buildAggregates(reviewsWithProfiles));
    };

    fetchAllReviews();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserSession(session);
    });

    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const getProductReviews = (productId: string) => {
    return allReviews.filter(r => String(r.product_id) === String(productId));
  };

  const getUserReview = (productId: string) => {
    if (!userSession?.user?.id) return null;
    return allReviews.find(r => String(r.product_id) === String(productId) && r.user_id === userSession.user.id) || null;
  };

  const updateRating = async (productId: string, rating: number, experience?: string) => {
    if (!userSession?.user?.id) return { error: "Not authenticated" };

    const newReview = {
      user_id: userSession.user.id,
      product_id: productId,
      rating,
      experience: experience?.trim() || null,
      reviewer_email: userSession.user.email || null,
    };

    let { error: upsertError } = await supabase
      .from('reviews')
      .upsert(newReview, { onConflict: 'user_id,product_id' });

    if (
      upsertError &&
      (upsertError.message?.includes("reviewer_email") || upsertError.code === "PGRST204")
    ) {
      const reviewWithoutEmail: Record<string, any> = { ...newReview };
      delete reviewWithoutEmail.reviewer_email;
      const retry = await supabase
        .from('reviews')
        .upsert(reviewWithoutEmail, { onConflict: 'user_id,product_id' });
      upsertError = retry.error;
    }

    if (upsertError) {
      return { error: upsertError.message || "Failed to save review" };
    }

    const { data: reviewData, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userSession.user.id)
      .eq('product_id', productId);

    if (fetchError || !reviewData || reviewData.length === 0) {
      return { error: fetchError?.message || "Failed to retrieve review" };
    }

    const [data] = await addProfilesToReviews(reviewData, userSession.user);

    if (data) {
      const updatedReviews = allReviews.filter(r => !(r.user_id === userSession.user.id && String(r.product_id) === String(productId)));
      updatedReviews.push(data);
      setAllReviews(updatedReviews);

      const prodReviews = updatedReviews.filter(r => String(r.product_id) === String(productId));
      const count = prodReviews.length;
      const totalPoints = prodReviews.reduce((sum, r) => sum + r.rating, 0);
      
      setRatings(prev => ({
        ...prev,
        [productId]: { count, rate: count > 0 ? totalPoints / count : 0, totalPoints }
      }));

      return { success: true };
    }
    
    return { error: "Failed to save review" };
  };

  const deleteUserReview = async (productId: string) => {
    if (!userSession?.user?.id) return { error: "Not authenticated" };

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', userSession.user.id)
      .eq('product_id', productId);

    if (error) {
      return { error: error.message };
    }

    // Update allReviews by filtering out the deleted review
    const updatedReviews = allReviews.filter(r => !(r.user_id === userSession.user.id && String(r.product_id) === String(productId)));
    setAllReviews(updatedReviews);

    // Recalculate ratings based on updated reviews
    const prodReviews = updatedReviews.filter(r => String(r.product_id) === String(productId));
    const count = prodReviews.length;
    
    setRatings(prev => {
      const newRatings = { ...prev };
      if (count === 0) {
        delete newRatings[productId];
      } else {
        const totalPoints = prodReviews.reduce((sum, r) => sum + r.rating, 0);
        newRatings[productId] = { count, rate: totalPoints / count, totalPoints };
      }
      return newRatings;
    });

    return { success: true };
  };

  const isReviewed = (productId: string) => {
    return getUserReview(productId) !== null;
  };

  const value = {
    ratings,
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
