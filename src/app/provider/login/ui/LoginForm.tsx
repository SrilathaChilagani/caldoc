type Props = {
  nextUrl: string;
  loggedOut?: boolean;
  errorMessage?: string;
  defaultEmail?: string;
  action?: string;
};

export default function LoginForm({ nextUrl, loggedOut, errorMessage, defaultEmail, action }: Props) {
  return (
    <form method="POST" action={action || "/api/provider/login"} className="space-y-4">
      {loggedOut && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">You have been signed out.</div>
      )}
      {errorMessage && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</div>
      )}
      <input type="hidden" name="next" value={nextUrl} />
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          type="email"
          name="email"
          defaultValue={defaultEmail}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          type="password"
          name="password"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          required
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
      >
        Sign in
      </button>
    </form>
  );
}
