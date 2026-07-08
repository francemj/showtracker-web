import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { User as UserIcon } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

export default function Profile() {
  const { user, logout, refreshUser } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name ?? "")
  const [picture, setPicture] = useState(user?.picture ?? "")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const updateProfile = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/user/profile", { name, picture }),
    onSuccess: async () => {
      await refreshUser()
      toast({ title: "Profile updated" })
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" })
    },
  })

  const deleteAccount = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/user"),
    onSuccess: () => {
      logout()
    },
    onError: () => {
      toast({ title: "Failed to delete account", variant: "destructive" })
      setDeleteDialogOpen(false)
    },
  })

  return (
    <div className="max-w-xl">
      <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em] font-semibold mb-2">
        Account
      </div>
      <h1 className="font-serif font-normal text-[56px] leading-none tracking-[-0.025em] text-foreground mb-8">
        Profile
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarImage src={picture} alt={name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg font-bold">
                {name?.charAt(0).toUpperCase() || (
                  <UserIcon className="w-6 h-6" />
                )}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-profile-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="picture">Avatar URL</Label>
            <Input
              id="picture"
              value={picture}
              onChange={(e) => setPicture(e.target.value)}
              data-testid="input-profile-picture"
            />
          </div>

          <Button
            onClick={() => updateProfile.mutate()}
            disabled={
              updateProfile.isPending || !name.trim() || !picture.trim()
            }
            data-testid="button-save-profile"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6 border-destructive-border">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data, including
            your library, watch history, and ratings. This cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            data-testid="button-delete-account"
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, library, and watch
              history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
