export function initiateGoogleLogin(onError?: (msg: string) => void) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
