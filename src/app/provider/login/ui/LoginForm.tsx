type Props = {
  nextUrl: string;
  loggedOut?: boolean;
  errorMessage?: string;
  defaultEmail?: string;
};

export default function LoginForm({ nextUrl, loggedOut, errorMessage, defaultEmail }: Props) {
  return (
    <form method="POST" action="/api/provider/login" className="space-y-4">
      {loggedOut && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">You have been signed out.</div>
      )}
      {errorMessage && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</div>
      )}
      <input type="hidden" name="next" value={nextUrl} />
      <label className="block text-sm font-medium text-zinc-700">
        Email
        <input
          type="email"
          name="email"
          defaultValue={defaultEmail}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          required
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Password
        <input
          type="password"
          name="password"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          required
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
      >
        Sign in
      </button>
    </form>
  );
}
