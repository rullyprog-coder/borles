import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminResetPassword, adminUpdateUser } from "@/lib/admin-users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type EditableUser = {
  id: string;
  full_name: string;
  identifier: string | null;
  class_name: string | null;
  major: string | null;
  email?: string | undefined;
};

/** Membuat kata sandi acak yang mudah dibagikan ke pengguna. */
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "#1";
}

export function EditUserDialog({ user }: { user: EditableUser }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateUser = useServerFn(adminUpdateUser);

  const mutation = useMutation({
    mutationFn: async (payload: {
      user_id: string;
      full_name: string;
      identifier?: string | undefined;
      class_name?: string | undefined;
      major?: string | undefined;
      email?: string | undefined;
    }) => updateUser({ data: payload }),
    onSuccess: () => {
      toast.success("Data pengguna diperbarui");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-emails"] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error("Gagal memperbarui: " + error.message),
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    mutation.mutate({
      user_id: user.id,
      full_name: String(form.get("full_name") ?? "").trim(),
      identifier: String(form.get("identifier") ?? "").trim() || undefined,
      class_name: String(form.get("class_name") ?? "").trim() || undefined,
      major: String(form.get("major") ?? "").trim() || undefined,
      email: email && email !== user.email ? email : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Data Pengguna</DialogTitle>
          <DialogDescription>
            Ubah identitas pengguna. Perubahan email langsung aktif tanpa konfirmasi ulang.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-name">Nama Lengkap</Label>
            <Input
              id="e-name"
              name="full_name"
              required
              minLength={3}
              maxLength={100}
              defaultValue={user.full_name}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="e-nis">NIS / NIP</Label>
              <Input
                id="e-nis"
                name="identifier"
                maxLength={30}
                defaultValue={user.identifier ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-class">Kelas</Label>
              <Input
                id="e-class"
                name="class_name"
                maxLength={30}
                placeholder="XII TKJ 1"
                defaultValue={user.class_name ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-major">Jurusan</Label>
            <Input id="e-major" name="major" maxLength={60} defaultValue={user.major ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-email">Email</Label>
            <Input
              id="e-email"
              name="email"
              type="email"
              maxLength={255}
              defaultValue={user.email ?? ""}
              placeholder="nama@smkborneolestari.sch.id"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({ user }: { user: EditableUser }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const resetPassword = useServerFn(adminResetPassword);

  const mutation = useMutation({
    mutationFn: async (payload: { user_id: string; password: string }) =>
      resetPassword({ data: payload }),
    onSuccess: () => {
      toast.success(`Kata sandi ${user.full_name} berhasil disetel ulang`);
      setOpen(false);
      setPassword("");
    },
    onError: (error: Error) => toast.error("Gagal menyetel ulang: " + error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !password) setPassword(generatePassword());
      }}
    >
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" />
        Reset Sandi
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Kata Sandi</DialogTitle>
          <DialogDescription>
            Setel kata sandi baru untuk {user.full_name}. Catat dan sampaikan kata sandi ini kepada
            pengguna — kata sandi lama langsung tidak berlaku.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ user_id: user.id, password });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="r-password">Kata Sandi Baru</Label>
            <div className="flex gap-2">
              <Input
                id="r-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPassword(generatePassword())}
                aria-label="Buat kata sandi acak"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || password.length < 8}>
              {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Simpan Kata Sandi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
