/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

import { useAvatar } from "@/hooks/useAvatar";
import { useAuth } from "@/context/AuthContext";

export const Avatar = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const displayName = user?.user_metadata.name || user?.email?.split("@")[0] || "U";
  const avatarUrl = useAvatar(displayName, {
    size: 69,
    rounded: true,
    backgroundColors: ["#FF5733", "#3357FF", "#33FF57"],
  });

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = avatarUrl;
    setIsLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-w-[50px] min-h-[50px] size-[50px] rounded-[50px] border-3 object-cover border-white shadow-[0_0_14px_rgba(0,0,0,0.14)] overflow-hidden">
      {isLoading && (
        <div className="size-full flex items-center justify-center">
          <div className="loading loading-spinner text-primary"></div>
        </div>
      )}
      <img
        onLoad={handleImageLoad}
        onError={handleImageError}
        alt={`Avatar de ${displayName}`}
        src={user?.user_metadata.avatar_url || avatarUrl}
        className={`size-full object-cover ${isLoading ? "hidden" : ""}`}
      />
    </div>
  );
};
