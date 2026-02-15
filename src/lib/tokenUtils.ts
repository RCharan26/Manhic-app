// Attempts to get a Clerk token with a safe retry strategy.
// getTokenFunc should be a zero-arg function that returns Promise<string | null>
export async function getSafeToken(
  getTokenFunc: () => Promise<string | null>,
  opts?: { retries?: number; delayMs?: number }
): Promise<string> {
  const { retries = 2, delayMs = 700 } = opts ?? {};

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const token = await getTokenFunc();
      if (token) return token;
      lastError = new Error("Failed to get authentication token");
    } catch (err) {
      lastError = err;
    }

    if (attempt < retries) {
      // Small backoff before retrying
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  console.error("Token fetch error after retries:", lastError);
  throw new Error("Authentication failed while fetching token. Please refresh and try again.");
}
