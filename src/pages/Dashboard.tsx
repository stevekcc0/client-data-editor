import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { LogOut, RefreshCw, Edit2, X, Save } from 'lucide-react';

interface SheetData {
  email: string;
  ig_account: string;
  subject: string;
  keyword: string;
  title: string;
  ig_link: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<SheetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SheetData | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user?.email) {
      fetchSheetData();
    }
  }, [user]);

  const fetchSheetData = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('fetch-sheet', {
        body: { userEmail: user.email },
      });

      if (error) {
        throw error;
      }

      if (result.success) {
        setData(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error: any) {
      console.error('Error fetching sheet:', error);
      toast({
        title: '錯誤',
        description: '無法載入 Google Sheet 資料',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...data[index] });
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (editingIndex === null || !editForm || !user) return;
    
    setSaving(true);
    try {
      // Check if record exists in database
      const { data: existingData } = await supabase
        .from('user_data')
        .select('id')
        .eq('user_id', user.id)
        .eq('email', editForm.email)
        .maybeSingle();

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('user_data')
          .update({
            ig_account: editForm.ig_account,
            subject: editForm.subject,
            keyword: editForm.keyword,
            title: editForm.title,
            ig_link: editForm.ig_link,
          })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_data')
          .insert({
            user_id: user.id,
            email: editForm.email,
            ig_account: editForm.ig_account,
            subject: editForm.subject,
            keyword: editForm.keyword,
            title: editForm.title,
            ig_link: editForm.ig_link,
          });

        if (error) throw error;
      }

      // Update local state
      const newData = [...data];
      newData[editingIndex] = editForm;
      setData(newData);
      
      setEditingIndex(null);
      setEditForm(null);
      
      toast({
        title: '成功',
        description: '資料已保存到雲端資料庫',
      });
    } catch (error: any) {
      console.error('Error saving data:', error);
      toast({
        title: '錯誤',
        description: '保存失敗，請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">我的資料</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSheetData} className="gap-2" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              重新載入
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              登出
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>Google Sheet 資料</CardTitle>
            <p className="text-sm text-muted-foreground">
              顯示與你電郵相符的資料（來自公開 Google Sheet）
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                找不到與 {user.email} 相符的資料
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>電郵</TableHead>
                      <TableHead>IG Account</TableHead>
                      <TableHead>主題</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead>標題</TableHead>
                      <TableHead>IG Link</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell>
                          {editingIndex === index ? (
                            <Input
                              value={editForm?.ig_account || ''}
                              onChange={(e) => setEditForm({ ...editForm!, ig_account: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.ig_account || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingIndex === index ? (
                            <Input
                              value={editForm?.subject || ''}
                              onChange={(e) => setEditForm({ ...editForm!, subject: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.subject || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingIndex === index ? (
                            <Input
                              value={editForm?.keyword || ''}
                              onChange={(e) => setEditForm({ ...editForm!, keyword: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.keyword || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingIndex === index ? (
                            <Input
                              value={editForm?.title || ''}
                              onChange={(e) => setEditForm({ ...editForm!, title: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.title || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingIndex === index ? (
                            <Input
                              value={editForm?.ig_link || ''}
                              onChange={(e) => setEditForm({ ...editForm!, ig_link: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.ig_link || '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingIndex === index ? (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving}>
                                <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(index)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
