import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/hooks/use-api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { AppHeader } from "@/components/app-header";
import { Loader2, Settings, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserRecord {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "operator", label: "Operator" },
  { value: "admin", label: "Admin" },
];

export default function Users() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<UserRecord[]>("/users");
      setUsers(data);
    } catch {
      // redirect handled above
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      void fetchUsers();
    }
  }, [isAuthenticated, user, fetchUsers]);

  if (isLoading || (isAuthenticated && user?.role !== "admin")) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  async function handleDeleteUser(id: string, email: string) {
    if (!window.confirm(`Are you sure you want to delete user "${email}"?\nThis action cannot be undone.`)) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User deleted", { description: `${email} has been removed` });
    } catch (err) {
      toast.error("Failed to delete user", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || password.length < 6) {
      toast.error("Validation error", {
        description: "Valid email and password (min 6 chars) are required",
      });
      return;
    }
    setSubmitting(true);
    try {
      const newUser = await apiFetch<UserRecord>("/users", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password, role }),
      });
      setUsers((prev) => [newUser, ...prev]);
      setEmail("");
      setPassword("");
      setRole("operator");
      toast.success("User created", {
        description: `${newUser.email} (${newUser.role}) has been added`,
      });
    } catch (err) {
      toast.error("Failed to create user", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Add User Form */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add New User
            </CardTitle>
            <CardDescription>
              Create user accounts for the Operations Dashboard. Passwords are stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email Address</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="user@globalsail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password (min 6 chars)</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Combobox
                    options={ROLE_OPTIONS}
                    value={role}
                    onChange={setRole}
                    placeholder="Select role"
                    searchPlaceholder="Search roles..."
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-border/40">
                <Button type="submit" disabled={submitting} className="gap-2 min-w-[140px]">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-sm border-border/60 overflow-hidden">
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              System Users
            </CardTitle>
            <CardDescription className="mt-1">
              All registered accounts — {users.length} total
            </CardDescription>
          </div>
          <div className="overflow-x-auto">
            {loadingUsers ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                <Settings className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <h3 className="text-base font-medium">No users yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Add users above to grant access.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold text-right">Created</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.email}
                        {u.id === user?.id && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                            You
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-muted text-muted-foreground border border-border/50"
                          }`}
                        >
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {format(new Date(u.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? "You cannot delete your own account" : "Delete user"}
                          onClick={() => handleDeleteUser(u.id, u.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
