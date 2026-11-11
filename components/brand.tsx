import Image from "next/image";
import Link from "next/link";
export function Brand({ dark = false }: { dark?: boolean }) {
 return <Link href="/" aria-label="OORO homepage" className={`focus-ring inline-flex min-h-11 items-center gap-2.5 font-semibold tracking-[-.03em] ${dark?"text-white":"text-[#0a0a0c]"}`}>
   <Image src="/ooro-mark.svg" width={64} height={64} alt="" aria-hidden="true" className="h-11 w-11 shrink-0 object-contain" priority/>
   <span className="text-[22px] leading-none">OORO</span>
 </Link>;
}
