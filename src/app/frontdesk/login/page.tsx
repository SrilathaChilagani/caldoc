import LoginForm from "./ui/LoginForm";

export default function FrontDeskLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4">
      <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">CalDoc</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-slate-900">Front Desk</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage appointments and orders</p>
        </div>
        <LoginForm searchParams={searchParams} />
      </div>
    </div>
  );
}
