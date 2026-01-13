import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  association_id: string | null;
  created_at: string;
}

interface AnnouncementsBannerProps {
  associationId?: string | null;
}

export const AnnouncementsBanner = ({ associationId }: AnnouncementsBannerProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, [associationId]);

  const fetchAnnouncements = async () => {
    try {
      let query = supabase
        .from('announcements')
        .select('id, title, content, image_url, association_id, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching announcements:', error);
        return;
      }

      // Filter: show global announcements or ones matching current association
      const filtered = (data || []).filter(a => 
        a.association_id === null || a.association_id === associationId
      );

      setAnnouncements(filtered);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.includes(a.id));

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  const current = visibleAnnouncements[currentIndex % visibleAnnouncements.length];

  const goNext = () => {
    setCurrentIndex(prev => (prev + 1) % visibleAnnouncements.length);
  };

  const goPrev = () => {
    setCurrentIndex(prev => (prev - 1 + visibleAnnouncements.length) % visibleAnnouncements.length);
  };

  const dismissCurrent = () => {
    setDismissed(prev => [...prev, current.id]);
    if (currentIndex >= visibleAnnouncements.length - 1) {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="px-4 py-2">
      <Card className="bg-primary/5 border-primary/20 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Image */}
            {current.image_url && (
              <div className="w-24 h-24 flex-shrink-0">
                <img
                  src={current.image_url}
                  alt={current.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-semibold text-sm truncate">{current.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={dismissCurrent}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {current.content}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(current.created_at), 'dd MMM yyyy', { locale: tr })}
                </span>
                
                {visibleAnnouncements.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={goPrev}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {(currentIndex % visibleAnnouncements.length) + 1}/{visibleAnnouncements.length}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={goNext}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
