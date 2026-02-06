import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface AssociationAdmin {
  id: string;
  association_id: string;
  user_id: string;
}

export function useAssociationAdminRole() {
  const { user } = useAuth();
  const [associationAdmins, setAssociationAdmins] = useState<AssociationAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssociationAdmins = async () => {
      if (!user) {
        setAssociationAdmins([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('association_admins')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          logger.error('Error fetching association admins:', error);
          setAssociationAdmins([]);
        } else {
          setAssociationAdmins(data || []);
        }
      } catch (error) {
        logger.error('Error fetching association admins:', error);
        setAssociationAdmins([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssociationAdmins();
  }, [user]);

  const isAssociationAdmin = (associationId: string) => {
    return associationAdmins.some(aa => aa.association_id === associationId);
  };

  const managedAssociationIds = associationAdmins.map(aa => aa.association_id);

  return { 
    associationAdmins, 
    isAssociationAdmin, 
    managedAssociationIds,
    loading 
  };
}
