import BottomNav from "@/components/BottomNav";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="pb-nav">{children}</main>
      <BottomNav />
    </>
  );
}
