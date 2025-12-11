import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { LogOut, Plus, Save, Trash2, Edit2, X } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  ig_account: string | null;
  subject: string | null;
  keyword: string | null;
  title: string | null;
  ig_link: string | null;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState({
    ig_account: '',
    subject: '',
    keyword: '',
    title: '',
    ig_link: '',
  });
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
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data: userData, error } = await supabase
      .from('user_data')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: '錯誤',
        description: '無法載入資料',
        variant: 'destructive',
      });
    } else {
      setData(userData || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleAdd = async () => {
    if (!user) return;

    const { error } = await supabase.from('user_data').insert({
      user_id: user.id,
      email: user.email || '',
      ig_account: newRow.ig_account || null,
      subject: newRow.subject || null,
      keyword: newRow.keyword || null,
      title: newRow.title || null,
      ig_link: newRow.ig_link || null,
    });

    if (error) {
      toast({
        title: '錯誤',
        description: '無法新增資料',
        variant: 'destructive',
      });
    } else {
      toast({ title: '成功', description: '資料已新增' });
      setNewRow({ ig_account: '', subject: '', keyword: '', title: '', ig_link: '' });
      setShowAddForm(false);
      fetchData();
    }
  };

  const handleEdit = (row: UserData) => {
    setEditingId(row.id);
    setEditForm(row);
  };

  const handleSave = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from('user_data')
      .update({
        ig_account: editForm.ig_account,
        subject: editForm.subject,
        keyword: editForm.keyword,
        title: editForm.title,
        ig_link: editForm.ig_link,
      })
      .eq('id', editingId);

    if (error) {
      toast({
        title: '錯誤',
        description: '無法更新資料',
        variant: 'destructive',
      });
    } else {
      toast({ title: '成功', description: '資料已更新' });
      setEditingId(null);
      setEditForm({});
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('user_data').delete().eq('id', id);

    if (error) {
      toast({
        title: '錯誤',
        description: '無法刪除資料',
        variant: 'destructive',
      });
    } else {
      toast({ title: '成功', description: '資料已刪除' });
      fetchData();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
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
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            登出
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card className="shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>資料列表</CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              新增資料
            </Button>
          </CardHeader>
          <CardContent>
            {showAddForm && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg space-y-4">
                <h3 className="font-medium">新增一列資料</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Input
                    placeholder="IG Account"
                    value={newRow.ig_account}
                    onChange={(e) => setNewRow({ ...newRow, ig_account: e.target.value })}
                  />
                  <Input
                    placeholder="主題"
                    value={newRow.subject}
                    onChange={(e) => setNewRow({ ...newRow, subject: e.target.value })}
                  />
                  <Input
                    placeholder="Keyword"
                    value={newRow.keyword}
                    onChange={(e) => setNewRow({ ...newRow, keyword: e.target.value })}
                  />
                  <Input
                    placeholder="標題"
                    value={newRow.title}
                    onChange={(e) => setNewRow({ ...newRow, title: e.target.value })}
                  />
                  <Input
                    placeholder="IG Link"
                    value={newRow.ig_link}
                    onChange={(e) => setNewRow({ ...newRow, ig_link: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd}>新增</Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>取消</Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暫無資料，點擊上方按鈕新增
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
                    {data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell>
                          {editingId === row.id ? (
                            <Input
                              value={editForm.ig_account || ''}
                              onChange={(e) => setEditForm({ ...editForm, ig_account: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.ig_account || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === row.id ? (
                            <Input
                              value={editForm.subject || ''}
                              onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.subject || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === row.id ? (
                            <Input
                              value={editForm.keyword || ''}
                              onChange={(e) => setEditForm({ ...editForm, keyword: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.keyword || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === row.id ? (
                            <Input
                              value={editForm.title || ''}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.title || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === row.id ? (
                            <Input
                              value={editForm.ig_link || ''}
                              onChange={(e) => setEditForm({ ...editForm, ig_link: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            row.ig_link || '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === row.id ? (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={handleSave}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancel}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
