import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Edit, Megaphone, Loader2, Calendar, Building2, Upload, ImageIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  association_id: string | null;
  created_by: string;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Association {
  id: string;
  name: string;
  slug: string;
}

const Announcements = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { toast } = useToast();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedAssociation, setSelectedAssociation] = useState<string>('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const newImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast({
        title: "Erişim Reddedildi",
        description: "Bu sayfaya erişim yetkiniz yok.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAdmin, adminLoading, user, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [announcementsRes, associationsRes] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('associations').select('id, name, slug').order('name'),
      ]);

      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      if (associationsRes.data) setAssociations(associationsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File, announcementId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${announcementId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('announcement-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('announcement-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearNewImage = () => {
    setNewImage(null);
    setNewImagePreview(null);
    if (newImageInputRef.current) {
      newImageInputRef.current.value = '';
    }
  };

  const clearEditImage = () => {
    setEditImage(null);
    setEditImagePreview(null);
    if (editImageInputRef.current) {
      editImageInputRef.current.value = '';
    }
    if (editingAnnouncement) {
      setEditingAnnouncement({ ...editingAnnouncement, image_url: null });
    }
  };

  const addAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: "Hata",
        description: "Başlık ve içerik gerekli.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setUploadingImage(!!newImage);

    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: newTitle.trim(),
          content: newContent.trim(),
          association_id: associations[0]?.id || null,
          created_by: user!.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        let imageUrl: string | null = null;

        if (newImage) {
          imageUrl = await uploadImage(newImage, data.id);
          if (imageUrl) {
            await supabase
              .from('announcements')
              .update({ image_url: imageUrl })
              .eq('id', data.id);
          }
        }

        setAnnouncements(prev => [{ ...data, image_url: imageUrl }, ...prev]);
        setNewTitle('');
        setNewContent('');
        setSelectedAssociation('');
        clearNewImage();
        setIsDialogOpen(false);
        toast({
          title: "Başarılı",
          description: "Duyuru eklendi.",
        });
      }
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const updateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    setSaving(true);
    setUploadingImage(!!editImage);

    try {
      let imageUrl = editingAnnouncement.image_url;

      if (editImage) {
        const newImageUrl = await uploadImage(editImage, editingAnnouncement.id);
        if (newImageUrl) {
          imageUrl = newImageUrl;
        }
      }

      const { error } = await supabase
        .from('announcements')
        .update({
          title: editingAnnouncement.title,
          content: editingAnnouncement.content,
          association_id: editingAnnouncement.association_id,
          is_active: editingAnnouncement.is_active,
          image_url: imageUrl,
        })
        .eq('id', editingAnnouncement.id);

      if (error) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setAnnouncements(prev => prev.map(a => 
        a.id === editingAnnouncement.id ? { ...editingAnnouncement, image_url: imageUrl } : a
      ));
      setEditingAnnouncement(null);
      setEditImage(null);
      setEditImagePreview(null);
      toast({
        title: "Başarılı",
        description: "Duyuru güncellendi.",
      });
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast({
      title: "Başarılı",
      description: "Duyuru silindi.",
    });
  };

  const toggleActive = async (announcement: Announcement) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !announcement.is_active })
      .eq('id', announcement.id);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setAnnouncements(prev => prev.map(a => 
      a.id === announcement.id ? { ...a, is_active: !a.is_active } : a
    ));
  };

  const getAssociationName = (associationId: string | null) => {
    if (!associationId) return 'Genel';
    const assoc = associations.find(a => a.id === associationId);
    return assoc?.name || 'Bilinmiyor';
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setEditImage(null);
    setEditImagePreview(null);
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Duyurular</h1>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              clearNewImage();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Duyuru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Yeni Duyuru Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Başlık</Label>
                  <Input
                    id="title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Duyuru başlığı"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">İçerik</Label>
                  <Textarea
                    id="content"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Duyuru içeriği"
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resim (Opsiyonel)</Label>
                  {newImagePreview ? (
                    <div className="relative">
                      <img
                        src={newImagePreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={clearNewImage}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => newImageInputRef.current?.click()}
                    >
                      <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Resim yüklemek için tıklayın</p>
                    </div>
                  )}
                  <input
                    ref={newImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleNewImageChange}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">İptal</Button>
                </DialogClose>
                <Button onClick={addAnnouncement} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {uploadingImage ? 'Yükleniyor...' : 'Ekle'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Announcements List */}
        <div className="grid gap-4">
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz duyuru yok</p>
              </CardContent>
            </Card>
          ) : (
            announcements.map(announcement => (
              <Card key={announcement.id} className={!announcement.is_active ? 'opacity-60' : ''}>
                <div className="flex">
                  {announcement.image_url && (
                    <div className="w-32 h-32 flex-shrink-0">
                      <img
                        src={announcement.image_url}
                        alt={announcement.title}
                        className="w-full h-full object-cover rounded-l-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{announcement.title}</CardTitle>
                            {!announcement.is_active && (
                              <Badge variant="secondary">Pasif</Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-2 text-xs">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(announcement.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                            <span className="mx-1">•</span>
                            <Building2 className="w-3 h-3" />
                            {getAssociationName(announcement.association_id)}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={announcement.is_active}
                            onCheckedChange={() => toggleActive(announcement)}
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(announcement)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Duyuru Düzenle</DialogTitle>
                              </DialogHeader>
                              {editingAnnouncement && (
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Başlık</Label>
                                    <Input
                                      value={editingAnnouncement.title}
                                      onChange={(e) => setEditingAnnouncement({
                                        ...editingAnnouncement,
                                        title: e.target.value
                                      })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>İçerik</Label>
                                    <Textarea
                                      value={editingAnnouncement.content}
                                      onChange={(e) => setEditingAnnouncement({
                                        ...editingAnnouncement,
                                        content: e.target.value
                                      })}
                                      rows={5}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Resim</Label>
                                    {(editImagePreview || editingAnnouncement.image_url) ? (
                                      <div className="relative">
                                        <img
                                          src={editImagePreview || editingAnnouncement.image_url || ''}
                                          alt="Preview"
                                          className="w-full h-32 object-cover rounded-lg"
                                        />
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          className="absolute top-2 right-2 h-6 w-6"
                                          onClick={clearEditImage}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div
                                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                        onClick={() => editImageInputRef.current?.click()}
                                      >
                                        <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Resim yüklemek için tıklayın</p>
                                      </div>
                                    )}
                                    <input
                                      ref={editImageInputRef}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleEditImageChange}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Dernek</Label>
                                    <Select
                                      value={editingAnnouncement.association_id || 'global'}
                                      onValueChange={(val) => setEditingAnnouncement({
                                        ...editingAnnouncement,
                                        association_id: val === 'global' ? null : val
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="global">Genel (Tüm Dernekler)</SelectItem>
                                        {associations.map(assoc => (
                                          <SelectItem key={assoc.id} value={assoc.id}>
                                            {assoc.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline" onClick={() => {
                                    setEditingAnnouncement(null);
                                    setEditImage(null);
                                    setEditImagePreview(null);
                                  }}>
                                    İptal
                                  </Button>
                                </DialogClose>
                                <Button onClick={updateAnnouncement} disabled={saving}>
                                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  {uploadingImage ? 'Yükleniyor...' : 'Kaydet'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAnnouncement(announcement.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                        {announcement.content}
                      </p>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
