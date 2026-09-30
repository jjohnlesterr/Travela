/** Focused flow screens: no bottom nav, each page renders its own TopBar and sticky CTA. */
export default function FlowLayout({ children }: LayoutProps<"/">) {
  return <main className="pb-[calc(env(safe-area-inset-bottom)+112px)]">{children}</main>;
}
