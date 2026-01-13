import { MapPin, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Association {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface AssociationSelectorProps {
  associations: Association[];
  currentAssociationId: string;
  onAssociationChange: (id: string) => void;
}

export function AssociationSelector({ 
  associations, 
  currentAssociationId, 
  onAssociationChange 
}: AssociationSelectorProps) {
  if (associations.length === 0) {
    return null;
  }

  const currentAssociation = associations.find(a => a.id === currentAssociationId);

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <Select value={currentAssociationId} onValueChange={onAssociationChange}>
          <SelectTrigger className="flex-1 bg-secondary border-0">
            <SelectValue placeholder="Dernek Seçin">
              {currentAssociation?.name || 'Dernek Seçin'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {associations.map((association) => (
              <SelectItem key={association.id} value={association.id}>
                {association.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
