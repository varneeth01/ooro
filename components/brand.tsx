import Image from "next/image";
import Link from "next/link";
export function Brand({ dark = false }: { dark?: boolean }) {
 return <Link href="/" aria-label="OORO homepage" className={`focus-ring inline-flex min-h-11 items-center gap-2.5 font-semibold tracking-[-.075em] ${dark?"text-white":"text-[#0a0a0c]"}`}>
   <Image src="/ooro-mark.svg" width={43} height={43} alt="" aria-hidden="true" className="h-10 w-10 shrink-0" priority/>
   <span className="text-[23px] leading-none">OORO</span>
 </Link>;
}
