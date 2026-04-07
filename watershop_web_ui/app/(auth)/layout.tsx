// app/(auth)/layout.tsx
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Changed: 'min-h-screen' to 'h-screen' to force it to fit the viewport
    // overflow-hidden prevents any scrollbars from appearing
    <div className="h-screen w-full flex items-center justify-center bg-[#3488b7] relative overflow-hidden">
      {/* Top Left Drip */}
      <div className="absolute top-0 left-0 z-0 w-32 md:w-56">
        <Image
          src="/auth-top.png"
          alt="Water Drip"
          width={500}
          height={300}
          className="object-contain"
        />
      </div>

      {/* Top Right Drip */}
      <div className="absolute top-0 right-0 z-0 w-32 md:w-56">
        <Image
          src="/auth-top.png"
          alt="Water Drip"
          width={500}
          height={300}
          className="object-contain scale-x-[-1]"
        />
      </div>

      {/* Main Content - REMOVED 'mt-12' to center it perfectly */}
      <div className="relative z-10 w-full max-w-lg px-4">{children}</div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 z-0 w-full">
        <Image
          src="/auth-bottom.png"
          alt="Water Waves"
          width={1920}
          height={400}
          // Reduced max-h to 20vh to give the form more room
          className="w-full h-auto max-h-[20vh] object-cover object-bottom opacity-90"
        />
      </div>
    </div>
  );
}
