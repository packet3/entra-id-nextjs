import { signOut } from "@/actions/auth"
 
export default function SignOut() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut({
                redirectTo: "/",
              })
      }}
    >
      <button type="submit">Sign Out</button>
    </form>
  )
}