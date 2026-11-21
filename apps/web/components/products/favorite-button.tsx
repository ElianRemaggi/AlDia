"use client";

import { StarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/forms";
import { useToggleFavorite } from "@/lib/hooks/use-products";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  productId,
  productName,
  isFavorite,
  size = "icon-sm",
}: {
  productId: string;
  productName: string;
  isFavorite: boolean;
  size?: "icon-sm" | "icon";
}) {
  const toggle = useToggleFavorite();

  return (
    <Button
      variant="ghost"
      size={size}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Quitar ${productName} de favoritos` : `Marcar ${productName} como favorito`}
      title={isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
      onClick={(e) => {
        e.stopPropagation(); // rows are clickable
        toggle.mutate(
          { id: productId, favorite: !isFavorite },
          { onError: (error) => toast.error(errorMessage(error)) },
        );
      }}
    >
      <StarIcon className={cn(isFavorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
    </Button>
  );
}
