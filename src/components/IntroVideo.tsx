import { PlayCircle } from "lucide-react";
import { useAccount } from "@/lib/use-account";

/** Platform intro video. The source is managed from the admin settings. */
export function IntroVideo() {
  const { data } = useAccount();
  const src = (data?.introVideoUrl ?? "").trim();

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <PlayCircle className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-bold">فيديو تعريفي بالمنصة</h2>
      </div>
      {src ? (
        <video
          className="aspect-video w-full bg-black"
          src={src}
          controls
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-elevated px-4 text-center">
          <p className="text-[11px] font-semibold leading-relaxed text-muted-foreground">
            سيتم عرض الفيديو التعريفي هنا بعد إضافة رابط الفيديو من لوحة التحكم.
          </p>
        </div>
      )}
    </section>
  );
}
