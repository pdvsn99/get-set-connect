import { Logo, Sparky } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
      <div className="on-dark relative hidden overflow-hidden bg-navy-900 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-lime-400/25 blur-3xl" aria-hidden="true" />
        <Sparky className="relative h-72 w-72 animate-float" mood="wave" />
        <p className="relative mt-6 max-w-sm text-center text-2xl font-extrabold text-white">Leave the complicated bits to us.</p>
      </div>
    </div>
  );
}
