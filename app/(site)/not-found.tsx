import Link from "next/link";
import { Container } from "@/components/site/ui";

export default function NotFound() {
  return (
    <Container className="max-w-2xl py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-coral-600">404</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">We couldn&apos;t find that page</h1>
      <p className="mt-4 text-lg text-ink-soft">It may have moved. Try one of these instead:</p>
      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {[
          ["/", "Home"],
          ["/services", "Services"],
          ["/areas", "Areas"],
          ["/quote", "Get a quote"],
          ["/contact", "Contact"],
        ].map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="inline-block rounded-full border border-line px-4 py-2 font-semibold text-ink hover:border-brand-500 hover:text-brand-700">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
