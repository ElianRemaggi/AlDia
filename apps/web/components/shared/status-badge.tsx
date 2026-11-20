import { Badge } from "@/components/ui/badge";

export function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="secondary">Activo</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Inactivo
    </Badge>
  );
}
