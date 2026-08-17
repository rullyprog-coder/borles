import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createStudentAccount } from "@/lib/students.functions";
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
  DialogTrigger,
} from "@/components/ui/dialog";

export function RegisterStudentDialog() {
  const [open, setOpen] = useState(false);
  const createStudent = useServerFn(createStudentAccount);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      full_name: string;
      identifier?: string | undefined;
      class_name?: string | undefined;
    }) => createStudent({ data: payload }),
    onSuccess: (result) => {
      toast.success(`Akun siswa ${result.full_name} berhasil dibuat`);
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error("Gagal membuat akun: " + error.message),
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      full_name: String(form.get("full_name") ?? ""),
      identifier: String(form.get("identifier") ?? "") || undefined,
      class_name: String(form.get("class_name") ?? "") || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 size-4" />
          Daftarkan Siswa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Daftarkan Akun Siswa</DialogTitle>
          <DialogDescription>
            Guru dapat membuat akun siswa langsung; akun aktif tanpa perlu konfirmasi email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-name">Nama Lengkap</Label>
            <Input id="s-name" name="full_name" required minLength={3} maxLength={100} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-nis">NIS</Label>
              <Input id="s-nis" name="identifier" maxLength={30} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-class">Kelas</Label>
              <Input id="s-class" name="class_name" maxLength={30} placeholder="XII TKJ 1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" name="email" type="email" required maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-password">Kata Sandi</Label>
            <Input id="s-password" name="password" required minLength={6} maxLength={72} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Buat Akun
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
