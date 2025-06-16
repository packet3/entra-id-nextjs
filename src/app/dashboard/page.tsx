import { auth } from "@/actions/auth";


const DashBoardPage = async () => {
    
    const session = await auth()
    if (!session?.user) return null

    //console.log("Session:", session);
    
    return (
        <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
        <p className="text-lg">Welcome to your dashboard!</p>
        <p className="text-lg mt-2">User ID: {session.user.id}</p>
        <p className="text-lg">Access Token: {session.accessToken}</p>
        
      </div>
    );
}
export default DashBoardPage;