export function initiateGoogleLogin(onError?: (msg: string) => void) {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "783065147226-23tei2829471c17t5lsk6gngf48hmju2.apps.googleusercontent.com";
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "https://chatapp-bhua.onrender.com"
      : "http://localhost:5000");

  if (clientId) {
    const redirectUri = `${window.location.origin}/login`;
    const scope = encodeURIComponent("openid email profile");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=select_account`;
    window.location.href = authUrl;
    return;
  }

  // Fallback to backend redirect route if client ID is only stored on server
  window.location.href = `${apiUrl}/api/auth/google?origin=${encodeURIComponent(window.location.origin)}`;
}
